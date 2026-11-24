import type { CalendarListEntry } from '../../shared/calendar/types';
import {
  isRollingFullSyncDue,
  resolveFullSyncWindowAnchor,
} from '../../shared/calendar/syncWindowPolicy';
import type { CalendarCachePayload } from './calendarCacheStore';
import {
  buildCalendarListUrl,
  buildEventsListFullUrl,
  buildEventsListIncrementalUrl,
  googleFetchJson,
  incrementalUrlContainsForbiddenWindowParams,
} from './googleCalendarClient';
import { mapGoogleCalendarListItem, mapGoogleEvent, type GoogleCalendarEventItem } from './mapGoogleEvent';

export const FULL_SYNC_WINDOW_DAYS_BACK = 1;
export const FULL_SYNC_WINDOW_DAYS_FORWARD = 14;

export type SyncRefreshReason = 'launch' | 'manual' | 'periodic';

export interface SyncWindowBounds {
  timeMin: string;
  timeMax: string;
}

export function computeFullSyncWindowBounds(nowMs: number, timeZone: string): SyncWindowBounds {
  const start = new Date(nowMs);
  start.setDate(start.getDate() - FULL_SYNC_WINDOW_DAYS_BACK);
  const end = new Date(nowMs);
  end.setDate(end.getDate() + FULL_SYNC_WINDOW_DAYS_FORWARD);

  const timeMin = toRfc3339StartOfLocalDay(start, timeZone);
  const timeMax = toRfc3339EndOfLocalDay(end, timeZone);
  return { timeMin, timeMax };
}

function toRfc3339StartOfLocalDay(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
  return `${day}T00:00:00.000Z`;
}

function toRfc3339EndOfLocalDay(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
  return `${day}T23:59:59.999Z`;
}

export function shouldUseFullSyncForCalendar(
  cache: CalendarCachePayload,
  calendarId: string,
  nowMs: number,
): boolean {
  const bucket = cache.calendars[calendarId];
  if (!bucket?.nextSyncToken) {
    return true;
  }

  return isRollingFullSyncDue({
    fullSyncWindowAnchorDate: cache.fullSyncWindowAnchorDate,
    lastFullSyncCompletedAtMs: cache.lastFullSyncCompletedAtMs,
    nowMs,
    timeZone: cache.timeZone,
  });
}

export async function fetchAllCalendarListEntries(
  accessToken: string,
): Promise<CalendarListEntry[]> {
  const collected: CalendarListEntry[] = [];
  let pageToken: string | undefined;

  do {
    const url = buildCalendarListUrl(pageToken);
    const result = await googleFetchJson(url, accessToken);
    if (!result.ok) {
      throw new CalendarSyncError('Failed to load calendar list.', result.status);
    }

    const items = result.data.items;
    if (Array.isArray(items)) {
      for (const raw of items) {
        const entry = mapGoogleCalendarListItem(raw as Record<string, unknown>);
        if (entry) {
          collected.push(entry);
        }
      }
    }

    pageToken = typeof result.data.nextPageToken === 'string'
      ? result.data.nextPageToken
      : undefined;
  } while (pageToken);

  return collected;
}

export class CalendarSyncError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'CalendarSyncError';
  }
}

export async function syncCalendarEvents(
  accessToken: string,
  cache: CalendarCachePayload,
  calendar: CalendarListEntry,
  nowMs: number,
  forceFull: boolean,
): Promise<void> {
  const useFull = forceFull || shouldUseFullSyncForCalendar(cache, calendar.id, nowMs);
  const lastSyncedAt = new Date(nowMs).toISOString();

  if (!cache.calendars[calendar.id]) {
    cache.calendars[calendar.id] = { nextSyncToken: null, events: {} };
  }

  const bucket = cache.calendars[calendar.id];

  if (useFull) {
    await runFullEventSync(accessToken, cache, calendar, bucket, nowMs, lastSyncedAt);
    return;
  }

  if (!bucket.nextSyncToken) {
    await runFullEventSync(accessToken, cache, calendar, bucket, nowMs, lastSyncedAt);
    return;
  }

  try {
    await runIncrementalEventSync(accessToken, calendar, bucket, lastSyncedAt, cache.timeZone);
  } catch (error) {
    if (error instanceof CalendarSyncError && error.status === 410) {
      bucket.nextSyncToken = null;
      bucket.events = {};
      await runFullEventSync(accessToken, cache, calendar, bucket, nowMs, lastSyncedAt);
      return;
    }
    throw error;
  }
}

