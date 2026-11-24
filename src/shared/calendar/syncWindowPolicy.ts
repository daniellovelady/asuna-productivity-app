/** Local calendar day anchor for the bounded full-sync window (YYYY-MM-DD). */
export type FullSyncWindowAnchorDate = string;

const MS_PER_HOUR = 60 * 60 * 1000;
const ROLLING_FULL_INTERVAL_MS = 24 * MS_PER_HOUR;

export function formatLocalCalendarDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface RollingFullSyncInput {
  fullSyncWindowAnchorDate: FullSyncWindowAnchorDate | null;
  lastFullSyncCompletedAtMs: number | null;
  nowMs: number;
  timeZone: string;
}

/**
 * Rolling window full sync is due when the stored anchor is from a previous local
 * calendar day, or when at least ~24h have passed since the last full sync.
 */
export function isRollingFullSyncDue(input: RollingFullSyncInput): boolean {
  const today = formatLocalCalendarDay(new Date(input.nowMs), input.timeZone);

  if (input.fullSyncWindowAnchorDate === null) {
    return true;
  }

  if (input.fullSyncWindowAnchorDate !== today) {
    return true;
  }

  if (input.lastFullSyncCompletedAtMs === null) {
    return true;
  }

  return input.nowMs - input.lastFullSyncCompletedAtMs >= ROLLING_FULL_INTERVAL_MS;
}

export function resolveFullSyncWindowAnchor(nowMs: number, timeZone: string): FullSyncWindowAnchorDate {
  return formatLocalCalendarDay(new Date(nowMs), timeZone);
}
