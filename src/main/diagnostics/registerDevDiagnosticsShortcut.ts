import { app, globalShortcut } from 'electron';
import { RENDERER_DOM_HEALTH_SCRIPT, type RendererDomHealth } from './collectRendererDomHealth';
import { captureRendererHealthSnapshot } from './rendererHealthSnapshot';
import { logMainMemoryDiag } from './registerMemoryDiagnosticsSampler';
import { diagLog } from './mainDiagnosticsLog';
import { getMainWindow } from '../notifications/mainWindowRegistry';

export const DEV_RENDERER_HEALTH_SHORTCUT = 'CommandOrControl+Alt+Shift+H';

export function registerDevDiagnosticsShortcut(): void {
  if (app.isPackaged) {
    return;
  }

  const registered = globalShortcut.register(DEV_RENDERER_HEALTH_SHORTCUT, () => {
    const mainWindow = getMainWindow();
    const snapshot = captureRendererHealthSnapshot(mainWindow);
    diagLog('renderer-diag', 'dev-health-check', { ...snapshot });
    logMainMemoryDiag('dev-health-shortcut');

    const webContents = mainWindow?.isDestroyed() ? null : mainWindow?.webContents;
    if (webContents && !webContents.isDestroyed()) {
      void webContents
        .executeJavaScript(RENDERER_DOM_HEALTH_SCRIPT, true)
        .then((domHealth: RendererDomHealth) => {
          diagLog('renderer-diag', 'renderer-dom-health', {
            readyState: domHealth.readyState,
            title: domHealth.title,
            rootExists: domHealth.rootExists,
            rootId: domHealth.rootId,
            rootChildren: domHealth.rootChildElementCount,
            bodyChildren: domHealth.bodyChildElementCount,
            bodyTextLength: domHealth.bodyTextLength,
            origin: domHealth.origin,
            pathname: domHealth.pathname,
            visibilityState: domHealth.visibilityState,
            bootStage: domHealth.bootStage,
          });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'executeJavaScript failed';
          diagLog('renderer-diag', 'renderer-dom-health-failed', { message });
        });
    }
  });

  if (!registered) {
    diagLog('renderer-diag', 'dev-health-shortcut-registration-failed');
  }
}

export function unregisterDevDiagnosticsShortcut(): void {
  if (app.isPackaged) {
    return;
  }

  globalShortcut.unregister(DEV_RENDERER_HEALTH_SHORTCUT);
}