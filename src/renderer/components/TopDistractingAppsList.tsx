import type { AnalyticsDistractingApp } from '../types/analytics';
import { formatAnalyticsMinutes } from '../utils/formatAnalyticsMinutes';

export function TopDistractingAppsList({
  topDistractingApps,
}: {
  topDistractingApps: AnalyticsDistractingApp[];
}): JSX.Element {
  return (
    <section className="analytics-subsection" aria-label="Top distracting applications">
      <h3 className="analytics-subsection-title">Top Distracting Applications</h3>
      <p className="analytics-footnote">
        Estimated from sampled foreground activity, not exact application time.
      </p>
      {topDistractingApps.length === 0 ? (
        <p className="task-panel-message">No distracting apps recorded.</p>
      ) : (
        <ul className="analytics-ranked-list">
          {topDistractingApps.map((entry) => (
            <li key={entry.applicationName} className="analytics-ranked-item">
              <span className="analytics-ranked-label">{entry.applicationName}</span>
              <span className="analytics-ranked-value">
                {formatAnalyticsMinutes(entry.estimatedMinutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
