import type { EventApi } from '@fullcalendar/core';
import type { DatesSetArg } from '@fullcalendar/react';
import { Temporal } from 'temporal-polyfill';
import type { UnifiedCalendarItem } from '../../shared/calendar/unifiedCalendarItem';

export function interpretInstantInCalendarTimeZone(
  iso: string,
  calendarTimeZone: string,
): { temporalZonedStart: string; temporalHour: number; temporalMinute: number } | null {
  try {
    const instant = Temporal.Instant.from(iso);
    const zonedIso = instant.toZonedDateTimeISO(calendarTimeZone);
    const zdt = Temporal.ZonedDateTime.from(zonedIso);
    return {
      temporalZonedStart: zdt.toString(),
      temporalHour: zdt.hour,
      temporalMinute: zdt.minute,
    };
  } catch {
    return null;
  }
}

export type CalendarTimingDiagInput = {
  reason: string;
  datesSet: DatesSetArg | null;
  profileTimeZone: string;
  fullCalendarTimeZoneProp: string;
  fcApiTimeZoneOption: string | null;
  unifiedItems: UnifiedCalendarItem[];
  fcEvents: EventApi[];
};

function pickTimedGoogleUnifiedItem(items: UnifiedCalendarItem[]): UnifiedCalendarItem | null {
  return items.find((item) => item.source === 'google_calendar' && !item.allDay) ?? null;
}

/** Dev-only. Logs one timed Google event placement sample. Returns true when a line was emitted. */
export function tryEmitCalendarTimingDiagnostic(input: CalendarTimingDiagInput): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  const sample = pickTimedGoogleUnifiedItem(input.unifiedItems);
  if (!sample) {
    return false;
  }

  const fcEvent = input.fcEvents.find((event) => event.extendedProps.unifiedItemId === sample.id);
  if (!fcEvent?.start || !fcEvent.end) {
    return false;
  }

  const datesSetWithTz = input.datesSet as (DatesSetArg & { timeZone?: string }) | null;
  const calendarTimeZone = datesSetWithTz?.timeZone
    ?? input.fcApiTimeZoneOption
    ?? input.fullCalendarTimeZoneProp;
  const startIso = fcEvent.start.toISOString();
  const endIso = fcEvent.end.toISOString();
  const temporal = interpretInstantInCalendarTimeZone(startIso, calendarTimeZone);

  console.info('[calendar-timing]', {
    reason: input.reason,
    calendarTimeZone,
    profileTimeZone: input.profileTimeZone,
    fullCalendarTimeZoneProp: input.fullCalendarTimeZoneProp,
    fcApiTimeZoneOption: input.fcApiTimeZoneOption,
    datesSetStartStr: input.datesSet?.startStr ?? null,
    datesSetEndStr: input.datesSet?.endStr ?? null,
    unifiedStart: sample.start,
    unifiedEnd: sample.end,
    eventStartStr: fcEvent.startStr,
    eventEndStr: fcEvent.endStr,
    eventStartIso: startIso,
    eventEndIso: endIso,
    temporalZonedStart: temporal?.temporalZonedStart ?? null,
    temporalHour: temporal?.temporalHour ?? null,
    temporalMinute: temporal?.temporalMinute ?? null,
  });

  return true;
}