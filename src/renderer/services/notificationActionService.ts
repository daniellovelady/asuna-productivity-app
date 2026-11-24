import type { NotificationAction, NotificationActionResult } from '../../shared/notifications/types';

declare global {
  interface Window {
    notificationBridgeApi: {
      executeAction: (
        notificationId: string,
        action: NotificationAction,
      ) => Promise<NotificationActionResult>;
    };
  }
}

function getNotificationBridgeApi() {
  if (window.notificationBridgeApi === undefined) {
    throw new Error('Notification bridge API is unavailable.');
  }

  return window.notificationBridgeApi;
}

export const notificationActionService = {
  executeAction: (
    notificationId: string,
    action: NotificationAction,
  ): Promise<NotificationActionResult> =>
    getNotificationBridgeApi().executeAction(notificationId, action),
};
