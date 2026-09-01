export function actualFocusSeconds(
  startedAt: string,
  endedAt: string,
  pausedSeconds: number,
): number {
  const elapsedSeconds = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    - pausedSeconds;

  return Math.max(0, elapsedSeconds);
}

export function actualFocusMinutes(
  startedAt: string,
  endedAt: string,
  pausedSeconds: number,
): number {
  return actualFocusSeconds(startedAt, endedAt, pausedSeconds) / 60;
}

export function resolveTaskLabel(taskTitleSnapshot: string | null): string {
  const trimmed = taskTitleSnapshot?.trim();
  return trimmed ? trimmed : 'No task';
}
