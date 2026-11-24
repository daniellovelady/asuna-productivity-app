export type SpikeView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'multiMonthYear';

export type SpikeCalendarApi = {
  prev: () => void;
  next: () => void;
  today: () => void;
  changeView: (viewType: string) => void;
};

const MONTH_VIEW: SpikeView = 'dayGridMonth';

/** Previous interval — duration follows the active FullCalendar view. */
export function spikeToolbarPrevious(api: SpikeCalendarApi): void {
  api.prev();
}

/** Next interval — duration follows the active FullCalendar view. */
export function spikeToolbarNext(api: SpikeCalendarApi): void {
  api.next();
}

/** A.S.U.N.A. Today: always month view centered on the current calendar date. */
export function spikeToolbarToday(api: SpikeCalendarApi): void {
  api.changeView(MONTH_VIEW);
  api.today();
}

export function spikeToolbarChangeView(api: SpikeCalendarApi, view: SpikeView): void {
  api.changeView(view);
}

export function isSpikeView(value: string): value is SpikeView {
  return (
    value === 'dayGridMonth'
    || value === 'timeGridWeek'
    || value === 'timeGridDay'
    || value === 'multiMonthYear'
  );
}