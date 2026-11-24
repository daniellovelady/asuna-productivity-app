import type { FocusPersistenceContext } from './focusStartIntent';
import type { CompletedFocusSession } from './types';

export interface FocusSessionInsert {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title_snapshot: string | null;
  context_type: 'none' | 'task' | 'calendar_event';
  context_title_snapshot: string | null;
  external_calendar_event_id: string | null;
  external_calendar_id: string | null;
  calendar_provider: 'google' | null;
  target_duration_minutes: number;
  started_at: string;
  ended_at: string;
  paused_seconds: number;
  interruption_count: number;
  break_target_minutes: number;
  status: 'completed' | 'abandoned';
}

export function toFocusSessionRow(
  completed: CompletedFocusSession,
  userId: string,
  persistence: FocusPersistenceContext,
): FocusSessionInsert {
  const elapsedMetTarget = completed.elapsedFocusMs >= completed.targetDurationMs;

  return {
    id: completed.id,
    user_id: userId,
    task_id: persistence.taskId,
    task_title_snapshot: persistence.taskTitleSnapshot,
    context_type: persistence.contextType,
    context_title_snapshot: persistence.contextTitleSnapshot,
    external_calendar_event_id: persistence.externalCalendarEventId,
    external_calendar_id: persistence.externalCalendarId,
    calendar_provider: persistence.calendarProvider,
    target_duration_minutes: completed.targetDurationMs / 60_000,
    started_at: new Date(completed.startedAt).toISOString(),
    ended_at: new Date(completed.endedAt).toISOString(),
    paused_seconds: Math.round(completed.accumulatedPausedMs / 1000),
    interruption_count: completed.interruptionCount,
    break_target_minutes: completed.breakTargetMinutes,
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
