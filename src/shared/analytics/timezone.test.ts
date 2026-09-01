import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  computeAnalyticsWindow,
  resolveEffectiveTimezone,
} from './timezone';

const VALID_TIMEZONES = new Set(['America/Chicago', 'UTC']);

describe('resolveEffectiveTimezone', () => {
  it('uses a valid timezone', () => {
    expect(resolveEffectiveTimezone('America/Chicago', VALID_TIMEZONES)).toBe('America/Chicago');
  });

  it('falls back to UTC for null', () => {
    expect(resolveEffectiveTimezone(null, VALID_TIMEZONES)).toBe('UTC');
  });

  it('falls back to UTC for blank', () => {
    expect(resolveEffectiveTimezone('   ', VALID_TIMEZONES)).toBe('UTC');
  });

  it('falls back to UTC for invalid timezone names', () => {
    expect(resolveEffectiveTimezone('Not/A/Timezone', VALID_TIMEZONES)).toBe('UTC');
  });
});

describe('computeAnalyticsWindow', () => {
  it('returns seven inclusive local days', () => {
    const window = computeAnalyticsWindow('2026-08-31', 'America/Chicago');

    expect(window.start).toBe('2026-08-25');
    expect(window.end).toBe('2026-08-31');
    expect(addLocalDays(window.start, 6)).toBe(window.end);
  });
});
