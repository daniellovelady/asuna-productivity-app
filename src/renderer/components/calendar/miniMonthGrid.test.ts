import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { buildMiniMonthGrid } from './miniMonthGrid';
import { formatPlainMonthLabel } from './calendarPlainDate';

describe('miniMonthGrid', () => {
  const nov2026 = Temporal.PlainDate.from('2026-11-01');

  it('heading matches grid month for November 2026', () => {
    const cells = buildMiniMonthGrid(nov2026, '2026-11-23');
  expect(formatPlainMonthLabel(nov2026)).toBe('November 2026');
    const nov1 = cells.find((cell) => cell.date === '2026-11-01');
    expect(nov1?.inCurrentMonth).toBe(true);
    expect(nov1?.label).toBe('1');
  });

  it('places 2026-11-01 on Sunday column (first row)', () => {
    const cells = buildMiniMonthGrid(nov2026, '2026-11-01');
    expect(cells[0].date).toBe('2026-11-01');
  });

  it('next and previous month anchors', () => {
    const dec = nov2026.add({ months: 1 });
    const oct = nov2026.subtract({ months: 1 });
    expect(formatPlainMonthLabel(dec)).toBe('December 2026');
    expect(formatPlainMonthLabel(oct)).toBe('October 2026');
  });

  it('October 2026 grid uses month 10', () => {
    const oct = Temporal.PlainDate.from('2026-10-01');
    const cells = buildMiniMonthGrid(oct, '2026-10-15');
    const oct1 = cells.find((cell) => cell.date === '2026-10-01');
    expect(oct1?.inCurrentMonth).toBe(true);
    expect(formatPlainMonthLabel(oct)).toBe('October 2026');
  });
});