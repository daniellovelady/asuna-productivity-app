export interface ScheduleBlockTimeBounds {
  scheduledStartAt: string;
  scheduledEndAt: string;
}

/**
 * Range intersection: block overlaps [rangeStart, rangeEnd) when
 * scheduled_start_at < rangeEnd AND scheduled_end_at > rangeStart.
 */
export function scheduleBlockIntersectsRange(
  block: ScheduleBlockTimeBounds,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const startMs = new Date(block.scheduledStartAt).getTime();
  const endMs = new Date(block.scheduledEndAt).getTime();
  const rangeStartMs = new Date(rangeStart).getTime();
  const rangeEndMs = new Date(rangeEnd).getTime();

  if (
    !Number.isFinite(startMs)
    || !Number.isFinite(endMs)
    || !Number.isFinite(rangeStartMs)
    || !Number.isFinite(rangeEndMs)
  ) {
    return false;
  }

  return startMs < rangeEndMs && endMs > rangeStartMs;
}