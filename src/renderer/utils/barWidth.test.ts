import { describe, expect, it } from 'vitest';
import { computeBarWidthPercent } from './barWidth';

describe('computeBarWidthPercent', () => {
  it('returns zero when the max value is zero', () => {
    expect(computeBarWidthPercent(0, 0)).toBe(0);
  });

  it('computes proportional widths when max is positive', () => {
    expect(computeBarWidthPercent(100, 50)).toBe(50);
  });
});
