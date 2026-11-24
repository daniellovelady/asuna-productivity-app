import { ASSISTANT_AUTO_DISMISS_MS, FOCUS_STARTED_CONFIRMATION_TTL_MS } from '../activity/constants';
import type { AssistantTriggerKey } from '../assistant/messageTemplates';
import type {
  AvatarState,
  NotificationAction,
  NotificationPriority,
  NotificationType,
} from './types';

const PROACTIVE_TYPES = new Set<NotificationType>([
  'focus_encouragement',
  'ambient_encouragement',
  'start_focus_suggestion',
  'distraction_warning',
  'break_reminder',
  'task_reminder',
]);

const TRIGGER_TO_TYPE: Record<AssistantTriggerKey, NotificationType> = {
  encouragement: 'focus_encouragement',
  celebration: 'focus_complete',
  'break-productive': 'break_reminder',
  'break-focus': 'break_reminder',
  'break-distracting': 'break_reminder',
  'distraction-15': 'distraction_warning',
  'distraction-30': 'distraction_warning',
  'distraction-60': 'distraction_warning',
  'task-reminder': 'task_reminder',
  'break-complete': 'break_complete',
  'focus-start': 'focus_started',
};

const DESKTOP_ELIGIBLE = new Set<NotificationType>([
  'focus_encouragement',
  'focus_complete',
  'focus_started',
  'break_complete',
]);

const AVATAR_STATE_BY_TYPE: Record<NotificationType, AvatarState> = {
  focus_encouragement: 'encouraging',
  focus_started: 'focused',
  focus_complete: 'celebrating',
  break_reminder: 'relaxed',
  task_reminder: 'focused',
  distraction_warning: 'concerned',
  break_complete: 'focused',
  start_focus_suggestion: 'encouraging',
  ambient_encouragement: 'encouraging',
};

const PRIORITY_BY_SCORE = (score: number): NotificationPriority => {
  if (score >= 80) {
    return 'high';
  }
  if (score >= 25) {
    return 'normal';
  }
  return 'low';
};

const TITLE_BY_TYPE: Record<NotificationType, string> = {
  focus_encouragement: 'A.S.U.N.A.',
  focus_started: 'Focus session started',
  focus_complete: 'Focus session complete',
  break_reminder: 'A.S.U.N.A.',
  task_reminder: 'A.S.U.N.A.',
  distraction_warning: 'A.S.U.N.A.',
  break_complete: 'Break complete',
  start_focus_suggestion: 'A.S.U.N.A.',
  ambient_encouragement: 'A.S.U.N.A.',
};

const LEGACY_MESSAGE_TYPE: Record<NotificationType, 'encouragement' | 'warning' | 'break' | 'celebration'> = {
  focus_encouragement: 'encouragement',
  focus_started: 'encouragement',
  focus_complete: 'celebration',
  break_reminder: 'break',
  task_reminder: 'warning',
  distraction_warning: 'warning',
  break_complete: 'break',
  start_focus_suggestion: 'encouragement',
  ambient_encouragement: 'encouragement',
};

export function resolveNotificationType(triggerKey: AssistantTriggerKey): NotificationType {
  return TRIGGER_TO_TYPE[triggerKey];
}

export function isDesktopEligible(type: NotificationType): boolean {
  return DESKTOP_ELIGIBLE.has(type);
}

export function isSuppressedByQuietMode(type: NotificationType, quietMode: boolean): boolean {
  if (!quietMode) {
    return false;
  }
  return PROACTIVE_TYPES.has(type);
}

export function getAvatarStateForType(type: NotificationType): AvatarState {
  return AVATAR_STATE_BY_TYPE[type];
}

export function getTitleForType(type: NotificationType): string {
  return TITLE_BY_TYPE[type];
}

export function getLegacyMessageType(type: NotificationType): 'encouragement' | 'warning' | 'break' | 'celebration' {
  return LEGACY_MESSAGE_TYPE[type];
}

export function getPriorityLabel(score: number): NotificationPriority {
  return PRIORITY_BY_SCORE(score);
}

export function getTtlMsForType(type: NotificationType): number | null {
  if (type === 'focus_complete' || type === 'break_complete') {
    return null;
  }
  if (type === 'focus_started') {
    return FOCUS_STARTED_CONFIRMATION_TTL_MS;
  }
  return ASSISTANT_AUTO_DISMISS_MS;
}

const SUPPORTED_ACTIONS_BY_TYPE: Partial<Record<NotificationType, NotificationAction[]>> = {
  focus_complete: ['start_break', 'dismiss'],
  break_complete: ['start_focus', 'dismiss'],
};

export function getSupportedActionsForType(type: NotificationType): NotificationAction[] {
  return SUPPORTED_ACTIONS_BY_TYPE[type] ?? ['dismiss'];
}

export function isProactiveType(type: NotificationType): boolean {
  return PROACTIVE_TYPES.has(type);
}

export function isSuppressedForPreferenceReadiness(
  type: NotificationType,
  ownerMatched: boolean,
): boolean {
  if (ownerMatched) {
    return false;
  }
  return isProactiveType(type);
}
