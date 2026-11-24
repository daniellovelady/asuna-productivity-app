import { describe, expect, it } from 'vitest';
import { mapGoogleEvent } from './mapGoogleEvent';

const calendar = { id: 'cal', provider: 'google' as const, name: 'Work', primary: true };
const lastSyncedAt = '2026-11-23T00:00:00.000Z';

describe('mapGoogleEvent timezone', () => {
  it('maps naive Google dateTime using cache fallback timezone', () => {
    const event = mapGoogleEvent(
      {
        id: 'evt-a',
        start: { dateTime: '2026-11-23T13:25:00', timeZone: 'America/Chicago' },
        end: { dateTime: '2026-11-23T14:40:00', timeZone: 'America/Chicago' },
      },
      calendar,
      lastSyncedAt,
      'America/Chicago',
    );

    expect(event?.startAt).toBe('2026-11-23T19:25:00.000Z');
    expect(event?.endAt).toBe('2026-11-23T20:40:00.000Z');
  });

  it('prefers event timeZone over cache when datetime has no offset', () => {
    const event = mapGoogleEvent(
      {
        id: 'evt-b',
        start: { dateTime: '2026-11-23T14:50:00', timeZone: 'America/New_York' },
        end: { dateTime: '2026-11-23T16:05:00', timeZone: 'America/New_York' },
      },
      calendar,
      lastSyncedAt,
      'America/Chicago',
    );

    expect(event?.startAt).toBe('2026-11-23T19:50:00.000Z');
    expect(event?.endAt).toBe('2026-11-23T21:05:00.000Z');
  });

  it('leaves all-day events as date strings', () => {
    const event = mapGoogleEvent(
      {
        id: 'evt-day',
        start: { date: '2026-11-23' },
        end: { date: '2026-11-24' },
      },
      calendar,
      lastSyncedAt,
      'America/Chicago',
    );

    expect(event?.allDay).toBe(true);
    expect(event?.startAt).toBe('2026-11-23');
    expect(event?.endAt).toBe('2026-11-24');
  });
});