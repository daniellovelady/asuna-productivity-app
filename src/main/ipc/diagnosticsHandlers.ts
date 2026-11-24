import { app, ipcMain } from 'electron';
import { captureRendererHealthSnapshot } from '../diagnostics/rendererHealthSnapshot';
import {
  getRendererMemoryDetailSampleStats,
  logMainMemoryDiag,
  logMemoryDiag,
  markRendererMemoryDetailSampleCompleted,
} from '../diagnostics/registerMemoryDiagnosticsSampler';
import { takeRendererHeapSnapshot } from '../diagnostics/takeRendererHeapSnapshot';
import { diagLog } from '../diagnostics/mainDiagnosticsLog';
import { getMainWindow } from '../notifications/mainWindowRegistry';
import { isRendererMemoryDetailEnabled } from '../../shared/diagnostics/rendererMemoryDetail';
import type { RendererMemoryDetailSnapshot } from '../../shared/diagnostics/rendererMemoryDetail';

type CalendarMemoryPayload = Record<string, unknown>;

function isCalendarMemoryPayload(value: unknown): value is CalendarMemoryPayload {
  return typeof value === 'object' && value !== null;
}

function isRendererMemoryDetail(value: unknown): value is RendererMemoryDetailSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.reason === 'string';
}

export function registerDiagnosticsHandlers(): void {
  if (app.isPackaged) {
    return;
  }

  ipcMain.handle('diagnostics:getRendererHealth', () => {
    return captureRendererHealthSnapshot(getMainWindow());
  });

  /** Main working-set only — does NOT chain into renderer detail (no feedback loop). */
  ipcMain.handle('diagnostics:requestMemorySnapshot', (_event, reason: unknown) => {
    const label = typeof reason === 'string' && reason.length > 0 ? reason : 'renderer-request';
    logMainMemoryDiag(label);
    return true;
  });

  ipcMain.handle('diagnostics:requestMemorySnapshotWithDetail', (_event, reason: unknown) => {
    const label = typeof reason === 'string' && reason.length > 0 ? reason : 'renderer-request';
    logMemoryDiag(label);
    return true;
  });

  ipcMain.handle('diagnostics:reportCalendarMemory', (_event, payload: unknown) => {
    if (!isCalendarMemoryPayload(payload)) {
      return false;
    }
    diagLog('calendar-memory', 'renderer-counter', payload);
    return true;
  });

  ipcMain.handle('diagnostics:reportCalendarLifecycle', (_event, stage: unknown) => {
    if (typeof stage !== 'string' || stage.length === 0) {
      return false;
    }
    diagLog('calendar-lifecycle', stage);
    return true;
  });

  ipcMain.handle('diagnostics:rendererMemoryDetailSampleFinished', () => {
    markRendererMemoryDetailSampleCompleted();
    return true;
  });

  ipcMain.handle('diagnostics:reportRendererMemoryDetail', (_event, payload: unknown) => {
    markRendererMemoryDetailSampleCompleted();
    if (!isRendererMemoryDetailEnabled()) {
      return false;
    }
    if (!isRendererMemoryDetail(payload)) {
      return false;
    }
    const { reason, ...metrics } = payload;
    diagLog('renderer-memory-detail', reason, {
      ...metrics,
      sampleStats: getRendererMemoryDetailSampleStats(),
    });
    return true;
  });

  ipcMain.handle('diagnostics:takeRendererHeapSnapshot', async (_event, label: unknown) => {
    const snapshotLabel = typeof label === 'string' && label.length > 0 ? label : 'manual';
    return takeRendererHeapSnapshot(getMainWindow(), snapshotLabel);
  });
}