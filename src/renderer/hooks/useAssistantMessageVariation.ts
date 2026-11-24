import { useCallback, useEffect, useRef, useState } from 'react';
import { interpolateTemplate } from '../../shared/assistant/messageTemplates';
import type { AssistantMessage } from '../../shared/activity/types';
import { useAuth } from './useAuth';
import { usePreferences } from '../context/PreferencesProvider';

export function useAssistantMessageVariation(
  currentMessage: AssistantMessage | null,
) {
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const [displayText, setDisplayText] = useState<string | null>(null);
  const variationSequence = useRef(0);

  useEffect(() => {
    if (!currentMessage) {
      setDisplayText(null);
      variationSequence.current += 1;
      return;
    }

    setDisplayText(currentMessage.text);
    variationSequence.current += 1;

    if (
      !preferences.aiMessageVariationEnabled
      || !currentMessage.template
      || !currentMessage.triggerKey
      || !session?.access_token
    ) {
      return;
    }

    const messageId = currentMessage.id;
    const triggerKey = currentMessage.triggerKey;
    const template = currentMessage.template;
    const sequence = variationSequence.current;

    if (!triggerKey || !template) {
      return;
    }

    const runVariation = async () => {
      try {
        const response = await window.coachApi.varyMessage({
          accessToken: session.access_token,
          triggerKey,
          tone: preferences.reminderTone,
          template,
        });

        if (variationSequence.current !== sequence || currentMessage.id !== messageId) {
          return;
        }

        const interpolated = interpolateTemplate(
          response.template,
          currentMessage.facts ?? {},
        );
        setDisplayText(interpolated);
      } catch {
        // Keep deterministic text visible.
      }
    };

    void runVariation();
  }, [
    currentMessage,
    preferences.aiMessageVariationEnabled,
    preferences.reminderTone,
    session?.access_token,
  ]);

  const resetDisplay = useCallback(() => {
    setDisplayText(null);
  }, []);

  return {
    displayText: displayText ?? currentMessage?.text ?? null,
    resetDisplay,
  };
}
