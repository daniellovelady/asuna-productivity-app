export function formatDurationMs(totalMs: number): string {
  const clampedMs = Math.max(0, totalMs);
  const totalSeconds = Math.floor(clampedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDurationMinutes(minutes: number): string {
  return formatDurationMs(minutes * 60_000);
}
