import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { bootstrapActivityProvider, getActivityTracker } from './main/activity/activityTracker';
import { registerActivityHandlers, setActivityWebContents } from './main/ipc/activityHandlers';
import { registerFocusHandlers } from './main/ipc/focusHandlers';
import { getFocusEngine } from './main/focus/focusEngine';

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

  setActivityWebContents(mainWindow.webContents);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => {
    setActivityWebContents(null);
  });
};

app.on('ready', async () => {
  getFocusEngine();
  registerFocusHandlers();
  await bootstrapActivityProvider();
  registerActivityHandlers();
  getActivityTracker();
  createWindow();
});

app.on('before-quit', () => {
  getActivityTracker().shutdown();
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
