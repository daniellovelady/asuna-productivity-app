import { useState } from 'react';
import { CalendarEventRow } from './CalendarEventRow';
import { LinkTaskToEventDialog } from './LinkTaskToEventDialog';
import { useAgenda } from '../hooks/useAgenda';
import { useTasks } from '../hooks/useTasks';
import type { CalendarEvent } from '../../shared/calendar/types';

export function AgendaView(): JSX.Element {
  const agenda = useAgenda();
  const { tasks, loadStatus: tasksLoadStatus, loadError: tasksLoadError, reloadTasks } = useTasks();
  const [linkEvent, setLinkEvent] = useState<CalendarEvent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const account = agenda.state?.account;
  const snapshot = agenda.state?.agenda;
  const isSyncing = agenda.state?.syncPhase === 'syncing';
  const needsReauth = account?.status === 'reauth_required';
  const showAgendaSnapshot = Boolean(
    snapshot && (account?.status === 'connected' || needsReauth),
  );

  const handleStartFocus = async (event: CalendarEvent) => {
    setActionError(null);
    try {
      if (event.linkedTaskId) {
        const linkedTask = tasks.find((task) => task.id === event.linkedTaskId);
        if (linkedTask) {
          await calendarBridgeStartWithLink(event, linkedTask.id, linkedTask.title);
          return;
        }
      }
      await agenda.startFocusFromEvent(event.calendarId, event.externalEventId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start focus.';
      setActionError(message);
    }
  };

  return (
    <section className="agenda-view" aria-label="Agenda">
      <div className="panel-header">
        <h2 className="settings-title">Agenda</h2>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void agenda.refresh()}
          disabled={isSyncing || account?.status === 'disconnected' || needsReauth}
        >
          Refresh
        </button>
      </div>

      {agenda.error ? <p className="settings-error" role="alert">{agenda.error}</p> : null}
      {actionError ? <p className="settings-error" role="alert">{actionError}</p> : null}

      {agenda.isLoading ? (
        <p className="task-panel-message">Loading agenda…</p>
      ) : null}

      {!agenda.isLoading && account?.status === 'disconnected' ? (
        <div className="agenda-connect-panel">
          <p>Connect Google Calendar to see today&apos;s schedule in A.S.U.N.A.</p>
          <button type="button" onClick={() => void agenda.connect()}>
            Connect Google Calendar
          </button>
        </div>
      ) : null}

      {!agenda.isLoading && account?.status === 'connecting' ? (
        <p className="task-panel-message">Connecting to Google Calendar…</p>
      ) : null}

      {!agenda.isLoading && account?.status === 'connected' ? (
        <p className="agenda-connected-label">
          Google Calendar connected
          {account.lastSyncedAt ? ` · Last synced ${new Date(account.lastSyncedAt).toLocaleString()}` : ''}
        </p>
      ) : null}

      {isSyncing ? <p className="task-panel-message">Syncing calendar…</p> : null}

      {!agenda.isLoading && needsReauth ? (
        <div className="task-panel-error" role="alert">
          <p>{account?.syncError ?? 'Google Calendar connection expired. Reconnect Google Calendar to continue syncing.'}</p>
          <button type="button" className="retry-button" onClick={() => void agenda.connect()}>
            Reconnect Google Calendar
          </button>
        </div>
      ) : null}

      {needsReauth && showAgendaSnapshot ? (
        <p className="agenda-stale-label" role="status">
          Showing previously synced schedule
          {account?.lastSyncedAt
            ? ` (last synced ${new Date(account.lastSyncedAt).toLocaleString()})`
            : ' (may be out of date)'}
          .
        </p>
      ) : null}

      {account?.syncError && !needsReauth ? (
        <div className="task-panel-error" role="alert">
          <p>{account.syncError}</p>
          <button type="button" className="retry-button" onClick={() => void agenda.refresh()}>
            Retry
          </button>
        </div>
      ) : null}

      {showAgendaSnapshot ? (
        <>
          <section className="agenda-section">
            <h3>Today&apos;s Agenda</h3>
            {snapshot.today.length === 0 ? (
              <p className="task-panel-message">No events scheduled for today.</p>
            ) : (
              snapshot.today.map((event) => (
                <CalendarEventRow
                  key={`${event.calendarId}:${event.externalEventId}`}
                  event={event}
                  disabled={isSyncing}
                  onStartFocus={() => void handleStartFocus(event)}
                  onLinkTask={() => setLinkEvent(event)}
                />
              ))
            )}
          </section>

          <section className="agenda-section">
            <h3>Upcoming</h3>
            {snapshot.upcoming.length === 0 ? (
              <p className="task-panel-message">No upcoming events in the sync window.</p>
            ) : (
              snapshot.upcoming.map((event) => (
                <CalendarEventRow
                  key={`${event.calendarId}:${event.externalEventId}`}
                  event={event}
                  disabled={isSyncing}
                  onStartFocus={() => void handleStartFocus(event)}
                  onLinkTask={() => setLinkEvent(event)}
                />
              ))
            )}
          </section>
        </>
      ) : null}

      {linkEvent ? (
        <LinkTaskToEventDialog
          event={linkEvent}
          tasks={tasks}
          tasksLoadStatus={tasksLoadStatus}
          tasksLoadError={tasksLoadError}
          onClose={() => setLinkEvent(null)}
          onLinked={() => void agenda.reload()}
          onRetryLoadTasks={() => void reloadTasks()}
        />
      ) : null}
    </section>
  );
}

async function calendarBridgeStartWithLink(
  event: CalendarEvent,
  linkedTaskId: string,
  linkedTaskTitleSnapshot: string,
): Promise<void> {
  const { calendarBridgeService } = await import('../services/calendarBridgeService');
  await calendarBridgeService.startFocusFromEventWithLink(
    event.calendarId,
    event.externalEventId,
    linkedTaskId,
    linkedTaskTitleSnapshot,
  );
}
