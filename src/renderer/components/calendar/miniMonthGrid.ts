import { Temporal } from 'temporal-polyfill';

export type MiniMonthCell = {
  date: string;
  label: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

function sundayStartOffset(firstOfMonth: Temporal.PlainDate): number {
  return firstOfMonth.dayOfWeek % 7;
}

export function buildMiniMonthGrid(
  anchorMonth: Temporal.PlainDate,
  todayIso: string,
): MiniMonthCell[] {
  const firstOfMonth = anchorMonth.with({ day: 1 });
  const gridStart = firstOfMonth.subtract({ days: sundayStartOffset(firstOfMonth) });
  const cells: MiniMonthCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const cell = gridStart.add({ days: i });
    const date = cell.toString();
    cells.push({
      date,
      label: String(cell.day),
      inCurrentMonth: cell.month === anchorMonth.month && cell.year === anchorMonth.year,
      isToday: date === todayIso,
    });
  }

  return cells;
}