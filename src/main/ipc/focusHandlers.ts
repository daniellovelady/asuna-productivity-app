import { ipcMain } from 'electron';
import { getFocusEngine } from '../focus/focusEngine';
import { FocusEngineError } from '../../shared/focus/types';

function handleFocusError(error: unknown): never {
  if (error instanceof FocusEngineError) {
    throw new Error(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('Unexpected focus engine error.');
}

export function registerFocusHandlers(): void {
  ipcMain.handle('focus:getState', () => {
    try {
      return getFocusEngine().getState();
    } catch (error) {
      handleFocusError(error);
    }
  });

  ipcMain.handle('focus:setDuration', (_event, payload: unknown) => {
    try {
      if (
        typeof payload !== 'object'
        || payload === null
        || !('minutes' in payload)
      ) {
        throw new Error('Invalid duration payload.');
      }

      return getFocusEngine().setDuration((payload as { minutes: unknown }).minutes);
    } catch (error) {
      handleFocusError(error);
    }
  });

  ipcMain.handle('focus:start', () => {
    try {
      return getFocusEngine().start();
    } catch (error) {
      handleFocusError(error);
    }
  });

  ipcMain.handle('focus:pause', () => {
    try {
      return getFocusEngine().pause();
    } catch (error) {
      handleFocusError(error);
    }
  });

  ipcMain.handle('focus:resume', () => {
    try {
      return getFocusEngine().resume();
    } catch (error) {
      handleFocusError(error);
    }
  });

  ipcMain.handle('focus:stop', () => {
    try {
      return getFocusEngine().stop();
    } catch (error) {
      handleFocusError(error);
    }
  });
}
