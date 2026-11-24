import { describe, expect, it } from 'vitest';
import { computeRollingSevenDayWindow } from './focusHistoryWindow';

describe('computeRollingSevenDayWindow', () => {
  it('freezes a seven-day window ending at the provided instant', () => {
    const windowEnd = new Date('2026-10-07T15:00:00.000Z');
    const { windowStartIso, windowEndIso } = computeRollingSevenDayWindow(windowEnd);

    expect(windowEndIso).toBe('2026-10-07T15:00:00.000Z');
    expect(windowStartIso).toBe('2026-09-30T15:00:00.000Z');
  });

  it('returns stable ISO strings for count/delete reuse', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');
    const first = computeRollingSevenDayWindow(now);
    const second = computeRollingSevenDayWindow(now);

    expect(first).toEqual(second);
  });
});
