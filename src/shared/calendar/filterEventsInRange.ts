import { scheduleBlockIntersectsRange } from '../scheduling/rangeQuery';
import type { CalendarEvent } from './types';

export function filterCalendarEventsInRange(
  events: readonly CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
): CalendarEvent[] {
  return events.filter((event) =>
    scheduleBlockIntersectsRange(
      { scheduledStartAt: event.startAt, scheduledEndAt: event.endAt },
      rangeStart,
      rangeEnd,
    ),
  );
}