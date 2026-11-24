import { app, globalShortcut } from 'electron';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { getPreferencesSnapshot } from '../preferences/preferencesSnapshot';
import { isValidBreakMinutes } from '../../shared/preferences/validation';
import type { NotificationTriggerInput } from '../../shared/notifications/types';
import { getNotificationService } from './notificationService';

export const DEV_NOTIFICATION_HARNESS_ENV = 'ASUNA_DEV_NOTIFICATION_HARNESS';

export const DEV_ENCOURAGEMENT_SHORTCUT = 'CommandOrControl+Alt+Shift+E';

export const DEV_FOCUS_COMPLETE_SHORTCUT = 'CommandOrControl+Alt+Shift+C';

export const DEV_DISMISS_SHORTCUT = 'CommandOrControl+Alt+Shift+D';

export const DEV_BREAK_COMPLETE_SHORTCUT = 'CommandOrControl+Alt+Shift+B';

const DEV_LOG_PREFIX = '[dev-notification-harness]';

let triggerSequence = 0;

let shortcutsRegistered = false;

const registeredShortcuts: string[] = [];

export function isDevNotificationHarnessEnabled(
  isPackaged: boolean,
  harnessEnv: string | undefined,
): boolean {
  return !isPackaged && harnessEnv === '1';
}

export function buildDevEncouragementTrigger(sequence: number, now: number): NotificationTriggerInput {
  return {
    triggerKey: 'encouragement',
    facts: {},
    priorityScore: 10,
    dedupKey: `dev-encouragement:${sequence}:${now}`,
    source: 'dev_test',
  };
}

export function resolveDevFocusCompleteBreakMinutes(authUserId: string): number | null {
  const preferences = getPreferencesSnapshot();

  if (preferences.userId !== authUserId) {
    return null;
  }

  if (!isValidBreakMinutes(preferences.breakMinutes)) {
    return null;
  }

  return preferences.breakMinutes;
}

export function buildDevFocusCompleteTrigger(
  sequence: number,
  now: number,
  breakMinutes: number,
): NotificationTriggerInput {
  return {
    triggerKey: 'celebration',
    facts: { minutes: 25, breakMinutes, sessionId: `dev-session:${sequence}` },
    priorityScore: 100,
    dedupKey: `dev-celebration:${sequence}:${now}`,
    source: 'dev_test',
  };
}

export function buildDevBreakCompleteTrigger(sequence: number, now: number): NotificationTriggerInput {
  return {
    triggerKey: 'break-complete',
    facts: {},
    priorityScore: 100,
    dedupKey: `dev-break-complete:${sequence}:${now}`,
    source: 'dev_test',
  };
}

export type QueueDiagnostics = {
  currentType: string | null;
  pendingCount: number;
};

export function formatDevQueueDiagnostics(diagnostics: QueueDiagnostics): string {
  return `current=${diagnostics.currentType ?? 'none'} pending=${diagnostics.pendingCount}`;
}

export function triggerDevEncouragement(
  enqueue: (input: NotificationTriggerInput) => boolean,
  getAuthUserId: () => string | null,
  log: (message: string) => void,
  sequence: number,
  now: number,
  getDiagnostics?: () => QueueDiagnostics,
): boolean {
  if (getAuthUserId() === null) {
    log(`${DEV_LOG_PREFIX} No authenticated user; encouragement not emitted.`);
    return false;
  }

  const enqueued = enqueue(buildDevEncouragementTrigger(sequence, now));
  if (!enqueued) {
    log(`${DEV_LOG_PREFIX} Encouragement suppressed by notification policy.`);
    return false;
  }

  if (getDiagnostics !== undefined) {
    log(`${DEV_LOG_PREFIX} emitted focus_encouragement ${formatDevQueueDiagnostics(getDiagnostics())}`);
  }

  return true;
}

export function triggerDevFocusComplete(
  enqueue: (input: NotificationTriggerInput) => boolean,
  getAuthUserId: () => string | null,
  log: (message: string) => void,
  sequence: number,
  now: number,
  getDiagnostics?: () => QueueDiagnostics,
): boolean {
  const authUserId = getAuthUserId();
  if (authUserId === null) {
    log(`${DEV_LOG_PREFIX} No authenticated user; focus_complete not emitted.`);
    return false;
  }

  const breakMinutes = resolveDevFocusCompleteBreakMinutes(authUserId);
  if (breakMinutes === null) {
    log(`${DEV_LOG_PREFIX} focus_complete not emitted; owner-matched break preferences unavailable.`);
    return false;
  }

  const enqueued = enqueue(buildDevFocusCompleteTrigger(sequence, now, breakMinutes));
  if (!enqueued) {
    log(`${DEV_LOG_PREFIX} focus_complete suppressed by notification policy.`);
    return false;
  }

  if (getDiagnostics !== undefined) {
    log(`${DEV_LOG_PREFIX} emitted focus_complete ${formatDevQueueDiagnostics(getDiagnostics())}`);
  }

  return true;
}

