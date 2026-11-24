import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { bootstrapActivityProvider, getActivityTracker } from './main/activity/activityTracker';
import { registerActivityHandlers, setActivityWebContents } from './main/ipc/activityHandlers';
import { registerAuthContextHandlers } from './main/ipc/authContextHandlers';
import { registerBreakHandlers } from './main/ipc/breakHandlers';
import { registerFocusHandlers } from './main/ipc/focusHandlers';
import { getBreakEngine } from './main/focus/breakEngine';
import { registerCoachHandlers } from './main/ipc/coachHandlers';
import { registerCalendarHandlers } from './main/ipc/calendarHandlers';
import { registerPreferencesHandlers } from './main/ipc/preferencesHandlers';
import {
  registerNotificationHandlers,
  setNotificationMainWebContents,
} from './main/ipc/notificationHandlers';
import { getFocusEngine } from './main/focus/focusEngine';
import {
  registerDevNotificationHarness,
  unregisterDevNotificationHarness,
} from './main/notifications/devNotificationHarness';
import { getNotificationService } from './main/notifications/notificationService';
import { setMainWindow } from './main/notifications/mainWindowRegistry';
import { registerAppProcessDiagnostics, registerPowerMonitorDiagnostics } from './main/diagnostics/registerAppDiagnostics';
import { registerMainWindowDiagnostics } from './main/diagnostics/registerMainWindowDiagnostics';
import { registerDiagnosticsHandlers } from './main/ipc/diagnosticsHandlers';
import {
  registerDevDiagnosticsShortcut,
  unregisterDevDiagnosticsShortcut,
} from './main/diagnostics/registerDevDiagnosticsShortcut';
import {
  registerDevHeapSnapshotShortcut,
  unregisterDevHeapSnapshotShortcut,
} from './main/diagnostics/registerDevHeapSnapshotShortcut';
import {
  registerMemoryDiagnosticsSampler,
  unregisterMemoryDiagnosticsSampler,
} from './main/diagnostics/registerMemoryDiagnosticsSampler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setMainWindow(mainWindow);
  setActivityWebContents(mainWindow.webContents);
  setNotificationMainWebContents(mainWindow.webContents);

  const loadTarget = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

  registerMainWindowDiagnostics(mainWindow, { loadTarget });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(loadTarget);
  }

  mainWindow.on('closed', () => {
    setMainWindow(null);
    setActivityWebContents(null);
    setNotificationMainWebContents(null);
  });
};

app.on('ready', async () => {
  registerAppProcessDiagnostics();
  registerPowerMonitorDiagnostics();
  registerDiagnosticsHandlers();
  getFocusEngine();
  getBreakEngine().setOnBreakCompleted((breakSessionId) => {
    getNotificationService().enqueueFromTrigger({
      triggerKey: 'break-complete',
      facts: {},
      priorityScore: 100,
      dedupKey: `break-complete:${breakSessionId}`,
    });
  });
  getNotificationService();
  registerFocusHandlers();
  registerBreakHandlers();
  registerAuthContextHandlers();
  registerCoachHandlers();
  registerPreferencesHandlers();
  registerCalendarHandlers();
  registerNotificationHandlers();
  await bootstrapActivityProvider();
  registerActivityHandlers();
  getActivityTracker();
  createWindow();
  registerDevNotificationHarness();
  registerDevDiagnosticsShortcut();
  registerDevHeapSnapshotShortcut();
  registerMemoryDiagnosticsSampler();
});

app.on('before-quit', () => {
  unregisterDevDiagnosticsShortcut();
  unregisterDevHeapSnapshotShortcut();
  unregisterMemoryDiagnosticsSampler();
  unregisterDevNotificationHarness();
  getActivityTracker().shutdown();
  getNotificationService().shutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
