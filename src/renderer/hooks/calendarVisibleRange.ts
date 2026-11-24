import type { VisibleRange } from './useCalendarWorkspace';

export function visibleRangeKey(range: VisibleRange): string {
  return `${range.rangeStart}|${range.rangeEnd}`;
}

export function shouldReplaceVisibleRange(
  current: VisibleRange | null,
  next: VisibleRange,
): boolean {
  if (!current) {
    return true;
  }
  return current.rangeStart !== next.rangeStart || current.rangeEnd !== next.rangeEnd;
}