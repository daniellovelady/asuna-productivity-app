export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type MonthSelectCommand = {
  view: 'dayGridMonth';
  gotoDate: string;
};

export function parseYearMonthFromIsoDate(
  dateIso: string,
): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function resolveNavigatorYear(dateIso: string, fallbackYear: number): number {
  return parseYearMonthFromIsoDate(dateIso)?.year ?? fallbackYear;
}

export function shiftNavigatorYear(year: number, delta: number): number {
  return year + delta;
}

export function buildMonthSelectionCommand(year: number, month: number): MonthSelectCommand {
  const monthPadded = String(month).padStart(2, '0');
  return {
    view: 'dayGridMonth',
    gotoDate: `${year}-${monthPadded}-01`,
  };
}

export function isSelectedMonth(
  year: number,
  month: number,
  focusDateIso: string,
): boolean {
  const parsed = parseYearMonthFromIsoDate(focusDateIso);
  return parsed?.year === year && parsed?.month === month;
}

export function ariaLabelForMonth(year: number, monthIndex: number): string {
  return `${MONTH_LABELS[monthIndex]} ${year}`;
}