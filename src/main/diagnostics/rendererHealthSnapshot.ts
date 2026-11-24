import type { BrowserWindow, WebContents } from 'electron';
import { sanitizeDiagnosticUrl } from './sanitizeDiagnosticUrl';

export type RendererHealthSnapshot = {
  windowDestroyed: boolean;
  windowVisible: boolean | null;
  windowMinimized: boolean | null;
  webContentsDestroyed: boolean;
  webContentsCrashed: boolean | null;
  url: string | null;
};

export function captureRendererHealthSnapshot(
  window: BrowserWindow | null,
): RendererHealthSnapshot {
  if (window === null) {
    return {
      windowDestroyed: true,
      windowVisible: null,
      windowMinimized: null,
      webContentsDestroyed: true,
      webContentsCrashed: null,
      url: null,
    };
  }

  const windowDestroyed = window.isDestroyed();
  const windowVisible = windowDestroyed ? null : window.isVisible();
  const windowMinimized = windowDestroyed ? null : window.isMinimized();

  let webContents: WebContents | null = null;
  try {
    webContents = windowDestroyed ? null : window.webContents;
  } catch {
    webContents = null;
  }

  if (!webContents || webContents.isDestroyed()) {
    return {
      windowDestroyed,
      windowVisible,
      windowMinimized,
      webContentsDestroyed: true,
      webContentsCrashed: null,
      url: null,
    };
  }

  const webContentsCrashed = typeof webContents.isCrashed === 'function'
    ? webContents.isCrashed()
    : null;

  let url: string | null = null;
  try {
    url = sanitizeDiagnosticUrl(webContents.getURL());
  } catch {
    url = null;
  }

  return {
    windowDestroyed,
    windowVisible,
    windowMinimized,
    webContentsDestroyed: false,
    webContentsCrashed,
    url,
  };
}