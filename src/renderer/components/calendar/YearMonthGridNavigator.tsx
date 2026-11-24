import {
  ariaLabelForMonth,
  buildMonthSelectionCommand,
  isSelectedMonth,
  MONTH_LABELS,
  shiftNavigatorYear,
} from './calendarNavigatorLogic';

type YearMonthGridNavigatorProps = {
  displayYear: number;
  focusDateIso: string;
  onYearChange: (year: number) => void;
  onSelectMonth: (command: ReturnType<typeof buildMonthSelectionCommand>) => void;
  onBackToMiniMonth: () => void;
};

export function YearMonthGridNavigator({
  displayYear,
  focusDateIso,
  onYearChange,
  onSelectMonth,
  onBackToMiniMonth,
}: YearMonthGridNavigatorProps): JSX.Element {
  return (
    <section className="calendar-year-month-grid" aria-label="Month selection">
      <div className="calendar-year-month-grid__toolbar">
        <button type="button" onClick={onBackToMiniMonth}>
          ← Dates
        </button>
      </div>
      <div className="calendar-year-month-grid__year-row">
        <button
          type="button"
          aria-label={`Previous year (${displayYear - 1})`}
          onClick={() => onYearChange(shiftNavigatorYear(displayYear, -1))}
        >
          ‹
        </button>
        <span className="calendar-year-month-grid__year" aria-live="polite">
          {displayYear}
        </span>
        <button
          type="button"
          aria-label={`Next year (${displayYear + 1})`}
          onClick={() => onYearChange(shiftNavigatorYear(displayYear, 1))}
        >
          ›
        </button>
      </div>
      <div className="calendar-year-month-grid__months" role="list">
        {MONTH_LABELS.map((label, monthIndex) => {
          const monthNumber = monthIndex + 1;
          const selected = isSelectedMonth(displayYear, monthNumber, focusDateIso);
          return (
            <button
              key={label}
              type="button"
              role="listitem"
              className={selected ? 'calendar-year-month-grid__month--selected' : undefined}
              aria-label={ariaLabelForMonth(displayYear, monthIndex)}
              aria-current={selected ? 'date' : undefined}
              onClick={() => onSelectMonth(buildMonthSelectionCommand(displayYear, monthNumber))}
            >
              <span className="calendar-year-month-grid__month-label">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}