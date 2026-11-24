import { describe, expect, it } from 'vitest';
import { shouldReplaceVisibleRange, visibleRangeKey } from './calendarVisibleRange';

describe('calendarVisibleRange', () => {
  it('dedupes identical range keys', () => {
    const range = { rangeStart: '2026-01-01T00:00:00.000Z', rangeEnd: '2026-02-01T00:00:00.000Z' };
    expect(visibleRangeKey(range)).toBe('2026-01-01T00:00:00.000Z|2026-02-01T00:00:00.000Z');
    expect(shouldReplaceVisibleRange(range, range)).toBe(false);
  });

  it('accepts range changes', () => {
    const a = { rangeStart: '2026-01-01T00:00:00.000Z', rangeEnd: '2026-02-01T00:00:00.000Z' };
    const b = { rangeStart: '2026-02-01T00:00:00.000Z', rangeEnd: '2026-03-01T00:00:00.000Z' };
    expect(shouldReplaceVisibleRange(a, b)).toBe(true);
  });
});