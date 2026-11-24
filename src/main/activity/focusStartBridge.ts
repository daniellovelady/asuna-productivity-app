import type { FocusStartIntent } from '../../shared/focus/focusStartIntent';
import type { FocusEngineState } from '../../shared/focus/types';
import type { TemplateFacts } from '../../shared/assistant/messageTemplates';
import type { NotificationEnqueueTarget } from '../notifications/notificationEnqueueTarget';
import { createNotificationEnqueueTarget } from '../notifications/notificationEnqueueTarget';

export function resolveFocusStartedContextPhrase(intent: FocusStartIntent): string {
  if (intent.kind === 'task' || intent.kind === 'calendar_event') {
    const title = intent.titleSnapshot.trim();
    if (title.length > 0) {
      return ` for ${title}`;
    }
  }

  return '';
}

export function buildFocusStartedTriggerInput(
  intent: FocusStartIntent,
  state: FocusEngineState,
): {
  triggerKey: 'focus-start';
  facts: TemplateFacts;
  priorityScore: number;
  dedupKey: string;
  sessionId: string;
} | null {
  const sessionId = state.activeSession?.id;
  if (!sessionId) {
    return null;
  }

  const minutes = state.selectedDurationMinutes;
  const contextPhrase = resolveFocusStartedContextPhrase(intent);

  return {
    triggerKey: 'focus-start',
    facts: {
      minutes,
      contextPhrase,
      sessionId,
    },
    priorityScore: 85,
    dedupKey: `focus-started:${sessionId}`,
    sessionId,
  };
}

export function handleFocusSessionStarted(
  intent: FocusStartIntent,
  state: FocusEngineState,
  notifications: NotificationEnqueueTarget = createNotificationEnqueueTarget(),
): boolean {
  const input = buildFocusStartedTriggerInput(intent, state);
  if (input === null) {
    return false;
  }

  return notifications.enqueue(input);
}
