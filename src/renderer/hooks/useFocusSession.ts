import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompletedFocusSession, FocusEngineState } from '../../shared/focus/types';
import { createCompletionPersistence } from '../services/completionPersistence';
import { focusSessionCloudService } from '../services/focusSessionCloudService';
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

export function useFocusSession(
  selectedTaskId: string | null,
  options?: {
    selectedTaskTitle?: string | null;
    onSessionSaved?: () => void | Promise<void>;
  },
) {
  const [state, setState] = useState<FocusEngineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);

  const sessionTaskIdRef = useRef<string | null>(null);
  const sessionTaskTitleRef = useRef<string | null>(null);
  const pendingCompletionTaskIdRef = useRef<string | null>(null);
  const pendingCompletionTaskTitleRef = useRef<string | null>(null);
  const persistenceRef = useRef(
    createCompletionPersistence({
      saveEndedSession: (completed, taskId, taskTitleSnapshot) =>
        focusSessionCloudService.saveEndedSession(completed, taskId, taskTitleSnapshot),
      acknowledgeCompletion: (sessionId) =>
        focusSessionService.acknowledgeCompletion(sessionId),
    }),
  );

  const syncPersistenceState = useCallback(() => {
    const persistenceState = persistenceRef.current.getState();
    setSaveError(persistenceState.saveError);
    setIsSavingCompletion(persistenceState.savingSessionId !== null);
  }, []);

  const persistPendingCompletion = useCallback(
    async (completed: CompletedFocusSession) => {
      if (pendingCompletionTaskIdRef.current === null && sessionTaskIdRef.current !== null) {
        pendingCompletionTaskIdRef.current = sessionTaskIdRef.current;
      }

      if (pendingCompletionTaskTitleRef.current === null && sessionTaskTitleRef.current !== null) {
        pendingCompletionTaskTitleRef.current = sessionTaskTitleRef.current;
      }

      const taskId = pendingCompletionTaskIdRef.current;
      const taskTitleSnapshot = pendingCompletionTaskTitleRef.current;
      const saved = await persistenceRef.current.persistPendingCompletion(
        completed,
        taskId,
        taskTitleSnapshot,
      );
      syncPersistenceState();

      if (saved) {
        sessionTaskIdRef.current = null;
        sessionTaskTitleRef.current = null;
        pendingCompletionTaskIdRef.current = null;
        pendingCompletionTaskTitleRef.current = null;
        const nextState = await focusSessionService.getState();
        setState(nextState);
        await options?.onSessionSaved?.();
      }
    },
    [syncPersistenceState, options?.onSessionSaved],
  );

  const handlePendingCompletion = useCallback(
    async (nextState: FocusEngineState) => {
      if (!nextState.pendingCompletion) {
        return;
      }

      if (pendingCompletionTaskIdRef.current === null) {
        pendingCompletionTaskIdRef.current = sessionTaskIdRef.current;
      }

      if (pendingCompletionTaskTitleRef.current === null) {
        pendingCompletionTaskTitleRef.current = sessionTaskTitleRef.current;
      }

      await persistPendingCompletion(nextState.pendingCompletion);
    },
    [persistPendingCompletion],
  );

  const refreshState = useCallback(async () => {
    try {
      const nextState = await focusSessionService.getState();
      setState(nextState);
      setError(null);
      await handlePendingCompletion(nextState);
    } catch (refreshError) {
      const message = refreshError instanceof Error
        ? refreshError.message
        : 'Failed to load focus session state.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [handlePendingCompletion]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!state?.activeSession && !state?.pendingCompletion) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshState();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshState, state?.activeSession, state?.pendingCompletion]);

  const runAction = useCallback(async (action: () => Promise<FocusEngineState>) => {
    try {
      const nextState = await action();
      setState(nextState);
      setError(null);
      await handlePendingCompletion(nextState);
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Focus session action failed.';
      setError(message);
    }
  }, [handlePendingCompletion]);

  const setDuration = useCallback(async (minutes: number) => {
    await runAction(() => focusSessionService.setDuration(minutes));
  }, [runAction]);

  const start = useCallback(async () => {
    try {
      const nextState = await focusSessionService.start();
      sessionTaskIdRef.current = selectedTaskId;
      sessionTaskTitleRef.current = selectedTaskId
        ? (options?.selectedTaskTitle ?? null)
        : null;
      pendingCompletionTaskIdRef.current = null;
      pendingCompletionTaskTitleRef.current = null;
      persistenceRef.current.clearSaveError();
      syncPersistenceState();
      setState(nextState);
      setError(null);
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Failed to start focus session.';
      setError(message);
    }
  }, [selectedTaskId, options?.selectedTaskTitle, syncPersistenceState]);

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
      await handlePendingCompletion(result.state);
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Failed to stop focus session.';
      setError(message);
    }
  }, [handlePendingCompletion]);

  const retrySave = useCallback(async () => {
    if (!state?.pendingCompletion) {
      return;
    }

    persistenceRef.current.clearSaveError();
    syncPersistenceState();
    await persistPendingCompletion(state.pendingCompletion);
  }, [persistPendingCompletion, state?.pendingCompletion, syncPersistenceState]);

  const sessionStatus = state?.activeSession?.status ?? 'idle';
  const isIdle = sessionStatus === 'idle';
  const isRunning = sessionStatus === 'running';
  const isPaused = sessionStatus === 'paused';
  const hasUnsavedCompletion = state?.pendingCompletion !== null;
  const displayTime = useMemo(() => getDisplayTime(state), [state]);

  return {
    state,
    error,
    saveError,
    isLoading,
    isSavingCompletion,
    displayTime,
    selectedDurationMinutes: state?.selectedDurationMinutes ?? 25,
    isIdle,
    isRunning,
    isPaused,
    hasUnsavedCompletion,
    setDuration,
    start,
    pause,
    resume,
    stop,
    retrySave,
  };
}
