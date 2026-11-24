import type { CalendarWorkspaceView } from './calendarWorkspaceToolbar';

const VIEWS: Array<{ id: CalendarWorkspaceView; label: string }> = [
  { id: 'multiMonthYear', label: 'Year' },
  { id: 'dayGridMonth', label: 'Month' },
  { id: 'timeGridWeek', label: 'Week' },
  { id: 'timeGridDay', label: 'Day' },
];

type CalendarToolbarProps = {
  title: string;
  activeView: CalendarWorkspaceView;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView: (view: CalendarWorkspaceView) => void;
};

export function CalendarToolbar({
  title,
  activeView,
  onPrevious,
  onNext,
  onToday,
  onChangeView,
}: CalendarToolbarProps): JSX.Element {
  return (
    <div className="calendar-toolbar" role="toolbar" aria-label="Calendar navigation">
      <div className="calendar-toolbar__nav">
        <button type="button" aria-label="Previous" onClick={onPrevious}>
          Prev
        </button>
        <button type="button" aria-label="Today" onClick={onToday}>
          Today
        </button>
        <button type="button" aria-label="Next" onClick={onNext}>
          Next
        </button>
      </div>
      <div className="calendar-toolbar__title" aria-live="polite">{title}</div>
      <div className="calendar-toolbar__views" role="group" aria-label="Calendar view">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={activeView === view.id}
            className={activeView === view.id ? 'calendar-toolbar__view--active' : undefined}
            onClick={() => onChangeView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}