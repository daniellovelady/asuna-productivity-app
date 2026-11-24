import type { NotificationViewModel } from '../../shared/notifications/types';
import type { DesktopNotificationWindow } from './desktopNotificationWindow';

export type DesktopPresentOptions = {
  updateOnly?: boolean;
};

export class DesktopNotificationPresenter {
  private ready = false;

  private pendingPayload: NotificationViewModel | null = null;

  private awaitingRenderedId: string | null = null;

  constructor(
    private readonly windowManager: DesktopNotificationWindow,
  ) {}

  isReady(): boolean {
    return this.ready;
  }

  getAwaitingRenderedId(): string | null {
    return this.awaitingRenderedId;
  }

  markNotReady(): void {
    this.ready = false;
    this.pendingPayload = null;
    this.awaitingRenderedId = null;
  }

  markReady(): void {
    this.ready = true;
    if (this.pendingPayload !== null) {
      this.flushDisplay(this.pendingPayload, true);
    }
  }

  present(payload: NotificationViewModel, options: DesktopPresentOptions = {}): boolean {
    if (!this.ready) {
      this.pendingPayload = payload;
      this.windowManager.ensureCreated();
      return false;
    }

    if (options.updateOnly) {
      return this.sendDisplayUpdate(payload);
    }

    return this.flushDisplay(payload, true);
  }

  acknowledgeRendered(notificationId: string): boolean {
    if (this.awaitingRenderedId !== notificationId) {
      return false;
    }

    this.awaitingRenderedId = null;
    this.windowManager.showInactive();
    return true;
  }

  hide(): void {
    this.pendingPayload = null;
    this.awaitingRenderedId = null;
    this.clearRenderer();
    this.windowManager.hide();
  }

  destroy(): void {
    this.markNotReady();
    this.clearRenderer();
    this.windowManager.destroy();
  }

  getWebContents(): Electron.WebContents | null {
    return this.windowManager.getWebContents();
  }

  private clearRenderer(): void {
    this.windowManager.send('notification:clear');
  }

  private flushDisplay(payload: NotificationViewModel, requireRenderedAck: boolean): boolean {
    const contents = this.windowManager.getWebContents();
    if (contents === null || contents.isDestroyed()) {
      return false;
    }

    this.pendingPayload = null;
    this.windowManager.positionWindow();

    if (requireRenderedAck) {
      this.awaitingRenderedId = payload.id;
    }

    this.windowManager.send('notification:display', payload);
    return true;
  }

  private sendDisplayUpdate(payload: NotificationViewModel): boolean {
    const contents = this.windowManager.getWebContents();
    if (contents === null || contents.isDestroyed()) {
      return false;
    }

    this.windowManager.send('notification:display', payload);
    return true;
  }
}
