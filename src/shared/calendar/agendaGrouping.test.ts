import { describe, expect, it } from 'vitest';
import { groupAgendaEvents } from './agendaGrouping';
import type { CalendarEvent } from './types';

function buildEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'startAt'>): CalendarEvent {
  return {
    externalEventId: 'evt-1',
    calendarId: 'cal-1',
    calendarName: 'Work',
    title: 'Test',
    startAt: overrides.startAt,
    endAt: overrides.endAt ?? overrides.startAt,
    allDay: overrides.allDay ?? false,
    location: null,
    status: 'confirmed',
    provider: 'google',
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
    linkedTaskId: null,
    mirrorScheduleBlockId: null,
    ...overrides,
  };
}

describe('groupAgendaEvents', () => {
  it('groups timed events on local calendar day in America/Chicago', () => {
    // 2026-03-08 00:30 UTC is still 2026-03-07 in Chicago (CST)
    const nowMs = new Date('2026-03-08T00:30:00.000Z').getTime();
    const events = [
      buildEvent({
        startAt: '2026-03-08T01:00:00.000Z',
        endAt: '2026-03-08T02:00:00.000Z',
        title: 'Tonight Chicago',
      }),
      buildEvent({
        startAt: '2026-03-09T01:00:00.000Z',
        endAt: '2026-03-09T02:00:00.000Z',
        title: 'Tomorrow Chicago',
      }),
    ];

    const chicago = groupAgendaEvents(events, nowMs, 'America/Chicago');
    expect(chicago.today.map((e) => e.title)).toEqual(['Tonight Chicago']);
    expect(chicago.upcoming.map((e) => e.title)).toEqual(['Tomorrow Chicago']);

    const utc = groupAgendaEvents(events, nowMs, 'UTC');
    expect(utc.today.map((e) => e.title)).toEqual(['Tonight Chicago']);
    expect(utc.upcoming.map((e) => e.title)).toEqual(['Tomorrow Chicago']);
  });

  it('uses date portion for all-day events', () => {
    const nowMs = new Date('2026-06-15T12:00:00.000Z').getTime();
    const events = [
      buildEvent({
        allDay: true,
        startAt: '2026-06-15',
        endAt: '2026-06-16',
        title: 'All day today',
      }),
      buildEvent({
        allDay: true,
        startAt: '2026-06-16',
        endAt: '2026-06-17',
        title: 'All day tomorrow',
      }),
    ];

    const grouped = groupAgendaEvents(events, nowMs, 'America/Chicago');
    expect(grouped.today[0]?.title).toBe('All day today');
    expect(grouped.upcoming[0]?.title).toBe('All day tomorrow');
  });

  it('excludes cancelled events', () => {
    const nowMs = Date.now();
    const events = [
      buildEvent({
        startAt: '2099-01-01T10:00:00.000Z',
        status: 'cancelled',
      }),
    ];
    const grouped = groupAgendaEvents(events, nowMs, 'UTC');
    expect(grouped.today).toHaveLength(0);
    expect(grouped.upcoming).toHaveLength(0);
  });
});