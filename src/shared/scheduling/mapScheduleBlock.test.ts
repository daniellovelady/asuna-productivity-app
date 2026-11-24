import { describe, expect, it } from 'vitest';
import { mapScheduleBlockRow } from './mapScheduleBlock';
import type { ScheduleBlockRow } from './types';

const row: ScheduleBlockRow = {
  id: 'block-1',
  user_id: 'user-1',
  task_id: 'task-1',
  task_title_snapshot: 'Write report',
  scheduled_start_at: '2026-03-10T15:00:00.000Z',
  scheduled_end_at: '2026-03-10T16:00:00.000Z',
  timezone: 'America/Chicago',
  status: 'scheduled',
  cancel_reason: null,
  cancelled_at: null,
  google_calendar_id: null,
  google_event_id: null,
  google_sync_state: 'synced',
  google_sync_error: null,
  google_sync_next_retry_at: null,
  google_last_synced_at: null,
  created_at: '2026-03-09T12:00:00.000Z',
  updated_at: '2026-03-09T12:00:00.000Z',
};

describe('mapScheduleBlockRow', () => {
  it('maps snake_case row to camelCase ScheduleBlock', () => {
    expect(mapScheduleBlockRow(row)).toEqual({
      id: 'block-1',
      userId: 'user-1',
      taskId: 'task-1',
      taskTitleSnapshot: 'Write report',
      scheduledStartAt: '2026-03-10T15:00:00.000Z',
      scheduledEndAt: '2026-03-10T16:00:00.000Z',
      timezone: 'America/Chicago',
      status: 'scheduled',
      cancelReason: null,
      cancelledAt: null,
      googleCalendarId: null,
      googleEventId: null,
      googleSyncState: 'synced',
      googleSyncError: null,
      googleSyncNextRetryAt: null,
      googleLastSyncedAt: null,
      createdAt: '2026-03-09T12:00:00.000Z',
      updatedAt: '2026-03-09T12:00:00.000Z',
    });
  });
});