import type { CalendarEvent } from './types';

export function groupAgendaEvents(
  events: CalendarEvent[],
  nowMs: number,
  timeZone: string,
): { today: CalendarEvent[]; upcoming: CalendarEvent[] } {
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));

  const actionable = events.filter((event) => event.status !== 'cancelled');

  const today: CalendarEvent[] = [];
  const upcoming: CalendarEvent[] = [];

  for (const event of actionable) {
    const eventDayKey = eventStartDayKey(event, timeZone);
    if (eventDayKey === todayKey) {
      today.push(event);
    } else if (eventDayKey > todayKey) {
      upcoming.push(event);
    }
  }

  const byStart = (a: CalendarEvent, b: CalendarEvent) =>
    a.startAt.localeCompare(b.startAt);

  today.sort(byStart);
  upcoming.sort(byStart);

  return { today, upcoming };
}

function eventStartDayKey(event: CalendarEvent, timeZone: string): string {
  if (event.allDay) {
    return event.startAt.slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(event.startAt));
}
