import type { AnalyticsFocusByDay } from '../types/analytics';
import { computeBarWidthPercent } from '../utils/barWidth';
import { formatAnalyticsMinutes } from '../utils/formatAnalyticsMinutes';

function formatDayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function FocusByDayList({ focusByDay }: { focusByDay: AnalyticsFocusByDay[] }): JSX.Element {
  const maxFocusMinutes = focusByDay.reduce(
    (max, day) => Math.max(max, day.focusMinutes),
    0,
  );

  return (
    <section className="analytics-subsection" aria-label="Focus by day">
      <h3 className="analytics-subsection-title">Focus by Day</h3>
      <ul className="analytics-day-list">
        {focusByDay.map((day) => (
          <li key={day.date} className="analytics-day-item">
            <div className="analytics-day-row">
              <span className="analytics-day-label">{formatDayLabel(day.date)}</span>
              <span className="analytics-day-value">{formatAnalyticsMinutes(day.focusMinutes)}</span>
            </div>
            <div className="analytics-bar-track" aria-hidden="true">
              <div
                className="analytics-bar-fill"
                style={{ width: `${computeBarWidthPercent(maxFocusMinutes, day.focusMinutes)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
