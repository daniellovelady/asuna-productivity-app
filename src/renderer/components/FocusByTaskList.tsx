import type { AnalyticsFocusByTask } from '../types/analytics';
import { formatAnalyticsMinutes } from '../utils/formatAnalyticsMinutes';

export function FocusByTaskList({ focusByTask }: { focusByTask: AnalyticsFocusByTask[] }): JSX.Element {
  return (
    <section className="analytics-subsection" aria-label="Focus by context">
      <h3 className="analytics-subsection-title">Focus by Context</h3>
      {focusByTask.length === 0 ? (
        <p className="task-panel-message">No focus time recorded in this window.</p>
      ) : (
        <ul className="analytics-ranked-list">
          {focusByTask.map((entry) => (
            <li
              key={`${entry.contextType}:${entry.taskLabel}`}
              className="analytics-ranked-item"
            >
              <span className="analytics-ranked-label">{entry.taskLabel}</span>
              <span className="analytics-ranked-value">
                {formatAnalyticsMinutes(entry.focusMinutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
