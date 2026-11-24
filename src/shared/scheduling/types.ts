export type ScheduleBlockStatus = 'scheduled' | 'cancelled';

export type ScheduleBlockCancelReason =
  | 'task_completed'
  | 'user_unscheduled'
  | 'task_deleted';

export type ScheduleBlockGoogleSyncState =
  | 'synced'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'error';

export interface ScheduleBlock {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitleSnapshot: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  status: ScheduleBlockStatus;
  cancelReason: ScheduleBlockCancelReason | null;
  cancelledAt: string | null;
  googleCalendarId: string | null;
  googleEventId: string | null;
  googleSyncState: ScheduleBlockGoogleSyncState;
  googleSyncError: string | null;
  googleSyncNextRetryAt: string | null;
  googleLastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleBlockRow {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  timezone: string;
  status: ScheduleBlockStatus;
  cancel_reason: ScheduleBlockCancelReason | null;
  cancelled_at: string | null;
  google_calendar_id: string | null;
  google_event_id: string | null;
  google_sync_state: ScheduleBlockGoogleSyncState;
  google_sync_error: string | null;
  google_sync_next_retry_at: string | null;
  google_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}