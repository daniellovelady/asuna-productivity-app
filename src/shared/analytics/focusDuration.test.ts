import { describe, expect, it } from 'vitest';
import { actualFocusMinutes, actualFocusSeconds } from './focusDuration';

describe('actualFocusSeconds', () => {
  it('subtracts paused seconds and clamps negative results to zero', () => {
    expect(actualFocusSeconds(
      '2026-08-25T19:00:00.000Z',
      '2026-08-25T19:50:00.000Z',
      600,
    )).toBe(2400);
  });

  it('clamps negative elapsed time to zero', () => {
    expect(actualFocusSeconds(
      '2026-08-25T19:00:00.000Z',
      '2026-08-25T19:10:00.000Z',
      900,
    )).toBe(0);
  });
});

describe('actualFocusMinutes', () => {
  it('converts seconds to minutes', () => {
    expect(actualFocusMinutes(
      '2026-08-26T15:00:00.000Z',
      '2026-08-26T15:25:00.000Z',
      0,
    )).toBe(25);
  });
});
