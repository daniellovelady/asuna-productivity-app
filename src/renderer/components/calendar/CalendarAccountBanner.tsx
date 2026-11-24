import type { CalendarAccount } from '../../../shared/calendar/types';

type CalendarAccountBannerProps = {
  account: CalendarAccount | undefined;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  onConnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
  showStaleCacheHint: boolean;
  lastSyncedAt: string | null;
};

export function CalendarAccountBanner({
  account,
  isLoading,
  isSyncing,
  error,
  onConnect,
  onReconnect,
  onRefresh,
  showStaleCacheHint,
  lastSyncedAt,
}: CalendarAccountBannerProps): JSX.Element | null {
  if (isLoading) {
    return <p className="task-panel-message">Loading calendar…</p>;
  }

  const needsReauth = account?.status === 'reauth_required';

  return (
    <div className="calendar-account-banner" role="status">
      {error ? <p className="settings-error" role="alert">{error}</p> : null}

      {account?.status === 'disconnected' ? (
        <div className="agenda-connect-panel">
          <p>Connect Google Calendar to mirror events in A.S.U.N.A. Local schedule blocks work without Google.</p>
          <button type="button" onClick={onConnect}>
            Connect Google Calendar
          </button>
        </div>
      ) : null}

      {account?.status === 'connecting' ? (
        <p className="task-panel-message">Connecting to Google Calendar…</p>
      ) : null}

      {account?.status === 'connected' ? (
        <p className="agenda-connected-label">
          Google Calendar connected
          {lastSyncedAt ? ` · Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}
        </p>
      ) : null}

      {needsReauth ? (
        <div className="task-panel-error" role="alert">
          <p>{account?.syncError ?? 'Google Calendar connection expired. Reconnect to continue syncing.'}</p>
          <button type="button" className="retry-button" onClick={onReconnect}>
            Reconnect Google Calendar
          </button>
        </div>
      ) : null}

      {showStaleCacheHint ? (
        <p className="agenda-stale-label" role="status">
          Showing previously synced Google events
          {lastSyncedAt
            ? ` (last synced ${new Date(lastSyncedAt).toLocaleString()})`
            : ' (may be out of date)'}.
        </p>
      ) : null}

      {account?.syncError && !needsReauth ? (
        <div className="task-panel-error" role="alert">
          <p>{account.syncError}</p>
          <button type="button" className="retry-button" onClick={onRefresh} disabled={isSyncing}>
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}