import { contextBridge, ipcRenderer } from 'electron';
import type { NotificationAction, NotificationViewModel } from './shared/notifications/types';

const notificationApi = {
  signalReady: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('notification:ready'),
  signalRendered: (notificationId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('notification:rendered', { notificationId }),
  dismiss: (notificationId: string): Promise<void> =>
    ipcRenderer.invoke('notification:dismiss', { notificationId }),
  executeAction: (
    notificationId: string,
    action: NotificationAction,
  ): Promise<{ ok: boolean; reason?: string; queueState?: unknown }> =>
    ipcRenderer.invoke('notification:action', { notificationId, action }),
  onDisplay: (callback: (payload: NotificationViewModel) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: NotificationViewModel) => {
      callback(payload);
    };
    ipcRenderer.on('notification:display', listener);
    return () => {
      ipcRenderer.removeListener('notification:display', listener);
    };
  },
  onClear: (callback: () => void): (() => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('notification:clear', listener);
    return () => {
      ipcRenderer.removeListener('notification:clear', listener);
    };
  },
};

contextBridge.exposeInMainWorld('notificationApi', notificationApi);
