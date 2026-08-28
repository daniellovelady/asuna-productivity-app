import { describe, expect, it } from 'vitest';
import { formatDurationMinutes, formatDurationMs } from './formatDuration';

describe('formatDurationMs', () => {
  it('formats milliseconds as MM:SS', () => {
    expect(formatDurationMs(1_500_000)).toBe('25:00');
    expect(formatDurationMs(65_000)).toBe('01:05');
  });

  it('clamps negative values to 00:00', () => {
    expect(formatDurationMs(-1_000)).toBe('00:00');
  });
});

describe('formatDurationMinutes', () => {
  it('formats whole minutes as MM:00', () => {
    expect(formatDurationMinutes(25)).toBe('25:00');
  });
});
