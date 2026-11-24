import { app, globalShortcut } from 'electron';
import { getMainWindow } from '../notifications/mainWindowRegistry';
import { takeRendererHeapSnapshot } from './takeRendererHeapSnapshot';

export const DEV_HEAP_SNAPSHOT_SHORTCUT = 'CommandOrControl+Alt+Shift+J';

export function registerDevHeapSnapshotShortcut(): void {
  if (app.isPackaged) {
    return;
  }

  const registered = globalShortcut.register(DEV_HEAP_SNAPSHOT_SHORTCUT, () => {
    void takeRendererHeapSnapshot(getMainWindow(), 'manual-shortcut');
  });

  if (!registered) {
    // logged via diagnostics if registration fails — keep silent in production paths
  }
}

export function unregisterDevHeapSnapshotShortcut(): void {
  if (app.isPackaged) {
    return;
  }

  globalShortcut.unregister(DEV_HEAP_SNAPSHOT_SHORTCUT);
}