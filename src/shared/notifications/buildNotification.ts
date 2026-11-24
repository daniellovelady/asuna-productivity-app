import { randomUUID } from 'crypto';
import { getMessageTemplate, interpolateTemplate } from '../assistant/messageTemplates';
import type { ReminderTone } from '../preferences/types';
import {
  getAvatarStateForType,
  getLegacyMessageType,
  getPriorityLabel,
  getSupportedActionsForType,
  getTitleForType,
  getTtlMsForType,
  isDesktopEligible,
  resolveNotificationType,
} from './policies';
import type { AsunaNotification, NotificationTriggerInput } from './types';

export function buildNotification(
  input: NotificationTriggerInput,
  ownerUserId: string,
  reminderTone: ReminderTone,
  now: number,
): AsunaNotification {
  const type = resolveNotificationType(input.triggerKey);
  const baseTemplate = getMessageTemplate(input.triggerKey, reminderTone);
  const message = interpolateTemplate(baseTemplate, input.facts);

  return {
    id: randomUUID(),
    type,
    title: getTitleForType(type),
    message,
    baseTemplate,
    triggerKey: input.triggerKey,
    facts: input.facts,
    avatarState: getAvatarStateForType(type),
    priority: getPriorityLabel(input.priorityScore),
    priorityScore: input.priorityScore,
    supportedActions: getSupportedActionsForType(type),
    desktopEligible: isDesktopEligible(type),
    createdAt: now,
    shownAt: null,
    ttlMs: getTtlMsForType(type),
    expiresAt: null,
    ownerUserId,
    dedupKey: input.dedupKey,
    presentation: null,
    variationGeneration: 0,
    legacyMessageType: getLegacyMessageType(type),
    source: input.source,
  };
}
