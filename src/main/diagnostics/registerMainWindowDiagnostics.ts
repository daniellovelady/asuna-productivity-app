import type { BrowserWindow } from 'electron';
import { diagLog } from './mainDiagnosticsLog';
import {
  isRendererMemoryDetailEnabled,
} from '../../shared/diagnostics/rendererMemoryDetail';
import {
  logMainMemoryDiag,
  requestRendererMemoryDetail,
} from './registerMemoryDiagnosticsSampler';
import { captureRendererHealthSnapshot } from './rendererHealthSnapshot';
import { sanitizeDiagnosticUrl } from './sanitizeDiagnosticUrl';

export function registerMainWindowDiagnostics(
  window: BrowserWindow,
  options: { loadTarget: string },
): void {
  diagLog('renderer-diag', 'register', {
    loadTarget: sanitizeDiagnosticUrl(options.loadTarget) || options.loadTarget,
  });

  const logHealth = (reason: string): void => {
    diagLog('renderer-diag', 'health-snapshot', {
      reason,
      ...captureRendererHealthSnapshot(window),
    });
  };

  const webContents = window.webContents;

  webContents.on('did-finish-load', () => {
    diagLog('renderer-diag', 'did-finish-load', {
      url: sanitizeDiagnosticUrl(webContents.getURL()),
    });
  });

  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }

    diagLog('renderer-diag', 'did-fail-load', {
      errorCode,
      errorDescription,
      validatedURL: sanitizeDiagnosticUrl(validatedURL),
      isMainFrame,
    });
    logHealth('did-fail-load');
  });

  webContents.on('render-process-gone', (_event, details) => {
    diagLog('renderer-diag', 'render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
    logMainMemoryDiag(`render-process-gone:${details.reason}`);
    if (isRendererMemoryDetailEnabled()) {
      requestRendererMemoryDetail(window, `render-process-gone:${details.reason}`);
    }
    logHealth('render-process-gone');
  });

  webContents.on('unresponsive', () => {
    diagLog('renderer-diag', 'unresponsive');
    logHealth('unresponsive');
  });

  webContents.on('responsive', () => {
    diagLog('renderer-diag', 'responsive');
  });

  webContents.on('destroyed', () => {
    diagLog('renderer-diag', 'webContents-destroyed');
    logHealth('webContents-destroyed');
  });

  window.on('show', () => {
    diagLog('renderer-diag', 'window-show');
  });

  window.on('hide', () => {
    diagLog('renderer-diag', 'window-hide');
  });

  window.on('focus', () => {
    diagLog('renderer-diag', 'window-focus');
  });

  window.on('blur', () => {
    diagLog('renderer-diag', 'window-blur');
  });

  window.on('closed', () => {
    diagLog('renderer-diag', 'window-closed');
  });
}