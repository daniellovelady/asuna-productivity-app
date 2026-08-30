import { useEffect, useState } from 'react';
import { PaginationControls } from './PaginationControls';
import { useFocusHistory } from '../hooks/useFocusHistory';
import { clampPage, getPageCount, getPageSlice } from '../utils/pagination';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

export function SessionHistory(): JSX.Element {
  const { sessions, loadStatus, loadError, reloadHistory } = useFocusHistory();
  const [historyPage, setHistoryPage] = useState(1);

  const pageCount = getPageCount(sessions.length);
  const clampedPage = clampPage(historyPage, pageCount);
  const visibleSessions = getPageSlice(sessions, clampedPage);

  useEffect(() => {
    if (historyPage !== clampedPage) {
      setHistoryPage(clampedPage);
    }
  }, [historyPage, clampedPage]);

  return (
    <section className="card session-history" aria-label="Session history">
      <div className="panel-header">
        <h2 className="card-title">Session History</h2>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void reloadHistory()}
          disabled={loadStatus === 'loading'}
        >
          Refresh
        </button>
      </div>

      {loadStatus === 'loading' ? (
        <p className="task-panel-message">Loading history…</p>
      ) : null}

      {loadStatus === 'error' ? (
        <div className="task-panel-error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="retry-button" onClick={() => void reloadHistory()}>
            Retry
          </button>
        </div>
      ) : null}

      {loadStatus === 'success' && sessions.length === 0 ? (
        <p className="task-panel-message">No ended sessions yet.</p>
      ) : null}

      {loadStatus === 'success' && sessions.length > 0 ? (
        <>
          <ul className="session-history-list">
            {visibleSessions.map((session) => (
              <li key={session.id} className="session-history-item">
                <div className="session-history-row">
                  <span className="session-history-date">{formatDateTime(session.endedAt)}</span>
                  <span className={`session-status session-status-${session.status}`}>
                    {session.status}
                  </span>
                </div>
                <p className="session-history-task">
                  {session.taskTitle ?? 'No task'}
                </p>
                <p className="session-history-meta">
                  Target {session.targetDurationMinutes} min · Focus {formatMinutes(session.focusMinutes)}
                </p>
              </li>
            ))}
          </ul>
          <PaginationControls
            currentPage={clampedPage}
            pageCount={pageCount}
            onPageChange={setHistoryPage}
          />
        </>
      ) : null}
    </section>
  );
}
