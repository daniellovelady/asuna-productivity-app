import { describe, expect, it } from 'vitest';
import { buildUnifiedCalendarFeed } from './unifiedCalendarItem';
import type { CalendarEvent } from './types';
import type { ScheduleBlock } from '../scheduling/types';

const block: ScheduleBlock = {
  id: 'block-1',
  userId: 'user-1',
  taskId: 'task-1',
  taskTitleSnapshot: 'Write',
  scheduledStartAt: '2026-03-10T14:00:00.000Z',
  scheduledEndAt: '2026-03-10T15:00:00.000Z',
  timezone: 'UTC',
  status: 'scheduled',
  cancelReason: null,
  cancelledAt: null,
  googleCalendarId: null,
  googleEventId: null,
  googleSyncState: 'synced',
  googleSyncError: null,
  googleSyncNextRetryAt: null,
  googleLastSyncedAt: null,
  createdAt: '2026-03-09T00:00:00.000Z',
  updatedAt: '2026-03-09T00:00:00.000Z',
};

const googleEvent: CalendarEvent = {
  externalEventId: 'evt-1',
  calendarId: 'cal-1',
  calendarName: 'Work',
  title: 'Mirror',
  startAt: '2026-03-10T14:00:00.000Z',
  endAt: '2026-03-10T15:00:00.000Z',
  allDay: false,
  location: null,
  status: 'confirmed',
  provider: 'google',
  lastSyncedAt: '2026-03-09T00:00:00.000Z',
  linkedTaskId: null,
  mirrorScheduleBlockId: 'block-1',
};

describe('buildUnifiedCalendarFeed', () => {
  const visibility = {
    showAsunaBlocks: true,
    showGoogleCalendars: true,
    hiddenGoogleCalendarIds: new Set<string>(),
  };

  it('dedupes mirrored Google events when local block exists', () => {
    const feed = buildUnifiedCalendarFeed({
      scheduleBlocks: [block],
      googleEvents: [googleEvent],
      visibility,
      rangeStart: '2026-03-10T00:00:00.000Z',
      rangeEnd: '2026-03-11T00:00:00.000Z',
    });
    expect(feed).toHaveLength(1);
    expect(feed[0]?.source).toBe('asuna_schedule_block');
  });

  it('excludes cancelled blocks', () => {
    const feed = buildUnifiedCalendarFeed({
      scheduleBlocks: [{ ...block, status: 'cancelled', cancelReason: 'user_unscheduled', cancelledAt: '2026-03-10T12:00:00.000Z' }],
      googleEvents: [],
      visibility,
      rangeStart: '2026-03-10T00:00:00.000Z',
      rangeEnd: '2026-03-11T00:00:00.000Z',
    });
    expect(feed).toHaveLength(0);
  });

  it('respects source visibility toggles', () => {
    const feed = buildUnifiedCalendarFeed({
      scheduleBlocks: [block],
      googleEvents: [{ ...googleEvent, mirrorScheduleBlockId: null }],
      visibility: { ...visibility, showGoogleCalendars: false },
      rangeStart: '2026-03-10T00:00:00.000Z',
      rangeEnd: '2026-03-11T00:00:00.000Z',
    });
    expect(feed.every((item) => item.source === 'asuna_schedule_block')).toBe(true);
  });
});