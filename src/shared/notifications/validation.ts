import type { NotificationAction } from './types';

const ALLOWED_ACTIONS = new Set<NotificationAction>([
  'dismiss',
  'snooze',
  'start_focus',
  'start_break',
  'open_task',
  'open_asuna',
]);

export function isNotificationAction(value: unknown): value is NotificationAction {
  return typeof value === 'string' && ALLOWED_ACTIONS.has(value as NotificationAction);
}

export function isDismissPayload(value: unknown): value is { notificationId: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.notificationId === 'string' && record.notificationId.length > 0;
}

export function isActionPayload(value: unknown): value is {
  notificationId: string;
  action: NotificationAction;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.notificationId === 'string'
    && record.notificationId.length > 0
    && isNotificationAction(record.action);
}

export function isApplyVariationPayload(value: unknown): value is {
  notificationId: string;
  variationGeneration: number;
  variedTemplate: string;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.notificationId === 'string'
    && record.notificationId.length > 0
    && typeof record.variationGeneration === 'number'
    && typeof record.variedTemplate === 'string'
    && record.variedTemplate.length > 0;
}

export function isRenderedPayload(value: unknown): value is { notificationId: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.notificationId === 'string' && record.notificationId.length > 0;
}
