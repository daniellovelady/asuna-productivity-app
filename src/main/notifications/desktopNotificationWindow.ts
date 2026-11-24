import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import {
  positionPopupInWorkArea,
  type DisplayWorkArea,
  type PopupBounds,
} from '../../shared/notifications/displayPlacement';
import { getMainWindow } from './mainWindowRegistry';

export const NOTIFICATION_CARD_WIDTH = 400;
export const NOTIFICATION_SHADOW_PADDING = 8;
export const NOTIFICATION_POPUP_WIDTH = NOTIFICATION_CARD_WIDTH + (NOTIFICATION_SHADOW_PADDING * 2);
export const NOTIFICATION_POPUP_HEIGHT = 172;

const DEV_LOG_PREFIX = '[dev-notification-harness]';

export type DesktopWindowLifecycleListener = {
  onRendererGone?: () => void;
  onWillNavigate?: () => void;
};

export type DesktopPopupPlacement = {
  bounds: PopupBounds;
  workArea: DisplayWorkArea;
};

export class DesktopNotificationWindow {
  private window: BrowserWindow | null = null;

  constructor(
    private readonly lifecycle?: DesktopWindowLifecycleListener,
  ) {}

  getWebContents(): Electron.WebContents | null {
    if (this.window === null || this.window.isDestroyed()) {
      return null;
    }
    return this.window.webContents;
  }

  isAlive(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  ensureCreated(): BrowserWindow {
    if (this.window !== null && !this.window.isDestroyed()) {
      return this.window;
    }

    this.window = new BrowserWindow({
      width: NOTIFICATION_POPUP_WIDTH,
      height: NOTIFICATION_POPUP_HEIGHT,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'notification-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    this.window.webContents.on('will-navigate', (event) => {
      event.preventDefault();
      this.lifecycle?.onWillNavigate?.();
    });

    this.window.webContents.on('render-process-gone', () => {
      this.lifecycle?.onRendererGone?.();
    });

    this.window.on('closed', () => {
      this.window = null;
      this.lifecycle?.onRendererGone?.();
    });

    if (NOTIFICATION_WINDOW_VITE_DEV_SERVER_URL) {
      void this.window.loadURL(NOTIFICATION_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      void this.window.loadFile(
        path.join(__dirname, '../renderer/notification_window/index.html'),
      );
    }

    return this.window;
  }

  computePlacement(): DesktopPopupPlacement {
    const cursorPoint = screen.getCursorScreenPoint();
    let display = screen.getDisplayNearestPoint(cursorPoint);

    const main = getMainWindow();
    if (display === null || display.workArea.width === 0) {
      if (main !== null && !main.isDestroyed()) {
        display = screen.getDisplayMatching(main.getBounds());
      } else {
        display = screen.getPrimaryDisplay();
      }
    }

    const workArea = display.workArea;
    const bounds = positionPopupInWorkArea(
      workArea,
      NOTIFICATION_POPUP_WIDTH,
      NOTIFICATION_POPUP_HEIGHT,
    );

    return { bounds, workArea };
  }

  positionWindow(): PopupBounds {
    const { bounds } = this.computePlacement();
    const window = this.ensureCreated();
    window.setBounds(bounds);
    return bounds;
  }

  showInactive(): void {
    const window = this.ensureCreated();
    window.showInactive();
  }

  hide(): void {
    if (this.window !== null && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  destroy(): void {
    if (this.window !== null && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }

  send(channel: string, payload: unknown): void {
    const contents = this.getWebContents();
    if (contents === null || contents.isDestroyed()) {
      return;
    }
    contents.send(channel, payload);
  }
}

export function logDevPopupGeometry(placement: DesktopPopupPlacement): void {
  if (process.env.ASUNA_DEV_NOTIFICATION_HARNESS !== '1') {
    return;
  }

  console.info(`${DEV_LOG_PREFIX} popup geometry`, {
    workArea: placement.workArea,
    bounds: placement.bounds,
  });
}

declare const NOTIFICATION_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
