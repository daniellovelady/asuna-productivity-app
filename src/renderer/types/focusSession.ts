export type FocusSessionStatus = 'running' | 'paused' | 'completed' | 'abandoned';

export type { FocusSessionInsert } from '../../shared/focus/sessionMapper';

export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string | null;
  context_type?: 'none' | 'task' | 'calendar_event';
  context_title_snapshot?: string | null;
  external_calendar_event_id?: string | null;
  external_calendar_id?: string | null;
  calendar_provider?: 'google' | null;
  target_duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  paused_seconds: number;
  interruption_count: number;
  break_target_minutes: number;
  status: FocusSessionStatus;
}

export interface EndedSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  contextType: 'none' | 'task' | 'calendar_event';
  contextTitleSnapshot: string | null;
  taskTitleSnapshot: string | null;
  externalCalendarId: string | null;
  externalEventId: string | null;
  calendarProvider: 'google' | null;
  targetDurationMinutes: number;
  startedAt: string;
  endedAt: string;
  pausedSeconds: number;
  status: 'completed' | 'abandoned';
  focusMinutes: number;
}
