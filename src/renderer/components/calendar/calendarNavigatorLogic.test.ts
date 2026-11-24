import { describe, expect, it } from 'vitest';
import {
  buildMonthSelectionCommand,
  isSelectedMonth,
  MONTH_LABELS,
  shiftNavigatorYear,
} from './calendarNavigatorLogic';

describe('calendarNavigatorLogic', () => {
  it('exposes twelve month labels', () => {
    expect(MONTH_LABELS).toHaveLength(12);
    expect(MONTH_LABELS[2]).toBe('March');
  });

  it('shifts navigator year', () => {
    expect(shiftNavigatorYear(2026, 1)).toBe(2027);
    expect(shiftNavigatorYear(2026, -1)).toBe(2025);
  });

  it('builds March 2027 month selection command', () => {
    expect(buildMonthSelectionCommand(2027, 3)).toEqual({
      view: 'dayGridMonth',
      gotoDate: '2027-03-01',
    });
  });

  it('tracks selected month from focus date', () => {
    expect(isSelectedMonth(2027, 3, '2027-03-15')).toBe(true);
    expect(isSelectedMonth(2027, 2, '2027-03-15')).toBe(false);
  });
});