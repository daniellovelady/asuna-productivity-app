import { Temporal } from 'temporal-polyfill';
import { MONTH_LABELS, parseYearMonthFromIsoDate } from './calendarNavigatorLogic';

export function plainDateFromIsoDate(iso: string): Temporal.PlainDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }

  try {
    return Temporal.PlainDate.from(iso);
  } catch {
    return null;
  }
}

export function monthAnchorFromFocusIso(focusDateIso: string): Temporal.PlainDate {
  const parsed = parseYearMonthFromIsoDate(focusDateIso);
  if (!parsed) {
    return Temporal.Now.plainDateISO();
  }

  return Temporal.PlainDate.from({ year: parsed.year, month: parsed.month, day: 1 });
}

export function formatPlainMonthLabel(anchorMonth: Temporal.PlainDate): string {
  return `${MONTH_LABELS[anchorMonth.month - 1]} ${anchorMonth.year}`;
}

/** Civil "today" in the profile/calendar IANA timezone (not parsed from a date-only UTC string). */
export function todayPlainDateIso(timeZone: string): string {
  return Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString();
}

/**
 * Map a FullCalendar view anchor instant to a civil date in the calendar timezone.
 * Do not use Date.toISOString().slice(0, 10).
 */
export function viewInstantToPlainDateIso(viewDate: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(viewDate);
}