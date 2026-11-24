import type { NotificationTriggerInput } from '../../shared/notifications/types';
import { getNotificationService } from './notificationService';

export interface NotificationEnqueueTarget {
  enqueue(input: NotificationTriggerInput): boolean;
  clear(): void;
  clearProactive(): void;
  resetDedupKeys(): void;
}

export function createNotificationEnqueueTarget(): NotificationEnqueueTarget {
  const service = getNotificationService();
  return {
    enqueue: (input) => service.enqueueFromTrigger(input),
    clear: () => service.clear(),
    clearProactive: () => service.clearProactive(),
    resetDedupKeys: () => service.resetDedupKeys(),
  };
}
