import { useEffect, useMemo, useState } from 'react';
import {
  formatPlainMonthLabel,
  monthAnchorFromFocusIso,
  todayPlainDateIso,
} from './calendarPlainDate';
import { buildMiniMonthGrid } from './miniMonthGrid';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type MiniMonthNavigatorProps = {
  timeZone: string;
  focusDateIso: string;
  selectedDate: string;
  onSelectDate: (dateIso: string) => void;
  onOpenYearMonthGrid: () => void;
};

export function MiniMonthNavigator({
  timeZone,
  focusDateIso,
  selectedDate,
  onSelectDate,
  onOpenYearMonthGrid,
}: MiniMonthNavigatorProps): JSX.Element {
  const [anchorMonth, setAnchorMonth] = useState(() => monthAnchorFromFocusIso(focusDateIso));

  useEffect(() => {
    setAnchorMonth(monthAnchorFromFocusIso(focusDateIso));
  }, [focusDateIso]);

  const todayIso = useMemo(() => todayPlainDateIso(timeZone), [timeZone]);

  const cells = useMemo(
    () => buildMiniMonthGrid(anchorMonth, todayIso),
    [anchorMonth, todayIso],
  );

  const monthLabel = formatPlainMonthLabel(anchorMonth);

  const shiftMonth = (delta: number) => {
    setAnchorMonth((current) => current.add({ months: delta }).with({ day: 1 }));
  };

  return (
    <section className="calendar-mini-month" aria-label="Mini month navigator">
      <div className="calendar-mini-month__header">
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <button
          type="button"
          className="calendar-mini-month__month-button"
          aria-label="Browse months by year"
          onClick={onOpenYearMonthGrid}
        >
          {monthLabel}
        </button>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
          ›
        </button>
      </div>
      <div className="calendar-mini-month__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="calendar-mini-month__grid" role="grid">
        {cells.map((cell) => (
          <button
            key={cell.date}
            type="button"
            role="gridcell"
            className={[
              'calendar-mini-month__day',
              !cell.inCurrentMonth ? 'calendar-mini-month__day--muted' : '',
              cell.isToday ? 'calendar-mini-month__day--today' : '',
              selectedDate === cell.date ? 'calendar-mini-month__day--selected' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectDate(cell.date)}
          >
            {cell.label}
          </button>
        ))}
      </div>
    </section>
  );
}