import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { diagLog } from './mainDiagnosticsLog';

function sanitizeHeapLabel(label: string): string {
  const trimmed = label.trim().slice(0, 48);
  const safe = trimmed.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return safe.length > 0 ? safe : 'snapshot';
}

export async function takeRendererHeapSnapshot(
  mainWindow: BrowserWindow | null | undefined,
  label: string,
): Promise<string | null> {
  if (app.isPackaged) {
    return null;
  }

  const webContents = mainWindow?.isDestroyed() ? null : mainWindow?.webContents;
  if (!webContents || webContents.isDestroyed()) {
    return null;
  }

  const directory = path.join(app.getPath('userData'), 'diagnostics', 'heap-snapshots');
  fs.mkdirSync(directory, { recursive: true });

  const fileName = `heap-${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeHeapLabel(label)}.heapsnapshot`;
  const filePath = path.join(directory, fileName);

  try {
    await webContents.takeHeapSnapshot(filePath);
    diagLog('renderer-memory-detail', 'heap-snapshot-written', {
      filePath,
      label: sanitizeHeapLabel(label),
    });
    return filePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'takeHeapSnapshot failed';
    diagLog('renderer-memory-detail', 'heap-snapshot-failed', { message, label: sanitizeHeapLabel(label) });
    return null;
  }
}