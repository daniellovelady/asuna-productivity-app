import type { BrowserWindow } from 'electron';
import type { AsunaNotification, NotificationPresentation } from '../../shared/notifications/types';

export function isMainWindowForeground(mainWindow: BrowserWindow | null): boolean {
  return mainWindow !== null
    && !mainWindow.isDestroyed()
    && mainWindow.isVisible()
    && !mainWindow.isMinimized()
    && mainWindow.isFocused();
}

export function resolvePresentation(
  notification: AsunaNotification,
  mainWindow: BrowserWindow | null,
): NotificationPresentation {
  if (!notification.desktopEligible) {
    return 'in_app';
  }

  if (isMainWindowForeground(mainWindow)) {
    return 'in_app';
  }

  return 'desktop';
}
