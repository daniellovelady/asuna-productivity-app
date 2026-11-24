import { describe, expect, it } from 'vitest';
import {
  formatPlainMonthLabel,
  monthAnchorFromFocusIso,
  plainDateFromIsoDate,
} from './calendarPlainDate';
import { Temporal } from 'temporal-polyfill';

describe('calendarPlainDate', () => {
  it('parses civil dates without shifting month', () => {
    const nov = plainDateFromIsoDate('2026-11-01');
    expect(nov?.month).toBe(11);
    expect(nov?.year).toBe(2026);
  });

  it('month anchor from focus preserves November', () => {
    const anchor = monthAnchorFromFocusIso('2026-11-15');
    expect(anchor.month).toBe(11);
    expect(anchor.year).toBe(2026);
    expect(anchor.day).toBe(1);
  });

  it('formats heading from PlainDate month', () => {
    const anchor = Temporal.PlainDate.from('2026-11-01');
    expect(formatPlainMonthLabel(anchor)).toBe('November 2026');
  });

  it('March stays March for 2026-03-01', () => {
    expect(monthAnchorFromFocusIso('2026-03-01').month).toBe(3);
  });

  it('January stays January for new year', () => {
    const anchor = monthAnchorFromFocusIso('2026-01-01');
    expect(anchor.month).toBe(1);
    expect(anchor.year).toBe(2026);
    expect(formatPlainMonthLabel(anchor)).toBe('January 2026');
  });
});