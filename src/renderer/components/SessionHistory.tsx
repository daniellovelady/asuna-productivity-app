import { useCallback, useEffect, useState } from 'react';
import { PaginationControls } from './PaginationControls';
import { ConfirmDialog } from './ConfirmDialog';
import { LinkTaskToSessionDialog } from './LinkTaskToSessionDialog';
import { useFocusHistory } from '../hooks/useFocusHistory';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTasks } from '../hooks/useTasks';
import { focusSessionCloudService } from '../services/focusSessionCloudService';
import { computeRollingSevenDayWindow } from '../utils/focusHistoryWindow';
import type { EndedSession } from '../types/focusSession';
import { clampPage, getPageCount, getPageSlice } from '../utils/pagination';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${rounded} min`;
}

function sessionDisplayLabel(session: EndedSession): string {
  if (session.contextType === 'calendar_event' && session.contextTitleSnapshot) {
    if (session.taskTitleSnapshot) {
      return `${session.contextTitleSnapshot} · Task: ${session.taskTitleSnapshot}`;
    }
    return session.contextTitleSnapshot;
  }

  return session.taskTitle ?? 'No task';
}

export function SessionHistory(): JSX.Element {
  const { sessions, loadStatus, loadError, reloadHistory } = useFocusHistory();
  const { reloadAnalytics } = useAnalytics();
  const {
    tasks,
    loadStatus: tasksLoadStatus,
    loadError: tasksLoadError,
    reloadTasks,
  } = useTasks();

  const [historyPage, setHistoryPage] = useState(1);
  const [linkSession, setLinkSession] = useState<EndedSession | null>(null);
  const [deleteSession, setDeleteSession] = useState<EndedSession | null>(null);
  const [bulkDeleteWindow, setBulkDeleteWindow] = useState<ReturnType<typeof computeRollingSevenDayWindow> | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState<number | null>(null);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const pageCount = getPageCount(sessions.length);
  const clampedPage = clampPage(historyPage, pageCount);
  const visibleSessions = getPageSlice(sessions, clampedPage);

  const refreshHistoryAndAnalytics = useCallback(async () => {
    await reloadHistory();
    await reloadAnalytics();
  }, [reloadHistory, reloadAnalytics]);

  useEffect(() => {
    if (historyPage !== clampedPage) {
      setHistoryPage(clampedPage);
    }
  }, [historyPage, clampedPage]);

  const handleBeginBulkDelete = async () => {
    setActionError(null);
    setBulkDeleteError(null);
    const window = computeRollingSevenDayWindow(new Date());

    try {
      const count = await focusSessionCloudService.countEndedSessionsInWindow(window);
      if (count === 0) {
        setBulkDeleteError('No sessions to delete in the last 7 days.');
        setBulkDeleteWindow(null);
        setBulkDeleteCount(null);
        return;
      }

      setBulkDeleteWindow(window);
      setBulkDeleteCount(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not count sessions.';
      setBulkDeleteError(message);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteWindow) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    try {
      await focusSessionCloudService.deleteEndedSessionsInWindow(bulkDeleteWindow);
      setBulkDeleteWindow(null);
      setBulkDeleteCount(null);
      await refreshHistoryAndAnalytics();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete sessions.';
      setActionError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteSession) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    try {
      await focusSessionCloudService.deleteEndedSession(deleteSession.id);
      setDeleteSession(null);
      await refreshHistoryAndAnalytics();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete session.';
      setActionError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="card session-history" aria-label="Session history">
      <div className="panel-header">
        <h2 className="card-title">Session History</h2>
        <div className="session-history-header-actions">
          <button
            type="button"
            className="refresh-button"
            onClick={() => void reloadHistory()}
            disabled={loadStatus === 'loading'}
          >
            Refresh
          </button>
          <button
            type="button"
            className="button-destructive-outline"
            onClick={() => void handleBeginBulkDelete()}
            disabled={loadStatus === 'loading' || isDeleting}
          >
            Delete Last 7 Days
          </button>
        </div>
      </div>

      {bulkDeleteError ? (
        <p className="task-panel-message" role="status">{bulkDeleteError}</p>
      ) : null}

      {actionError ? <p className="settings-error" role="alert">{actionError}</p> : null}

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
                  {sessionDisplayLabel(session)}
                </p>
                <p className="session-history-meta">
                  Target {session.targetDurationMinutes} min · Focus {formatMinutes(session.focusMinutes)}
                </p>
                <div className="session-history-actions">
                  <button
                    type="button"
                    onClick={() => setLinkSession(session)}
                  >
                    {session.taskId ? 'Change Task' : 'Link Task'}
                  </button>
                  <button
                    type="button"
                    className="button-destructive-outline"
                    onClick={() => setDeleteSession(session)}
                  >
                    Delete
                  </button>
                </div>
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

      {linkSession ? (
        <LinkTaskToSessionDialog
          session={linkSession}
          tasks={tasks}
          tasksLoadStatus={tasksLoadStatus}
          tasksLoadError={tasksLoadError}
          onClose={() => setLinkSession(null)}
          onLinked={() => void refreshHistoryAndAnalytics()}
          onRetryLoadTasks={() => void reloadTasks()}
        />
      ) : null}

      {deleteSession ? (
        <ConfirmDialog
          title="Delete this focus session?"
          message="This permanently removes this session from your history and statistics."
          confirmLabel="Delete"
          destructive
          isBusy={isDeleting}
          onCancel={() => setDeleteSession(null)}
          onConfirm={() => void handleConfirmSingleDelete()}
        />
      ) : null}

      {bulkDeleteWindow && bulkDeleteCount !== null ? (
        <ConfirmDialog
          title="Delete session history from the last 7 days?"
          message={`This will permanently remove ${bulkDeleteCount} focus session${bulkDeleteCount === 1 ? '' : 's'} and update your statistics.`}
          confirmLabel={`Delete ${bulkDeleteCount} Session${bulkDeleteCount === 1 ? '' : 's'}`}
          destructive
          isBusy={isDeleting}
          onCancel={() => {
            setBulkDeleteWindow(null);
            setBulkDeleteCount(null);
          }}
          onConfirm={() => void handleConfirmBulkDelete()}
        />
      ) : null}
    </section>
  );
}
