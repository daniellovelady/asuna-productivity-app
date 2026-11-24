import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import {
  isMainMemoryDiagEnabled,
  isRendererMemoryDetailEnabled,
  RENDERER_MEMORY_DETAIL_IPC_CHANNEL,
} from '../../shared/diagnostics/rendererMemoryDetail';
import { captureRendererProcessMemory } from './captureRendererProcessMemory';
import { diagLog } from './mainDiagnosticsLog';
import { getMainWindow } from '../notifications/mainWindowRegistry';

const SAMPLE_INTERVAL_MS = 20_000;

let sampleTimer: ReturnType<typeof setInterval> | null = null;

export function logMainMemoryDiag(reason: string, extra?: Record<string, unknown>): void {
  if (app.isPackaged || !isMainMemoryDiagEnabled()) {
    return;
  }

  diagLog('memory-diag', reason, {
    ...captureRendererProcessMemory(getMainWindow()),
    ...extra,
  });
}

/** Main metrics plus optional renderer detail (never invokes detail when disabled). */
export function logMemoryDiag(reason: string, extra?: Record<string, unknown>): void {
  logMainMemoryDiag(reason, extra);
  if (isRendererMemoryDetailEnabled()) {
    requestRendererMemoryDetail(getMainWindow(), reason);
  }
}

export function registerMemoryDiagnosticsSampler(): void {
  if (app.isPackaged || !isMainMemoryDiagEnabled()) {
    return;
  }

  unregisterMemoryDiagnosticsSampler();

  diagLog('memory-diag', 'sampler-config', {
    mainMetrics: true,
    rendererMemoryDetail: isRendererMemoryDetailEnabled(),
    intervalMs: SAMPLE_INTERVAL_MS,
  });

  logMainMemoryDiag('sampler-start');

  sampleTimer = setInterval(() => {
    logMainMemoryDiag('periodic-sample');
    if (isRendererMemoryDetailEnabled()) {
      requestRendererMemoryDetail(getMainWindow(), 'periodic-sample');
    }
  }, SAMPLE_INTERVAL_MS);
  sampleTimer.unref?.();
}

export function unregisterMemoryDiagnosticsSampler(): void {
  if (sampleTimer) {
    clearInterval(sampleTimer);
    sampleTimer = null;
  }
}

type RendererMemoryDetailSampleStats = {
  started: number;
  completed: number;
  skipped: number;
  inFlight: number;
  maxConcurrent: number;
};

const rendererDetailStats: RendererMemoryDetailSampleStats = {
  started: 0,
  completed: 0,
  skipped: 0,
  inFlight: 0,
  maxConcurrent: 0,
};

export function getRendererMemoryDetailSampleStats(): RendererMemoryDetailSampleStats {
  return { ...rendererDetailStats };
}

export function markRendererMemoryDetailSampleCompleted(): void {
  if (rendererDetailStats.inFlight > 0) {
    rendererDetailStats.inFlight -= 1;
  }
  rendererDetailStats.completed += 1;
}

export function requestRendererMemoryDetail(
  mainWindow: BrowserWindow | null | undefined,
  reason: string,
): void {
  if (!isRendererMemoryDetailEnabled()) {
    return;
  }

  const webContents = mainWindow?.isDestroyed() ? null : mainWindow?.webContents;
  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  if (rendererDetailStats.inFlight >= 1) {
    rendererDetailStats.skipped += 1;
    diagLog('renderer-memory-detail', 'sample-skipped-in-flight', {
      reason,
      ...getRendererMemoryDetailSampleStats(),
    });
    return;
  }

  rendererDetailStats.started += 1;
  rendererDetailStats.inFlight += 1;
  rendererDetailStats.maxConcurrent = Math.max(
    rendererDetailStats.maxConcurrent,
    rendererDetailStats.inFlight,
  );

  webContents.send(RENDERER_MEMORY_DETAIL_IPC_CHANNEL, reason);
}