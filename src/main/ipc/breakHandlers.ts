import { ipcMain } from 'electron';
import { getBreakEngine } from '../focus/breakEngine';
import { BreakEngineError } from '../../shared/focus/breakTypes';

function handleBreakError(error: unknown): never {
  if (error instanceof BreakEngineError) {
    throw new Error(error.message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error('Unexpected break engine error.');
}

export function registerBreakHandlers(): void {
  ipcMain.handle('break:getState', () => {
    try {
      return getBreakEngine().getState();
    } catch (error) {
      handleBreakError(error);
    }
  });

  ipcMain.handle('break:endEarly', () => {
    try {
      getBreakEngine().endEarly('manual');
      return getBreakEngine().getState();
    } catch (error) {
      handleBreakError(error);
    }
  });
}
