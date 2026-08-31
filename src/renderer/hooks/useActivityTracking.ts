import { useCallback, useEffect, useState } from 'react';
import type { ActivityTrackingState } from '../../shared/activity/types';
import { activityCloudService } from '../services/activityCloudService';
import { activityService } from '../services/activityService';
import { preferencesService } from '../services/preferencesService';

function getStatusLabel(status: ActivityTrackingState['status']): string {
  switch (status) {
    case 'running':
      return 'Tracking On';
    case 'paused':
      return 'Tracking Paused';
    default:
      return 'Tracking Off';
  }
}

export function useActivityTracking(isAuthenticated: boolean, userId: string | null) {
  const [state, setState] = useState<ActivityTrackingState | null>(null);
  const [storedOptIn, setStoredOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || userId === null) {
      return undefined;
    }

    let isMounted = true;

    const initialize = async () => {
      try {
        await activityService.setAuthContext(userId);
        const [trackingState, optedIn] = await Promise.all([
          activityService.getState(),
          preferencesService.getTrackingEnabled(),
        ]);

        if (isMounted) {
          setState(trackingState);
          setStoredOptIn(optedIn);
          setError(null);
        }
      } catch (initializeError) {
        if (isMounted) {
          const message = initializeError instanceof Error
            ? initializeError.message
            : 'Failed to initialize activity tracking.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    const unsubscribeState = activityService.onStateChanged((nextState) => {
      if (isMounted) {
        setState(nextState);
      }
    });

    const unsubscribePersist = activityService.onPersistCandidate((payload) => {
      void activityCloudService.insertActivitySample(payload).catch(() => {
        // Durable offline queue is out of scope; drop failed general samples.
      });
    });

    return () => {
      isMounted = false;
      unsubscribeState();
      unsubscribePersist();
    };
  }, [isAuthenticated, userId]);

  const runAction = useCallback(async (action: () => Promise<ActivityTrackingState>) => {
    try {
      const nextState = await action();
      setState(nextState);
      setError(null);
      return nextState;
    } catch (actionError) {
      const message = actionError instanceof Error
        ? actionError.message
        : 'Activity tracking action failed.';
      setError(message);
      throw actionError;
    }
  }, []);

  const enable = useCallback(async () => {
    const nextState = await runAction(() => activityService.enable());
    await preferencesService.setTrackingEnabled(true);
    setStoredOptIn(true);
    return nextState;
  }, [runAction]);

  const disable = useCallback(async () => {
    const nextState = await runAction(() => activityService.disable());
    await preferencesService.setTrackingEnabled(false);
    setStoredOptIn(false);
    return nextState;
  }, [runAction]);

  const pause = useCallback(async () => {
    return runAction(() => activityService.pause());
  }, [runAction]);

  const resume = useCallback(async () => {
    return runAction(() => activityService.resume());
  }, [runAction]);

  const statusLabel = getStatusLabel(state?.status ?? 'disabled');

  const preferenceHint = storedOptIn && state?.status === 'disabled'
    ? 'You previously opted in — enable to resume activity tracking.'
    : 'Activity tracking is opt-in and off by default.';

  return {
    state,
    error,
    isLoading,
    statusLabel,
    preferenceHint,
    storedOptIn,
    enable,
    disable,
    pause,
    resume,
  };
}
