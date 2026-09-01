import { FocusByDayList } from './FocusByDayList';
import { FocusByTaskList } from './FocusByTaskList';
import { TopDistractingAppsList } from './TopDistractingAppsList';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  formatAnalyticsMinutes,
  formatAnalyticsPercent,
} from '../utils/formatAnalyticsMinutes';

export function Statistics(): JSX.Element {
  const { snapshot, loadStatus, loadError, reloadAnalytics } = useAnalytics();

  return (
    <section className="statistics" aria-label="Statistics">
      <div className="panel-header">
        <h2 className="card-title">Statistics</h2>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void reloadAnalytics()}
          disabled={loadStatus === 'loading'}
        >
          Refresh
        </button>
      </div>

      {loadStatus === 'loading' ? (
        <p className="task-panel-message">Loading statistics…</p>
      ) : null}

      {loadStatus === 'error' ? (
        <div className="task-panel-error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="retry-button" onClick={() => void reloadAnalytics()}>
            Retry
          </button>
        </div>
      ) : null}

      {loadStatus === 'success' && snapshot ? (
        <>
          <div className="statistics-grid">
            <article className="card stat-card">
              <p className="stat-label">Focus Today</p>
              <p className="stat-value">{formatAnalyticsMinutes(snapshot.focusTodayMinutes)}</p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">Total Focus (7d)</p>
              <p className="stat-value">{formatAnalyticsMinutes(snapshot.totalFocusMinutes)}</p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">Completed Sessions</p>
              <p className="stat-value">{snapshot.completedSessions}</p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">Interruptions</p>
              <p className="stat-value">{snapshot.interruptionCount}</p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">Average Session</p>
              <p className="stat-value">
                {formatAnalyticsMinutes(snapshot.averageSessionMinutes)}
              </p>
            </article>
            <article className="card stat-card">
              <p className="stat-label">Break Compliance</p>
              <p className="stat-value">
                {formatAnalyticsPercent(snapshot.breakCompliancePercent)}
              </p>
            </article>
          </div>

          <p className="analytics-footnote">
            Break compliance is estimated from gaps between consecutive focus sessions, not direct
            break tracking.
          </p>

          <div className="analytics-panels">
            <FocusByDayList focusByDay={snapshot.focusByDay} />
            <FocusByTaskList focusByTask={snapshot.focusByTask} />
            <TopDistractingAppsList topDistractingApps={snapshot.topDistractingApps} />
          </div>
        </>
      ) : null}
    </section>
  );
}
