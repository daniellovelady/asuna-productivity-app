export function isValidScheduleBlockTimeRange(
  scheduledStartAt: string,
  scheduledEndAt: string,
): boolean {
  const startMs = new Date(scheduledStartAt).getTime();
  const endMs = new Date(scheduledEndAt).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return endMs > startMs;
}