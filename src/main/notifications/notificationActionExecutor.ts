import type { AsunaNotification, NotificationAction } from '../../shared/notifications/types';
import { BreakEngineError } from '../../shared/focus/breakTypes';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { getBreakEngine } from '../focus/breakEngine';
import { tryStartFocus } from '../focus/focusStartCommand';
import type { NotificationService } from './notificationService';

export type ActionExecutionResult = {
  ok: boolean;
  reason?: string;
};

export class NotificationActionExecutor {
  private actionInFlight = false;

  constructor(private readonly service: NotificationService) {}

  execute(
    notification: AsunaNotification,
    action: NotificationAction,
    isCurrentNotification: boolean,
  ): ActionExecutionResult {
    if (!isCurrentNotification) {
      return { ok: false, reason: 'Notification is no longer active.' };
    }

    const authUserId = getAuthContextSnapshot().userId;
    if (authUserId === null || authUserId !== notification.ownerUserId) {
      return { ok: false, reason: 'Notification ownership mismatch.' };
    }

    if (!notification.supportedActions.includes(action)) {
      return { ok: false, reason: 'Action is not supported for this notification.' };
    }

    if (this.actionInFlight) {
      return { ok: false, reason: 'Another action is already in progress.' };
    }

    this.actionInFlight = true;

    try {
      const result = this.executeAction(notification, action);
      if (result.ok) {
        this.service.dismiss(notification.id);
      }
      return result;
    } finally {
      this.actionInFlight = false;
    }
  }

  private executeAction(
    notification: AsunaNotification,
    action: NotificationAction,
  ): ActionExecutionResult {
    switch (action) {
      case 'dismiss':
        return { ok: true };
      case 'start_focus':
        return this.executeStartFocus(notification);
      case 'start_break':
        return this.executeStartBreak(notification);
      default:
        return { ok: false, reason: 'Action is not implemented.' };
    }
  }

  private executeStartFocus(notification: AsunaNotification): ActionExecutionResult {
    if (notification.type !== 'break_complete') {
      return { ok: false, reason: 'Start Focus is only available after a break.' };
    }

    const result = tryStartFocus();
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    return { ok: true };
  }

  private executeStartBreak(notification: AsunaNotification): ActionExecutionResult {
    if (notification.type !== 'focus_complete') {
      return { ok: false, reason: 'Start Break is only available after focus completion.' };
    }

    const breakMinutes = notification.facts.breakMinutes;
    if (breakMinutes === undefined || !Number.isInteger(breakMinutes) || breakMinutes < 1) {
      return { ok: false, reason: 'Break duration is unavailable for this notification.' };
    }

    const sourceSessionId = notification.facts.sessionId ?? notification.dedupKey?.replace('celebration:', '') ?? null;

    try {
      getBreakEngine().start(breakMinutes, sourceSessionId);
      return { ok: true };
    } catch (error) {
      if (error instanceof BreakEngineError) {
        return { ok: false, reason: error.message };
      }
      return { ok: false, reason: 'Could not start break.' };
    }
  }
}
