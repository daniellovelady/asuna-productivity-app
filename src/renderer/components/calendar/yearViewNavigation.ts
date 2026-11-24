import type { CalendarWorkspaceApi, CalendarWorkspaceView } from './calendarWorkspaceToolbar';

export function resolveYearViewChangeTargetDate(
  viewedYear: number,
  currentYear: number,
  todayIso: string,
): string {
  if (viewedYear === currentYear) {
    return todayIso;
  }
  return `${viewedYear}-01-01`;
}

export function viewedYearInTimeZone(currentStart: Date, timeZone: string): number {
  const yearText = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(currentStart);
  return Number(yearText);
}

export function todayIsoInTimeZone(timeZone: string, referenceNowMs = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(referenceNowMs));
}

export function calendarToolbarChangeViewFromYear(
  api: CalendarWorkspaceApi,
  targetView: CalendarWorkspaceView,
  timeZone: string,
  referenceNowMs = Date.now(),
): void {
  const todayIso = todayIsoInTimeZone(timeZone, referenceNowMs);
  const currentYear = Number(todayIso.slice(0, 4));
  const viewedYear = viewedYearInTimeZone(api.view.currentStart, timeZone);
  const targetDate = resolveYearViewChangeTargetDate(viewedYear, currentYear, todayIso);
  api.changeView(targetView, targetDate);
}