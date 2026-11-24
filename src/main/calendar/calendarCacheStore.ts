import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { CalendarEvent, CalendarListEntry } from '../../shared/calendar/types';
import type { FullSyncWindowAnchorDate } from '../../shared/calendar/syncWindowPolicy';
import { decryptJsonPayload, encryptJsonPayload } from './safeStorageBlob';

export interface CalendarCachePerCalendar {
  nextSyncToken: string | null;
  events: Record<string, CalendarEvent>;
}

export interface CalendarCachePayload {
  calendarList: CalendarListEntry[];
  calendars: Record<string, CalendarCachePerCalendar>;
  lastSyncedAt: string | null;
  fullSyncWindowAnchorDate: FullSyncWindowAnchorDate | null;
  lastFullSyncCompletedAtMs: number | null;
  timeZone: string;
}

const DEFAULT_CACHE: CalendarCachePayload = {
  calendarList: [],
  calendars: {},
  lastSyncedAt: null,
  fullSyncWindowAnchorDate: null,
  lastFullSyncCompletedAtMs: null,
  timeZone: 'UTC',
};

function cachePathForUser(userId: string): string {
  return path.join(app.getPath('userData'), 'calendar-cache', `${userId}.bin`);
}

export function loadCacheFromDisk(userId: string): CalendarCachePayload | null {
  const filePath = cachePathForUser(userId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    return decryptJsonPayload<CalendarCachePayload>(buffer);
  } catch {
    return null;
  }
}

export function saveCacheToDisk(userId: string, payload: CalendarCachePayload): void {
  const dir = path.join(app.getPath('userData'), 'calendar-cache');
  fs.mkdirSync(dir, { recursive: true });
  const buffer = encryptJsonPayload(payload);
  fs.writeFileSync(cachePathForUser(userId), buffer);
}

export function deleteCacheFromDisk(userId: string): void {
  const filePath = cachePathForUser(userId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function createEmptyCache(timeZone: string): CalendarCachePayload {
  return {
    ...DEFAULT_CACHE,
    timeZone,
  };
}

export function listAllEvents(cache: CalendarCachePayload): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const bucket of Object.values(cache.calendars)) {
    events.push(...Object.values(bucket.events));
  }
  return events;
}
