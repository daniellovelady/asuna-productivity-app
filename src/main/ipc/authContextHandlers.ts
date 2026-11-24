import { ipcMain } from 'electron';
import { applyAuthContextToRuntime } from '../auth/applyAuthContextToRuntime';
import {
  applyAuthContextSnapshot,
  registerRendererGeneration,
} from '../auth/authContextSnapshot';

function isAuthContextPayload(value: unknown): value is {
  userId: string | null;
  sequence: number;
  generation: number;
  timeZone: string;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.sequence === 'number'
    && typeof record.generation === 'number'
    && typeof record.timeZone === 'string'
    && record.timeZone.length > 0
    && (record.userId === null || typeof record.userId === 'string');
}

export function registerAuthContextHandlers(): void {
  ipcMain.handle('auth:registerRenderer', () => {
    return { generation: registerRendererGeneration() };
  });

  ipcMain.handle('auth:setContext', (_event, payload: unknown) => {
    if (!isAuthContextPayload(payload)) {
      throw new Error('Invalid auth context payload.');
    }

    const applied = applyAuthContextSnapshot(
      payload.userId,
      payload.sequence,
      payload.generation,
      payload.timeZone,
    );

    if (applied) {
      applyAuthContextToRuntime(payload.userId);
    }

    return { applied };
  });
}
