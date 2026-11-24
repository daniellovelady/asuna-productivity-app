import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { setMainWindow } from './mainWindowRegistry';
import {
  getNotificationService,
  NotificationService,
  resetNotificationServiceForTests,
} from './notificationService';

const mockShowInactive = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());

vi.mock('electron', () => {
  function MockBrowserWindow() {
    return {
      webContents: {
        send: mockSend,
        on: vi.fn(),
        id: 99,
        isDestroyed: () => false,
      },
      setVisibleOnAllWorkspaces: vi.fn(),
      on: vi.fn(),
      setBounds: vi.fn(),
      showInactive: mockShowInactive,
      hide: vi.fn(),
      destroy: vi.fn(),
      isDestroyed: () => false,
      loadURL: vi.fn(),
      loadFile: vi.fn(),
    };
  }

  return {
    BrowserWindow: MockBrowserWindow,
  screen: {
    getCursorScreenPoint: () => ({ x: 500, y: 500 }),
    getDisplayNearestPoint: () => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
    getPrimaryDisplay: () => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
    }),
  },
  };
});

function createMockUnfocusedMainWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    isFocused: () => false,
    getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  } as BrowserWindow;
}

describe('NotificationService desktop presentation handshake', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
    setMainWindow(createMockUnfocusedMainWindow());
    mockShowInactive.mockClear();
    mockSend.mockClear();
    resetNotificationServiceForTests();
  });

  it('keeps desktop notification hidden until rendered acknowledgement', () => {
    const service = getNotificationService();

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'desktop-1',
    });

    expect(mockShowInactive).not.toHaveBeenCalled();
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');

    service.handleDesktopReady();
    expect(mockSend).toHaveBeenCalled();
    expect(mockShowInactive).not.toHaveBeenCalled();

    const current = service.getInAppQueueState().current;
    expect(current).toBeNull();
  });

  it('marks presented and shows only after matching rendered acknowledgement', () => {
    const service = getNotificationService();
    const now = vi.spyOn(Date, 'now').mockReturnValue(5_000);

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'desktop-2',
    });

    service.handleDesktopReady();
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');

    const awaitingId = service.getDesktopPresenter().getAwaitingRenderedId();
    expect(awaitingId).not.toBeNull();

    service.handleDesktopRendered('stale-id');
    expect(mockShowInactive).not.toHaveBeenCalled();

    service.handleDesktopRendered(awaitingId!);
    expect(mockShowInactive).toHaveBeenCalledTimes(1);

    now.mockRestore();
  });

  it('starts TTL only after visible presentation', () => {
    let currentTime = 1_000;
    const service = resetNotificationServiceForTests(new NotificationService(() => currentTime));

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'desktop-ttl',
    });

    service.handleDesktopReady();
    const awaitingId = service.getDesktopPresenter().getAwaitingRenderedId();
    expect(awaitingId).not.toBeNull();

    currentTime = 999_999;
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');

    currentTime = 4_000;
    service.handleDesktopRendered(awaitingId as string);

    currentTime = 15_999;
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');

    currentTime = 16_001;
    expect(service.getQueueDiagnostics().currentType).toBeNull();
  });

  it('queues encouragement behind persistent focus_complete', () => {
    const service = getNotificationService();

    service.enqueueFromTrigger({
      triggerKey: 'celebration',
      facts: { minutes: 25 },
      priorityScore: 100,
      dedupKey: 'complete-1',
    });

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-queued-1',
    });

    const diagnostics = service.getQueueDiagnostics();
    expect(diagnostics.currentType).toBe('focus_complete');
    expect(diagnostics.pendingCount).toBe(1);
  });

  it('promotes queued notification after dismissing persistent focus_complete', () => {
    const service = getNotificationService();

    service.enqueueFromTrigger({
      triggerKey: 'celebration',
      facts: { minutes: 25 },
      priorityScore: 100,
      dedupKey: 'complete-2',
    });

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-queued-2',
    });

    service.handleDesktopReady();
    const completeId = service.getDesktopPresenter().getAwaitingRenderedId();
    service.handleDesktopRendered(completeId!);

    service.dismissCurrentNotification();

    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');
    expect(service.getQueueDiagnostics().pendingCount).toBe(0);
  });

  it('dismissCurrentNotification uses canonical dismiss path', () => {
    const service = getNotificationService();

    service.enqueueFromTrigger({
      triggerKey: 'celebration',
      facts: { minutes: 25 },
      priorityScore: 100,
      dedupKey: 'complete-3',
    });

    expect(service.dismissCurrentNotification()).toBe(true);
    expect(service.getQueueDiagnostics().currentType).toBeNull();
    expect(service.dismissCurrentNotification()).toBe(false);
  });
});
