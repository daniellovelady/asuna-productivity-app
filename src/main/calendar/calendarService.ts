import { BrowserWindow } from 'electron';
import { groupAgendaEvents } from '../../shared/calendar/agendaGrouping';
import { filterCalendarEventsInRange } from '../../shared/calendar/filterEventsInRange';
import type {
  AgendaSnapshot,
  CalendarAccount,
  CalendarEvent,
  CalendarListEntry,
  CalendarPublicState,
} from '../../shared/calendar/types';
import type { FocusStartIntent } from '../../shared/focus/focusStartIntent';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import {
  createEmptyCache,
  deleteCacheFromDisk,
  listAllEvents,
  loadCacheFromDisk,
  saveCacheToDisk,
  type CalendarCachePayload,
} from './calendarCacheStore';
import { deleteTokens, loadTokens } from './calendarTokenStore';
import {
  CalendarSyncError,
  fetchAllCalendarListEntries,
  isRollingFullSyncDueForCache,
  mergeCalendarEventsForVisibleRange,
  syncCalendarEvents,
  type SyncRefreshReason,
} from './calendarSyncEngine';
import {
  getValidAccessToken,
  hasStoredTokens,
  revokeAndDeleteTokens,
  runGoogleConnectFlow,
} from './googleOAuthService';
import { SafeStorageUnavailableError } from './safeStorageBlob';
import {
  GOOGLE_CALENDAR_REAUTH_USER_MESSAGE,
  GoogleTokenRefreshError,
} from './googleOAuthErrors';

const PERIODIC_SYNC_MIN_MS = 15 * 60 * 1000;
const PERIODIC_SYNC_JITTER_MS = 15 * 60 * 1000;

type StateListener = (state: CalendarPublicState) => void;

let singleton: CalendarService | null = null;

export function getCalendarService(): CalendarService {
  if (!singleton) {
    singleton = new CalendarService();
  }
  return singleton;
}

export function resetCalendarServiceForTests(): void {
  singleton?.dispose();
  singleton = null;
}

export class CalendarService {
  private activeUserId: string | null = null;

  private memoryCache: CalendarCachePayload | null = null;

  private memoryCacheUserId: string | null = null;

  private accountStatus: CalendarAccount['status'] = 'disconnected';

  private reauthRequired = false;

  private syncError: string | null = null;

  private connectedAt: string | null = null;

  private syncPhase: 'idle' | 'syncing' = 'idle';

  private periodicTimer: NodeJS.Timeout | null = null;

  private syncInFlight = false;

  private listeners = new Set<StateListener>();

  private linkedTasksByEventKey = new Map<string, string>();

  private rangeLoadInFlight = new Set<string>();

  private rangeFetchKeysSeen = new Set<string>();

