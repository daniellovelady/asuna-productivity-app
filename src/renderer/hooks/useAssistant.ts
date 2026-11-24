import { useCallback, useEffect, useState } from 'react';
import type { AssistantQueueState } from '../../shared/activity/types';
import type { NotificationAction } from '../../shared/notifications/types';
import { activityService } from '../services/activityService';
import { notificationActionService } from '../services/notificationActionService';

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

  const executeAction = useCallback(async (messageId: string, action: NotificationAction) => {
    const result = await notificationActionService.executeAction(messageId, action);
    setQueueState(result.queueState);
    if (!result.ok) {
      throw new Error(result.reason ?? 'Action could not be completed.');
    }
  }, []);

  return {
    currentMessage: queueState.current,
    pendingCount: queueState.pendingCount,
    executeAction,
  };
}
