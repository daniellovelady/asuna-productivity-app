import { describe, expect, it } from 'vitest';
import { formatAnalyticsMinutes, formatAnalyticsPercent } from './formatAnalyticsMinutes';

describe('formatAnalyticsMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatAnalyticsMinutes(95)).toBe('1h 35m');
  });

  it('formats minutes only', () => {
    expect(formatAnalyticsMinutes(25)).toBe('25m');
  });

  it('returns an em dash for null', () => {
    expect(formatAnalyticsMinutes(null)).toBe('—');
  });
});

describe('formatAnalyticsPercent', () => {
  it('formats percentages', () => {
    expect(formatAnalyticsPercent(60)).toBe('60%');
  });

  it('returns an em dash for null', () => {
    expect(formatAnalyticsPercent(null)).toBe('—');
  });
});
