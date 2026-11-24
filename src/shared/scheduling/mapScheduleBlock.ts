import type { ScheduleBlock, ScheduleBlockRow } from './types';

export function mapScheduleBlockRow(row: ScheduleBlockRow): ScheduleBlock {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    taskTitleSnapshot: row.task_title_snapshot,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    timezone: row.timezone,
    status: row.status,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at,
    googleCalendarId: row.google_calendar_id,
    googleEventId: row.google_event_id,
    googleSyncState: row.google_sync_state,
    googleSyncError: row.google_sync_error,
    googleSyncNextRetryAt: row.google_sync_next_retry_at,
    googleLastSyncedAt: row.google_last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}