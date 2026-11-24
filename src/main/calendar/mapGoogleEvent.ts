import type { CalendarEvent, CalendarEventStatus, CalendarListEntry } from '../../shared/calendar/types';
import { googleDateTimeToUtcIso } from '../../shared/calendar/googleDateTime';

export interface GoogleCalendarEventItem {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export function mapGoogleEvent(
  item: GoogleCalendarEventItem,
  calendar: CalendarListEntry,
  lastSyncedAt: string,
  cacheTimeZone = 'UTC',
): CalendarEvent | null {
  if (!item.id) {
    return null;
  }

  const start = item.start;
  const end = item.end;
  if (!start || !end) {
    return null;
  }

  const allDay = Boolean(start.date && !start.dateTime);
  let startAt: string;
  let endAt: string;

  if (allDay && start.date && end.date) {
    startAt = start.date;
    endAt = end.date;
  } else if (start.dateTime && end.dateTime) {
    startAt = googleDateTimeToUtcIso(start.dateTime, start.timeZone, cacheTimeZone);
    endAt = googleDateTimeToUtcIso(end.dateTime, end.timeZone, cacheTimeZone);
  } else {
    return null;
  }

  const status = normalizeStatus(item.status);

  const mirrorScheduleBlockId = readMirrorScheduleBlockId(item);

  return {
    externalEventId: item.id,
    calendarId: calendar.id,
    calendarName: calendar.name,
    title: item.summary?.trim() || '(No title)',
    startAt,
    endAt,
    allDay,
    location: item.location?.trim() || null,
    status,
    provider: 'google',
    lastSyncedAt,
    linkedTaskId: null,
    mirrorScheduleBlockId,
  };
}

export function readMirrorScheduleBlockId(
  item: GoogleCalendarEventItem,
): string | null {
  const raw = item.extendedProperties?.private?.asuna_schedule_block_id;
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: string | undefined): CalendarEventStatus {
  if (value === 'tentative') {
    return 'tentative';
  }
  if (value === 'cancelled') {
    return 'cancelled';
  }
  return 'confirmed';
}

export function mapGoogleCalendarListItem(item: {
  id?: string;
  summary?: string;
  primary?: boolean;
}): CalendarListEntry | null {
  if (!item.id) {
    return null;
  }

  return {
    id: item.id,
    provider: 'google',
    name: item.summary?.trim() || 'Calendar',
    primary: Boolean(item.primary),
  };
}