  dispose(): void {
    this.stopPeriodicSync();
    this.listeners.clear();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getPublicState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  handleAuthContextChange(userId: string | null): void {
    if (userId === this.activeUserId) {
      this.emit();
      return;
    }

    this.stopPeriodicSync();
    this.memoryCache = null;
    this.memoryCacheUserId = null;
    this.linkedTasksByEventKey.clear();
    this.syncError = null;
    this.syncPhase = 'idle';
    this.reauthRequired = false;
    this.activeUserId = userId;

    if (userId === null) {
      this.accountStatus = 'disconnected';
      this.connectedAt = null;
      this.emit();
      return;
    }

    void this.restoreConnectionForUser(userId);
  }

  private async restoreConnectionForUser(userId: string): Promise<void> {
    if (!hasStoredTokens(userId)) {
      this.accountStatus = 'disconnected';
      this.connectedAt = null;
      this.emit();
      return;
    }

    this.accountStatus = 'connected';
    const tokenRecord = loadTokens(userId);
    const stored = loadCacheFromDisk(userId);
    if (stored) {
      this.memoryCache = stored;
      this.memoryCacheUserId = userId;
    }

    this.connectedAt = tokenRecord?.connectedAt ?? null;
    this.emit();
    this.startPeriodicSync();
    await this.refresh(userId, 'launch');
  }

  getPublicState(): CalendarPublicState {
    const userId = this.activeUserId;
    const account = this.buildAccount(userId);
    let agenda: AgendaSnapshot | null = null;

    if (userId && this.memoryCacheUserId === userId && this.memoryCache) {
      const timeZone = this.resolveTimeZone();
      const nowMs = Date.now();
      const events = this.mapEventsWithLinks(listAllEvents(this.memoryCache));
      const grouped = groupAgendaEvents(events, nowMs, timeZone);
      agenda = {
        account,
        today: grouped.today,
        upcoming: grouped.upcoming,
      };
    }

    return {
      account,
      agenda,
      syncPhase: this.syncPhase,
    };
  }

  private buildAccount(userId: string | null): CalendarAccount {
    if (!userId) {
      return {
        provider: 'google',
        status: 'disconnected',
        connectedAt: null,
        lastSyncedAt: null,
        syncError: this.syncError,
      };
    }

    if (this.reauthRequired || this.accountStatus === 'reauth_required') {
      return {
        provider: 'google',
        status: 'reauth_required',
        connectedAt: this.connectedAt,
        lastSyncedAt: this.memoryCache?.lastSyncedAt ?? null,
        syncError: this.syncError ?? GOOGLE_CALENDAR_REAUTH_USER_MESSAGE,
      };
    }

    if (!hasStoredTokens(userId)) {
      return {
        provider: 'google',
        status: 'disconnected',
        connectedAt: null,
        lastSyncedAt: null,
        syncError: this.syncError,
      };
    }

    return {
      provider: 'google',
      status: this.accountStatus,
      connectedAt: this.connectedAt,
      lastSyncedAt: this.memoryCache?.lastSyncedAt ?? null,
      syncError: this.syncError,
    };
  }

  private handleInvalidGrant(userId: string): void {
    console.info('calendar: google token refresh requires reauth (invalid_grant)');
    this.stopPeriodicSync();
    deleteTokens(userId);
    this.reauthRequired = true;
    this.accountStatus = 'reauth_required';
    this.syncError = GOOGLE_CALENDAR_REAUTH_USER_MESSAGE;
  }

  private formatTransientSyncError(error: unknown): string {
    if (error instanceof CalendarSyncError) {
      return error.message;
    }
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('invalid_grant')) {
        return 'Calendar sync failed. Try again in a moment.';
      }
      return error.message;
    }
    return 'Sync failed.';
  }

  async startConnect(): Promise<void> {
    const userId = this.requireActiveUser();
    if (this.reauthRequired || this.accountStatus === 'reauth_required') {
      deleteTokens(userId);
    }
    this.accountStatus = 'connecting';
    this.reauthRequired = false;
    this.syncError = null;
    this.emit();

    try {
      const tokens = await runGoogleConnectFlow(userId);
      this.accountStatus = 'connected';
      this.reauthRequired = false;
      this.connectedAt = tokens.connectedAt;
      this.memoryCache = createEmptyCache(this.resolveTimeZone());
      this.memoryCacheUserId = userId;
      this.emit();
      this.startPeriodicSync();
      await this.refresh(userId, 'launch');
    } catch (error) {
      this.accountStatus = 'error';
      this.syncError = error instanceof Error ? error.message : 'Connect failed.';
      this.emit();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const userId = this.requireActiveUser();
    this.stopPeriodicSync();
    await revokeAndDeleteTokens(userId);
    deleteCacheFromDisk(userId);
    this.memoryCache = null;
    this.memoryCacheUserId = null;
    this.accountStatus = 'disconnected';
    this.reauthRequired = false;
    this.connectedAt = null;
    this.syncError = null;
    this.linkedTasksByEventKey.clear();
    this.emit();
  }

  async refresh(userId: string, reason: SyncRefreshReason): Promise<void> {
    void reason;
    if (this.syncInFlight) {
      return;
    }

    if (this.reauthRequired || this.accountStatus === 'reauth_required') {
      return;
    }

    if (!hasStoredTokens(userId)) {
      return;
    }

    this.syncInFlight = true;
    this.syncPhase = 'syncing';
    this.emit();

    try {
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        throw new CalendarSyncError('Could not refresh Google access token.');
      }

      const timeZone = this.resolveTimeZone();
      const cache = this.memoryCacheUserId === userId && this.memoryCache
        ? this.memoryCache
        : loadCacheFromDisk(userId) ?? createEmptyCache(timeZone);

      cache.timeZone = timeZone;
      const nowMs = Date.now();
      const rollingFullDue = isRollingFullSyncDueForCache(cache, nowMs);
      const useFullForThisRun = rollingFullDue;

      let newList: import('../../shared/calendar/types').CalendarListEntry[];
      try {
        newList = await fetchAllCalendarListEntries(accessToken);
      } catch (error) {
        if (cache.calendarList.length > 0) {
          newList = cache.calendarList;
        } else {
          throw error;
        }
      }

      cache.calendarList = newList;

      for (const calendar of newList) {
        await syncCalendarEvents(
          accessToken,
          cache,
          calendar,
          nowMs,
          useFullForThisRun,
        );
      }

      cache.lastSyncedAt = new Date(nowMs).toISOString();
      this.memoryCache = cache;
      this.memoryCacheUserId = userId;

      try {
        saveCacheToDisk(userId, cache);
      } catch (error) {
        if (!(error instanceof SafeStorageUnavailableError)) {
          throw error;
        }
      }

      this.accountStatus = 'connected';
      this.reauthRequired = false;
      this.syncError = null;
    } catch (error) {
      if (error instanceof GoogleTokenRefreshError && error.code === 'invalid_grant') {
        this.handleInvalidGrant(userId);
      } else {
        this.syncError = this.formatTransientSyncError(error);
        if (error instanceof CalendarSyncError && error.status === 401) {
          this.accountStatus = 'error';
        }
      }
    } finally {
      this.syncInFlight = false;
      this.syncPhase = 'idle';
      this.emit();
    }
  }

  resolveEventForFocus(
    calendarId: string,
    externalEventId: string,
  ): CalendarEvent | null {
    const userId = this.activeUserId;
    if (!userId || this.memoryCacheUserId !== userId || !this.memoryCache) {
      return null;
    }

    const bucket = this.memoryCache.calendars[calendarId];
    const event = bucket?.events[externalEventId];
    if (!event || event.status === 'cancelled') {
      return null;
    }

    return event;
  }

  buildCalendarFocusIntent(
    calendarId: string,
    externalEventId: string,
    linkedTaskId: string | null,
    linkedTaskTitleSnapshot: string | null,
  ): FocusStartIntent | null {
    const event = this.resolveEventForFocus(calendarId, externalEventId);
    if (!event) {
      return null;
    }

    return {
      kind: 'calendar_event',
      calendarId,
      externalEventId,
      titleSnapshot: event.title,
      calendarProvider: 'google',
      linkedTaskId,
      linkedTaskTitleSnapshot: linkedTaskId ? linkedTaskTitleSnapshot : null,
    };
  }

  setLinkedTaskForEvent(
    calendarId: string,
    externalEventId: string,
    taskId: string | null,
  ): void {
    const key = eventLinkKey(calendarId, externalEventId);
    if (taskId === null) {
      this.linkedTasksByEventKey.delete(key);
    } else {
      this.linkedTasksByEventKey.set(key, taskId);
    }
    this.emit();
  }

  hydrateLinkedTasks(links: Array<{
    externalCalendarId: string;
    externalEventId: string;
    taskId: string;
  }>): void {
    this.linkedTasksByEventKey.clear();
    for (const link of links) {
      this.linkedTasksByEventKey.set(
        eventLinkKey(link.externalCalendarId, link.externalEventId),
        link.taskId,
      );
    }
    this.emit();
  }

  private requireActiveUser(): string {
    const snapshot = getAuthContextSnapshot();
    if (!snapshot.userId) {
      throw new Error('Sign-in context is not ready.');
    }
    if (this.activeUserId !== snapshot.userId) {
      throw new Error('Calendar account mismatch.');
    }
    return snapshot.userId;
  }

  private resolveTimeZone(): string {
    const auth = getAuthContextSnapshot();
    if (this.activeUserId === null || auth.userId !== this.activeUserId) {
      return 'UTC';
    }

    return auth.timeZone;
  }

  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    const jitter = Math.floor(Math.random() * PERIODIC_SYNC_JITTER_MS);
    const interval = PERIODIC_SYNC_MIN_MS + jitter;

    this.periodicTimer = setInterval(() => {
      const userId = this.activeUserId;
      if (!userId || !hasStoredTokens(userId) || this.reauthRequired) {
        return;
      }
      void this.refresh(userId, 'periodic');
    }, interval);
  }

  private stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  private mapEventsWithLinks(events: CalendarEvent[]): CalendarEvent[] {
    return events.map((event) => {
      const key = eventLinkKey(event.calendarId, event.externalEventId);
      const linkedTaskId = this.linkedTasksByEventKey.get(key) ?? event.linkedTaskId;
      return {
        ...event,
        linkedTaskId,
        mirrorScheduleBlockId: event.mirrorScheduleBlockId ?? null,
      };
    });
  }

  getGoogleCacheDiagnostics(): {
    googleCacheEventCount: number;
    calendarCount: number;
    rangeCoverageCount: number;
  } {
    const cache = this.memoryCache;
    if (!cache) {
      return { googleCacheEventCount: 0, calendarCount: 0, rangeCoverageCount: 0 };
    }

    let googleCacheEventCount = 0;
    for (const bucket of Object.values(cache.calendars)) {
      googleCacheEventCount += Object.keys(bucket.events).length;
    }

    return {
      googleCacheEventCount,
      calendarCount: cache.calendarList.length,
      rangeCoverageCount: this.rangeFetchKeysSeen.size,
    };
  }

  async loadWorkspaceFeed(
    rangeStart: string,
    rangeEnd: string,
  ): Promise<{ events: CalendarEvent[]; calendarList: CalendarListEntry[] }> {
    const userId = this.activeUserId;
    if (!userId || this.memoryCacheUserId !== userId || !this.memoryCache) {
      return { events: [], calendarList: [] };
    }

    await this.ensureGoogleRangeLoaded(userId, rangeStart, rangeEnd);

    const cache = this.memoryCache;
    if (!cache) {
      return { events: [], calendarList: [] };
    }

    const events = this.mapEventsWithLinks(listAllEvents(cache));
    return {
      events: filterCalendarEventsInRange(events, rangeStart, rangeEnd),
      calendarList: cache.calendarList,
    };
  }

  private async ensureGoogleRangeLoaded(
    userId: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<void> {
    if (
      this.reauthRequired
      || this.accountStatus !== 'connected'
      || !hasStoredTokens(userId)
      || !this.memoryCache
    ) {
      return;
    }

    const dedupeKey = `${rangeStart}|${rangeEnd}`;
    this.rangeFetchKeysSeen.add(dedupeKey);
    if (this.rangeLoadInFlight.has(dedupeKey)) {
      return;
    }

    this.rangeLoadInFlight.add(dedupeKey);
    try {
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken || !this.memoryCache) {
        return;
      }

      const cache = this.memoryCache;
      const nowMs = Date.now();

      for (const calendar of cache.calendarList) {
        await mergeCalendarEventsForVisibleRange(
          accessToken,
          cache,
          calendar,
          rangeStart,
          rangeEnd,
          nowMs,
        );
      }

      cache.lastSyncedAt = new Date(nowMs).toISOString();
      try {
        saveCacheToDisk(userId, cache);
      } catch (error) {
        if (!(error instanceof SafeStorageUnavailableError)) {
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof GoogleTokenRefreshError && error.code === 'invalid_grant') {
        this.handleInvalidGrant(userId);
      }
    } finally {
      this.rangeLoadInFlight.delete(dedupeKey);
    }
  }

  private emit(): void {
    const state = this.getPublicState();
    for (const listener of this.listeners) {
      listener(state);
    }

    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('calendar:stateChanged', state);
      }
    }
  }
}

function eventLinkKey(calendarId: string, externalEventId: string): string {
  return `${calendarId}:${externalEventId}`;
}