async function runFullEventSync(
  accessToken: string,
  cache: CalendarCachePayload,
  calendar: CalendarListEntry,
  bucket: { nextSyncToken: string | null; events: Record<string, import('../../shared/calendar/types').CalendarEvent> },
  nowMs: number,
  lastSyncedAt: string,
): Promise<void> {
  const bounds = computeFullSyncWindowBounds(nowMs, cache.timeZone);
  let pageToken: string | undefined;
  let finalNextSyncToken: string | null = null;
  const mergedEvents: Record<string, import('../../shared/calendar/types').CalendarEvent> = {};

  do {
    const url = buildEventsListFullUrl({
      calendarId: calendar.id,
      timeMin: bounds.timeMin,
      timeMax: bounds.timeMax,
      pageToken,
    });

    const result = await googleFetchJson(url, accessToken);
    if (!result.ok) {
      throw new CalendarSyncError('Failed to sync calendar events.', result.status);
    }

    applyEventItems(result.data, calendar, lastSyncedAt, mergedEvents, cache.timeZone);

    pageToken = typeof result.data.nextPageToken === 'string'
      ? result.data.nextPageToken
      : undefined;

    if (!pageToken && typeof result.data.nextSyncToken === 'string') {
      finalNextSyncToken = result.data.nextSyncToken;
    }
  } while (pageToken);

  bucket.events = mergedEvents;
  bucket.nextSyncToken = finalNextSyncToken;
  cache.fullSyncWindowAnchorDate = resolveFullSyncWindowAnchor(nowMs, cache.timeZone);
  cache.lastFullSyncCompletedAtMs = nowMs;
}

async function runIncrementalEventSync(
  accessToken: string,
  calendar: CalendarListEntry,
  bucket: { nextSyncToken: string | null; events: Record<string, import('../../shared/calendar/types').CalendarEvent> },
  lastSyncedAt: string,
  cacheTimeZone: string,
): Promise<void> {
  if (!bucket.nextSyncToken) {
    throw new CalendarSyncError('Missing sync token.');
  }

  let pageToken: string | undefined;
  const syncToken = bucket.nextSyncToken;
  let finalNextSyncToken: string | null = bucket.nextSyncToken;

  do {
    const url = buildEventsListIncrementalUrl({
      calendarId: calendar.id,
      syncToken,
      pageToken,
    });

    const result = await googleFetchJson(url, accessToken);
    if (!result.ok) {
      throw new CalendarSyncError('Incremental sync failed.', result.status);
    }

    applyEventItems(result.data, calendar, lastSyncedAt, bucket.events, cacheTimeZone);

    pageToken = typeof result.data.nextPageToken === 'string'
      ? result.data.nextPageToken
      : undefined;

    if (!pageToken && typeof result.data.nextSyncToken === 'string') {
      finalNextSyncToken = result.data.nextSyncToken;
    }
  } while (pageToken);

  bucket.nextSyncToken = finalNextSyncToken;
}

function applyEventItems(
  data: Record<string, unknown>,
  calendar: CalendarListEntry,
  lastSyncedAt: string,
  target: Record<string, import('../../shared/calendar/types').CalendarEvent>,
  cacheTimeZone: string,
): void {
  const items = data.items;
  if (!Array.isArray(items)) {
    return;
  }

  for (const raw of items) {
    const item = raw as GoogleCalendarEventItem;
    if (item.status === 'cancelled' && item.id) {
      delete target[item.id];
      continue;
    }

    const mapped = mapGoogleEvent(item, calendar, lastSyncedAt, cacheTimeZone);
    if (mapped) {
      target[mapped.externalEventId] = mapped;
    }
  }
}

export function isRollingFullSyncDueForCache(cache: CalendarCachePayload, nowMs: number): boolean {
  return isRollingFullSyncDue({
    fullSyncWindowAnchorDate: cache.fullSyncWindowAnchorDate,
    lastFullSyncCompletedAtMs: cache.lastFullSyncCompletedAtMs,
    nowMs,
    timeZone: cache.timeZone,
  });
}

/**
 * Supplemental visible-range fetch using timeMin/timeMax only (never with syncToken).
 * Merges into cache without altering nextSyncToken.
 */
export async function mergeCalendarEventsForVisibleRange(
  accessToken: string,
  cache: CalendarCachePayload,
  calendar: CalendarListEntry,
  timeMin: string,
  timeMax: string,
  nowMs: number,
): Promise<void> {
  if (!cache.calendars[calendar.id]) {
    cache.calendars[calendar.id] = { nextSyncToken: null, events: {} };
  }

  const bucket = cache.calendars[calendar.id];
  const lastSyncedAt = new Date(nowMs).toISOString();
  let pageToken: string | undefined;

  do {
    const url = buildEventsListFullUrl({
      calendarId: calendar.id,
      timeMin,
      timeMax,
      pageToken,
    });

    if (incrementalUrlContainsForbiddenWindowParams(url) && url.includes('syncToken=')) {
      throw new CalendarSyncError('Invalid supplemental events request.');
    }

    const result = await googleFetchJson(url, accessToken);
    if (!result.ok) {
      throw new CalendarSyncError('Failed to load calendar events for visible range.', result.status);
    }

    applyEventItems(result.data, calendar, lastSyncedAt, bucket.events, cache.timeZone);

    pageToken = typeof result.data.nextPageToken === 'string'
      ? result.data.nextPageToken
      : undefined;
  } while (pageToken);
}
