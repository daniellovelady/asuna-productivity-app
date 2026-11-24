import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import { applyPreferencesSnapshot, resetPreferencesSnapshotForTests } from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { resetNotificationServiceForTests } from '../notifications/notificationService';
import {
  registerNotificationHandlers,
  setNotificationMainWebContents,
} from './notificationHandlers';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('notificationHandlers sender identity', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-1', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-1', 1, DEFAULT_USER_PREFERENCES);
    resetNotificationServiceForTests();
    vi.clearAllMocks();
    registerNotificationHandlers();
  });

  it('registers handlers for notification IPC channels', () => {
    const channels = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);
    expect(channels).toContain('notification:ready');
    expect(channels).toContain('notification:rendered');
    expect(channels).toContain('notification:dismiss');
    expect(channels).toContain('notification:applyVariation');
  });

  it('rejects applyVariation from non-main renderer', async () => {
    const handlers = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
    const applyHandler = handlers.find((call) => call[0] === 'notification:applyVariation')?.[1];

    setNotificationMainWebContents({ id: 1, isDestroyed: () => false } as Electron.WebContents);

    expect(() => applyHandler?.(
      { sender: { id: 99 } },
      {
        notificationId: 'n-1',
        variationGeneration: 0,
        variedTemplate: 'Updated {minutes}',
      },
    )).toThrow('Unauthorized main renderer sender.');
  });
});
