import { useCallback, useEffect, useState } from 'react';
import type { BreakEngineState } from '../../shared/focus/breakTypes';
import { breakSessionService } from '../services/breakSessionService';

const POLL_INTERVAL_MS = 1000;

export function useBreakSession() {
  const [state, setState] = useState<BreakEngineState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextState = await breakSessionService.getState();
      setState(nextState);
      setError(null);
      return nextState;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load break state.');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const endEarly = useCallback(async () => {
    try {
      const nextState = await breakSessionService.endEarly();
      setState(nextState);
      setError(null);
      return nextState;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not end break.';
      setError(message);
      throw caught;
    }
  }, []);

  const isBreakActive = state?.activeBreak !== null;
  const remainingMs = state?.activeBreak?.remainingMs ?? 0;

  return {
    state,
    error,
    isBreakActive,
    remainingMs,
    refresh,
    endEarly,
  };
}
