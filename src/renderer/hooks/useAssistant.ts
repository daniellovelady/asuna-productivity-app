import { useCallback, useEffect, useState } from 'react';
import type { AssistantQueueState } from '../../shared/activity/types';
import { activityService } from '../services/activityService';

export function useAssistant() {
  const [queueState, setQueueState] = useState<AssistantQueueState>({
    current: null,
    pendingCount: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadQueue = async () => {
      try {
        const initialState = await activityService.getState();
        if (isMounted && initialState) {
          // Queue state is event-driven; initial fetch happens via subscription.
        }
      } catch {
        // Assistant can remain in resting state when unavailable.
      }
    };

    void loadQueue();

    const unsubscribe = activityService.onAssistantQueueChanged((nextState) => {
      if (isMounted) {
        setQueueState(nextState);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const dismiss = useCallback(async (messageId: string) => {
    const nextState = await activityService.dismissAssistantMessage(messageId);
    setQueueState(nextState);
  }, []);

  return {
    currentMessage: queueState.current,
    pendingCount: queueState.pendingCount,
    dismiss,
  };
}
