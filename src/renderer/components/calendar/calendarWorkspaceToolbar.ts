export type CalendarWorkspaceView =
  | 'dayGridMonth'
  | 'timeGridWeek'
  | 'timeGridDay'
  | 'multiMonthYear';

export type CalendarWorkspaceApi = {
  prev: () => void;
  next: () => void;
  today: () => void;
  changeView: (viewType: string, date?: Date | string) => void;
  gotoDate: (date: Date | string) => void;
  view: { type: string; title: string; currentStart: Date };
};

const MONTH_VIEW: CalendarWorkspaceView = 'dayGridMonth';

export function calendarToolbarPrevious(api: CalendarWorkspaceApi): void {
  api.prev();
}

export function calendarToolbarNext(api: CalendarWorkspaceApi): void {
  api.next();
}

export function calendarToolbarToday(api: CalendarWorkspaceApi): void {
  api.changeView(MONTH_VIEW);
  api.today();
}

export function calendarToolbarChangeView(
  api: CalendarWorkspaceApi,
  view: CalendarWorkspaceView,
): void {
  api.changeView(view);
}

export function isCalendarWorkspaceView(value: string): value is CalendarWorkspaceView {
  return (
    value === 'dayGridMonth'
    || value === 'timeGridWeek'
    || value === 'timeGridDay'
    || value === 'multiMonthYear'
  );
}