import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FocusEngineState } from '../../shared/focus/types';
import { focusSessionService } from '../services/focusSession';
import { formatDurationMinutes, formatDurationMs } from '../utils/formatDuration';

const POLL_INTERVAL_MS = 1000;

function getDisplayTime(state: FocusEngineState | null): string {
  if (!state) {
    return formatDurationMinutes(25);
  }

  if (state.activeSession) {
    const remainingMs = Math.max(
      0,
      state.activeSession.targetDurationMs - state.activeSession.elapsedFocusMs,
    );

    return formatDurationMs(remainingMs);
  }

  return formatDurationMinutes(state.selectedDurationMinutes);
}

export function useFocusSession() {
  const [state, setState] = useState<FocusEngineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshState = useCallback(async () => {
    try {
      const nextState = await focusSessionService.getState();
      setState(nextState);
      setError(null);
    } catch (refreshError) {
      const message = refreshError instanceof Error
        ? refreshError.message
        : 'Failed to load focus session state.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!state?.activeSession) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshState();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshState, state?.activeSession]);

  const runAction = useCallback(async (action: () => Promise<FocusEngineState>) => {
    try {
      const nextState = await action();
      setState(nextState);
      setError(null);
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Focus session action failed.';
      setError(message);
    }
  }, []);

  const setDuration = useCallback(async (minutes: number) => {
    await runAction(() => focusSessionService.setDuration(minutes));
  }, [runAction]);

  const start = useCallback(async () => {
    await runAction(() => focusSessionService.start());
  }, [runAction]);

  const pause = useCallback(async () => {
    await runAction(() => focusSessionService.pause());
  }, [runAction]);

  const resume = useCallback(async () => {
    await runAction(() => focusSessionService.resume());
  }, [runAction]);

  const stop = useCallback(async () => {
    try {
      const result = await focusSessionService.stop();
      setState(result.state);
      setError(null);
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Failed to stop focus session.';
      setError(message);
    }
  }, []);

  const sessionStatus = state?.activeSession?.status ?? 'idle';
  const isIdle = sessionStatus === 'idle';
  const isRunning = sessionStatus === 'running';
  const isPaused = sessionStatus === 'paused';

  const displayTime = useMemo(() => getDisplayTime(state), [state]);

  return {
    state,
    error,
    isLoading,
    displayTime,
    selectedDurationMinutes: state?.selectedDurationMinutes ?? 25,
    isIdle,
    isRunning,
    isPaused,
    setDuration,
    start,
    pause,
    resume,
    stop,
  };
}
