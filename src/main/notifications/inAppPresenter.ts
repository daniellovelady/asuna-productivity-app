import type { AssistantMessage, AssistantQueueState } from '../../shared/activity/types';
import { buildActionDescriptors } from '../../shared/notifications/buildActionDescriptors';
import type { AsunaNotification } from '../../shared/notifications/types';

export function toAssistantMessage(notification: AsunaNotification): AssistantMessage {
  return {
    id: notification.id,
    type: notification.legacyMessageType,
    text: notification.message,
    createdAt: notification.createdAt,
    priority: notification.priorityScore,
    triggerKey: notification.triggerKey,
    template: notification.baseTemplate,
    facts: notification.facts,
    actions: buildActionDescriptors(notification),
  };
}

export function buildInAppQueueState(
  current: AsunaNotification | null,
  pendingCount: number,
): AssistantQueueState {
  if (current === null || current.presentation !== 'in_app') {
    return {
      current: null,
      pendingCount,
    };
  }

  return {
    current: toAssistantMessage(current),
    pendingCount,
  };
}
