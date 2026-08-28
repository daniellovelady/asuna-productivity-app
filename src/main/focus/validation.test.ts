import { describe, expect, it } from 'vitest';
import {
  assertValidFocusDurationMinutes,
  FOCUS_DURATION_OPTIONS,
  isValidFocusDurationMinutes,
} from '../../shared/focus/validation';

describe('isValidFocusDurationMinutes', () => {
  it('accepts valid durations from 5 to 60 in 5-minute steps', () => {
    expect(isValidFocusDurationMinutes(5)).toBe(true);
    expect(isValidFocusDurationMinutes(25)).toBe(true);
    expect(isValidFocusDurationMinutes(60)).toBe(true);
  });

  it('rejects invalid durations', () => {
    expect(isValidFocusDurationMinutes(7)).toBe(false);
    expect(isValidFocusDurationMinutes(61)).toBe(false);
    expect(isValidFocusDurationMinutes(4)).toBe(false);
    expect(isValidFocusDurationMinutes(25.5)).toBe(false);
    expect(isValidFocusDurationMinutes('25')).toBe(false);
    expect(isValidFocusDurationMinutes(null)).toBe(false);
  });
});

describe('assertValidFocusDurationMinutes', () => {
  it('throws for invalid durations', () => {
    expect(() => assertValidFocusDurationMinutes(7)).toThrow(
      'Duration must be an integer from 5 to 60 in 5-minute increments.',
    );
  });
});

describe('FOCUS_DURATION_OPTIONS', () => {
  it('includes every valid duration option', () => {
    expect(FOCUS_DURATION_OPTIONS).toEqual([
      5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
    ]);
  });
});
