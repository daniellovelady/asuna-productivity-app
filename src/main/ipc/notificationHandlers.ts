import { ipcMain, type WebContents } from 'electron';
import {
  isActionPayload,
  isApplyVariationPayload,
  isDismissPayload,
  isRenderedPayload,
} from '../../shared/notifications/validation';
import { getNotificationService } from '../notifications/notificationService';

let mainWebContents: WebContents | null = null;

export function setNotificationMainWebContents(contents: WebContents | null): void {
  mainWebContents = contents;
  getNotificationService().setMainWebContents(contents);
}

function assertNotificationSender(event: Electron.IpcMainInvokeEvent): void {
  const service = getNotificationService();
  const desktopContents = service.getDesktopWebContents();
  if (desktopContents === null || desktopContents.isDestroyed() || event.sender.id !== desktopContents.id) {
    throw new Error('Unauthorized notification sender.');
  }
}

function assertMainRendererSender(event: Electron.IpcMainInvokeEvent): void {
  if (mainWebContents === null || mainWebContents.isDestroyed() || event.sender.id !== mainWebContents.id) {
    throw new Error('Unauthorized main renderer sender.');
  }
}

export function registerNotificationHandlers(): void {
  const service = getNotificationService();

  ipcMain.handle('notification:ready', (event) => {
    assertNotificationSender(event);
    service.handleDesktopReady();
    return { ok: true };
  });

  ipcMain.handle('notification:rendered', (event, payload: unknown) => {
    assertNotificationSender(event);
    if (!isRenderedPayload(payload)) {
      throw new Error('Invalid notification rendered payload.');
    }
    service.handleDesktopRendered(payload.notificationId);
    return { ok: true };
  });

  ipcMain.handle('notification:dismiss', (event, payload: unknown) => {
    assertNotificationSender(event);
    if (!isDismissPayload(payload)) {
      throw new Error('Invalid notification dismiss payload.');
    }
    return service.dismiss(payload.notificationId);
  });

  ipcMain.handle('notification:action', (event, payload: unknown) => {
    const isDesktopSender = (() => {
      try {
        assertNotificationSender(event);
        return true;
      } catch {
        return false;
      }
    })();

    if (!isDesktopSender) {
      assertMainRendererSender(event);
    }

    if (!isActionPayload(payload)) {
      throw new Error('Invalid notification action payload.');
    }
    return service.executeAction(payload.notificationId, payload.action);
  });

  ipcMain.handle('notification:applyVariation', (event, payload: unknown) => {
    assertMainRendererSender(event);
    if (!isApplyVariationPayload(payload)) {
      throw new Error('Invalid notification variation payload.');
    }
    const applied = service.applyVariation(
      payload.notificationId,
      payload.variationGeneration,
      payload.variedTemplate,
    );
    return { applied };
  });
}
