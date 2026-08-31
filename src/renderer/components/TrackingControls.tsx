import type { ActivityTrackingState } from '../../shared/activity/types';

type TrackingControlsProps = {
  statusLabel: string;
  preferenceHint: string;
  trackingState: ActivityTrackingState | null;
  error: string | null;
  isLoading: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onPause: () => void;
  onResume: () => void;
};

export function TrackingControls({
  statusLabel,
  preferenceHint,
  trackingState,
  error,
  isLoading,
  onEnable,
  onDisable,
  onPause,
  onResume,
}: TrackingControlsProps): JSX.Element {
  const status = trackingState?.status ?? 'disabled';

  return (
    <section className="tracking-controls card" aria-label="Activity tracking controls">
      <h2 className="card-title">Activity Tracking</h2>
      <p className="tracking-status" aria-live="polite">{statusLabel}</p>
      <p className="tracking-hint">{preferenceHint}</p>
      {trackingState?.identity && status === 'running' ? (
        <p className="tracking-activity">
          Current activity: {trackingState.identity}
          {trackingState.isIdle ? ' (idle)' : ''}
        </p>
      ) : null}
      {error ? <p className="tracking-error">{error}</p> : null}
      <div className="tracking-actions">
        {status === 'disabled' ? (
          <button type="button" className="task-button" disabled={isLoading} onClick={onEnable}>
            Enable Tracking
          </button>
        ) : null}
        {status === 'running' ? (
          <>
            <button type="button" className="task-button-secondary task-button" disabled={isLoading} onClick={onPause}>
              Pause Tracking
            </button>
            <button type="button" className="task-button-secondary task-button" disabled={isLoading} onClick={onDisable}>
              Disable Tracking
            </button>
          </>
        ) : null}
        {status === 'paused' ? (
          <>
            <button type="button" className="task-button" disabled={isLoading} onClick={onResume}>
              Resume Tracking
            </button>
            <button type="button" className="task-button-secondary task-button" disabled={isLoading} onClick={onDisable}>
              Disable Tracking
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
