export type FocusSessionStatus = 'running' | 'paused' | 'completed' | 'abandoned';

export type { FocusSessionInsert } from '../../shared/focus/sessionMapper';

export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string | null;
  target_duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  paused_seconds: number;
  interruption_count: number;
  status: FocusSessionStatus;
}

export interface EndedSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  targetDurationMinutes: number;
  startedAt: string;
  endedAt: string;
  pausedSeconds: number;
  status: 'completed' | 'abandoned';
  focusMinutes: number;
}
