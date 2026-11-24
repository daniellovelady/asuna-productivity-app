import type { AssistantTriggerKey, TemplateFacts } from '../assistant/messageTemplates';
import type { AvatarStyle, ReminderTone } from '../preferences/types';

export type NotificationType =
  | 'focus_encouragement'
  | 'focus_started'
  | 'focus_complete'
  | 'break_reminder'
  | 'task_reminder'
  | 'distraction_warning'
  | 'break_complete'
  | 'start_focus_suggestion'
  | 'ambient_encouragement';

export type AvatarState =
  | 'default'
  | 'encouraging'
  | 'celebrating'
  | 'focused'
  | 'relaxed'
  | 'concerned';

export type NotificationPriority = 'low' | 'normal' | 'high';

export type NotificationAction =
  | 'dismiss'
  | 'snooze'
  | 'start_focus'
  | 'start_break'
  | 'open_task'
  | 'open_asuna';

export type NotificationPresentation = 'in_app' | 'desktop';

export type NotificationSource = 'dev_test';

export interface AsunaNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  baseTemplate: string;
  triggerKey: AssistantTriggerKey;
  facts: TemplateFacts;
  avatarState: AvatarState;
  priority: NotificationPriority;
  priorityScore: number;
  supportedActions: NotificationAction[];
  desktopEligible: boolean;
  createdAt: number;
  shownAt: number | null;
  ttlMs: number | null;
  expiresAt: number | null;
  ownerUserId: string;
  dedupKey?: string;
  presentation: NotificationPresentation | null;
  variationGeneration: number;
  legacyMessageType: 'encouragement' | 'warning' | 'break' | 'celebration';
  source?: NotificationSource;
}

export interface NotificationTriggerInput {
  triggerKey: AssistantTriggerKey;
  facts: TemplateFacts;
  priorityScore: number;
  dedupKey: string;
  sessionId?: string;
  source?: NotificationSource;
}

export type NotificationActionVariant = 'primary' | 'secondary';

export interface NotificationActionDescriptor {
  type: NotificationAction;
  label: string;
  variant: NotificationActionVariant;
}

export interface NotificationViewModel {
  id: string;
  title: string;
  message: string;
  avatarStyle: AvatarStyle;
  avatarState: AvatarState;
  actions: NotificationActionDescriptor[];
}

export type NotificationActionResult = {
  ok: boolean;
  reason?: string;
  queueState: import('../activity/types').AssistantQueueState;
};

export interface SafeNotificationPreferences {
  ownerMatched: boolean;
  avatarStyle: AvatarStyle;
  reminderTone: ReminderTone;
  quietMode: boolean;
  aiMessageVariationEnabled: boolean;
}

export interface VariationRequestPayload {
  notificationId: string;
  variationGeneration: number;
  triggerKey: AssistantTriggerKey;
  tone: ReminderTone;
  baseTemplate: string;
}
