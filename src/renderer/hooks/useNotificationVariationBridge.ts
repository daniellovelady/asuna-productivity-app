import { useEffect } from 'react';
import type { VariationRequestPayload } from '../../shared/notifications/types';
import { useAuth } from './useAuth';
import { usePreferences } from '../context/PreferencesProvider';

declare global {
  interface Window {
    notificationBridgeApi?: {
      onVariationRequest: (callback: (payload: VariationRequestPayload) => void) => () => void;
      applyVariation: (payload: {
        notificationId: string;
        variationGeneration: number;
        variedTemplate: string;
      }) => Promise<{ applied: boolean }>;
    };
  }
}

export function useNotificationVariationBridge(): void {
  const { session } = useAuth();
  const { preferences } = usePreferences();

  useEffect(() => {
    const bridge = window.notificationBridgeApi;
    if (!bridge) {
      return;
    }

    const unsubscribe = bridge.onVariationRequest(async (payload) => {
      if (
        !preferences.aiMessageVariationEnabled
        || !session?.access_token
      ) {
        return;
      }

      try {
        const response = await window.coachApi.varyMessage({
          accessToken: session.access_token,
          triggerKey: payload.triggerKey,
          tone: payload.tone,
          template: payload.baseTemplate,
        });

        await bridge.applyVariation({
          notificationId: payload.notificationId,
          variationGeneration: payload.variationGeneration,
          variedTemplate: response.template,
        });
      } catch {
        // Keep deterministic wording.
      }
    });

    return unsubscribe;
  }, [
    preferences.aiMessageVariationEnabled,
    preferences.reminderTone,
    session?.access_token,
  ]);
}
