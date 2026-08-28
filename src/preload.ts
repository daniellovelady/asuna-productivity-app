import { contextBridge, ipcRenderer } from 'electron';
import type {
  CompletedFocusSession,
  FocusEngineState,
} from './shared/focus/types';

const focusApi = {
  getState: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:getState'),
  setDuration: (minutes: number): Promise<FocusEngineState> =>
    ipcRenderer.invoke('focus:setDuration', { minutes }),
  start: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:start'),
  pause: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:pause'),
  resume: (): Promise<FocusEngineState> => ipcRenderer.invoke('focus:resume'),
  stop: (): Promise<{ state: FocusEngineState; completed: CompletedFocusSession }> =>
    ipcRenderer.invoke('focus:stop'),
};

contextBridge.exposeInMainWorld('focusApi', focusApi);
