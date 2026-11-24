import { describe, expect, it } from 'vitest';
import { isValidDefaultScheduleBlockMinutes } from './validation';

describe('defaultScheduleBlockMinutes validation', () => {
  it('accepts 15, 60, and 240', () => {
    expect(isValidDefaultScheduleBlockMinutes(15)).toBe(true);
    expect(isValidDefaultScheduleBlockMinutes(60)).toBe(true);
    expect(isValidDefaultScheduleBlockMinutes(240)).toBe(true);
  });

  it('rejects non-15 step values', () => {
    expect(isValidDefaultScheduleBlockMinutes(16)).toBe(false);
    expect(isValidDefaultScheduleBlockMinutes(61)).toBe(false);
  });

  it('rejects out of range values', () => {
    expect(isValidDefaultScheduleBlockMinutes(14)).toBe(false);
    expect(isValidDefaultScheduleBlockMinutes(241)).toBe(false);
  });
});