import type { CompletedFocusSession } from './types';

export interface FocusSessionInsert {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string | null;
  target_duration_minutes: number;
  started_at: string;
  ended_at: string;
  paused_seconds: number;
  interruption_count: number;
  status: 'completed' | 'abandoned';
}

export function toFocusSessionRow(
  completed: CompletedFocusSession,
  userId: string,
  taskId: string | null,
  taskTitleSnapshot: string | null,
): FocusSessionInsert {
  const elapsedMetTarget = completed.elapsedFocusMs >= completed.targetDurationMs;

  return {
    id: completed.id,
    user_id: userId,
    task_id: taskId,
    task_title_snapshot: taskTitleSnapshot,
    target_duration_minutes: completed.targetDurationMs / 60_000,
    started_at: new Date(completed.startedAt).toISOString(),
    ended_at: new Date(completed.endedAt).toISOString(),
    paused_seconds: Math.round(completed.accumulatedPausedMs / 1000),
    interruption_count: 0,
    status: elapsedMetTarget ? 'completed' : 'abandoned',
  };
}

export function computeFocusMinutes(
  startedAt: string,
  endedAt: string,
  pausedSeconds: number,
): number {
  const elapsedSeconds = Math.max(
    0,
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000 - pausedSeconds,
  );

  return elapsedSeconds / 60;
}