export function triggerDevBreakComplete(
  enqueue: (input: NotificationTriggerInput) => boolean,
  getAuthUserId: () => string | null,
  log: (message: string) => void,
  sequence: number,
  now: number,
  getDiagnostics?: () => QueueDiagnostics,
): boolean {
  if (getAuthUserId() === null) {
    log(`${DEV_LOG_PREFIX} No authenticated user; break_complete not emitted.`);
    return false;
  }

  const enqueued = enqueue(buildDevBreakCompleteTrigger(sequence, now));
  if (!enqueued) {
    log(`${DEV_LOG_PREFIX} break_complete suppressed by notification policy.`);
    return false;
  }

  if (getDiagnostics !== undefined) {
    log(`${DEV_LOG_PREFIX} emitted break_complete ${formatDevQueueDiagnostics(getDiagnostics())}`);
  }

  return true;
}

export function dismissDevCurrentNotification(
  dismissCurrent: () => boolean,
  log: (message: string) => void,
  getDiagnostics?: () => QueueDiagnostics,
): boolean {
  const dismissed = dismissCurrent();
  if (!dismissed) {
    log(`${DEV_LOG_PREFIX} dismiss current no current notification`);
    return false;
  }

  if (getDiagnostics !== undefined) {
    log(`${DEV_LOG_PREFIX} dismiss current ok ${formatDevQueueDiagnostics(getDiagnostics())}`);
  } else {
    log(`${DEV_LOG_PREFIX} dismiss current ok`);
  }

  return true;
}

function registerShortcut(
  accelerator: string,
  handler: () => void,
): boolean {
  const registered = globalShortcut.register(accelerator, handler);
  if (!registered) {
    console.warn(`${DEV_LOG_PREFIX} Failed to register shortcut: ${accelerator}`);
    return false;
  }
  registeredShortcuts.push(accelerator);
  return true;
}

export function registerDevNotificationHarness(): void {
  if (!isDevNotificationHarnessEnabled(app.isPackaged, process.env[DEV_NOTIFICATION_HARNESS_ENV])) {
    return;
  }

  if (shortcutsRegistered) {
    return;
  }

  const service = getNotificationService();
  const enqueue = (input: NotificationTriggerInput) => service.enqueueFromTrigger(input);
  const getAuthUserId = () => getAuthContextSnapshot().userId;
  const getDiagnostics = () => service.getQueueDiagnostics();
  const log = (message: string) => {
    console.info(message);
  };

  registerShortcut(DEV_ENCOURAGEMENT_SHORTCUT, () => {
    triggerSequence += 1;
    triggerDevEncouragement(enqueue, getAuthUserId, log, triggerSequence, Date.now(), getDiagnostics);
  });

  registerShortcut(DEV_FOCUS_COMPLETE_SHORTCUT, () => {
    triggerSequence += 1;
    triggerDevFocusComplete(enqueue, getAuthUserId, log, triggerSequence, Date.now(), getDiagnostics);
  });

  registerShortcut(DEV_BREAK_COMPLETE_SHORTCUT, () => {
    triggerSequence += 1;
    triggerDevBreakComplete(enqueue, getAuthUserId, log, triggerSequence, Date.now(), getDiagnostics);
  });

  registerShortcut(DEV_DISMISS_SHORTCUT, () => {
    dismissDevCurrentNotification(() => service.dismissCurrentNotification(), log, getDiagnostics);
  });

  shortcutsRegistered = registeredShortcuts.length > 0;
  if (shortcutsRegistered) {
    console.info(`${DEV_LOG_PREFIX} Registered dev notification shortcuts.`);
  }
}

export function unregisterDevNotificationHarness(): void {
  for (const shortcut of registeredShortcuts) {
    globalShortcut.unregister(shortcut);
  }
  registeredShortcuts.length = 0;
  shortcutsRegistered = false;
}

export function getRegisteredDevNotificationShortcuts(): readonly string[] {
  return [...registeredShortcuts];
}

export function resetDevNotificationHarnessStateForTests(): void {
  triggerSequence = 0;
  registeredShortcuts.length = 0;
  shortcutsRegistered = false;
}
