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
  NotificationService,
  resetNotificationServiceForTests,
} from './notificationService';

const mockShowInactive = vi.hoisted(() => vi.fn());
const mockHide = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());
const mockBrowserWindow = vi.hoisted(() => vi.fn());

vi.mock('electron', () => {
  function MockBrowserWindow() {
    return mockBrowserWindow();
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

function createService(clock: () => number): NotificationService {
  return resetNotificationServiceForTests(new NotificationService(clock));
}

function presentDesktop(
  service: NotificationService,
  triggerKey: 'encouragement' | 'celebration',
  dedupKey: string,
): string {
  service.enqueueFromTrigger({
    triggerKey,
    facts: triggerKey === 'celebration' ? { minutes: 25 } : {},
    priorityScore: triggerKey === 'celebration' ? 100 : 10,
    dedupKey,
  });
  service.handleDesktopReady();
  const awaitingId = service.getDesktopPresenter().getAwaitingRenderedId();
  expect(awaitingId).not.toBeNull();
  service.handleDesktopRendered(awaitingId as string);
  return awaitingId as string;
}

describe('desktop notification reuse', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
    setMainWindow(createMockUnfocusedMainWindow());
    mockShowInactive.mockClear();
    mockHide.mockClear();
    mockSend.mockClear();
    mockBrowserWindow.mockClear();
    mockBrowserWindow.mockImplementation(() => ({
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
      hide: mockHide,
      destroy: vi.fn(),
      isDestroyed: () => false,
      loadURL: vi.fn(),
      loadFile: vi.fn(),
    }));
  });

  it('A) presents E1, expires, then presents and shows E2', () => {
    let currentTime = 1_000;
    const service = createService(() => currentTime);

    presentDesktop(service, 'encouragement', 'reuse-e1');
    expect(mockShowInactive).toHaveBeenCalledTimes(1);

    currentTime = 13_001;
    expect(service.getQueueDiagnostics().currentType).toBeNull();
    expect(mockHide).toHaveBeenCalled();

    presentDesktop(service, 'encouragement', 'reuse-e2');
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');
  });

  it('B) presents E, expires, then presents persistent C', () => {
    let currentTime = 1_000;
    const service = createService(() => currentTime);

    presentDesktop(service, 'encouragement', 'reuse-b-e');
    currentTime = 13_001;
    expect(service.getQueueDiagnostics().currentType).toBeNull();

    const completeId = presentDesktop(service, 'celebration', 'reuse-b-c');
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
    expect(service.getQueueDiagnostics().currentType).toBe('focus_complete');

    currentTime = 99_999;
    expect(service.getQueueDiagnostics().currentType).toBe('focus_complete');
    expect(service.getDesktopPresenter().getAwaitingRenderedId()).toBeNull();

    service.handleDesktopRendered(completeId);
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
  });

  it('C) dismisses persistent C and promotes queued E', () => {
    const service = createService(() => 1_000);

    presentDesktop(service, 'celebration', 'reuse-c-complete');
    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'reuse-c-enc',
    });

    expect(service.getQueueDiagnostics().pendingCount).toBe(1);
    service.dismissCurrentNotification();

    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');
    expect(mockHide).toHaveBeenCalled();

    service.handleDesktopReady();
    const promotedId = service.getDesktopPresenter().getAwaitingRenderedId();
    expect(promotedId).not.toBeNull();
    service.handleDesktopRendered(promotedId as string);
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
  });

  it('D) ignores stale rendered(E1) after E1 finishes and E2 becomes current', () => {
    const service = createService(() => 1_000);

    const e1Id = presentDesktop(service, 'encouragement', 'reuse-d-e1');
    service.dismissCurrentNotification();

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'reuse-d-e2',
    });
    service.handleDesktopReady();
    const e2Id = service.getDesktopPresenter().getAwaitingRenderedId();
    expect(e2Id).not.toBeNull();

    service.handleDesktopRendered(e1Id);
    expect(mockShowInactive).toHaveBeenCalledTimes(1);

    service.handleDesktopRendered(e2Id as string);
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
    expect(e2Id).not.toBe(e1Id);
  });

  it('E) reuses a single BrowserWindow across notifications', () => {
    const service = createService(() => 1_000);

    presentDesktop(service, 'encouragement', 'reuse-window-1');
    service.dismissCurrentNotification();
    presentDesktop(service, 'encouragement', 'reuse-window-2');

    expect(mockBrowserWindow).toHaveBeenCalledTimes(1);
  });

  it('F) TTL expiration leaves current null when nothing is pending', () => {
    let currentTime = 1_000;
    const service = createService(() => currentTime);

    presentDesktop(service, 'encouragement', 'reuse-f-e');
    currentTime = 13_001;

    expect(service.getQueueDiagnostics().currentType).toBeNull();
    expect(service.getQueueDiagnostics().pendingCount).toBe(0);
  });

  it('G) TTL expiration promotes pending notification', () => {
    let currentTime = 1_000;
    const service = createService(() => currentTime);

    presentDesktop(service, 'encouragement', 'reuse-g-e1');
    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'reuse-g-e2',
    });
    expect(service.getQueueDiagnostics().pendingCount).toBe(1);

    currentTime = 13_001;
    expect(service.getQueueDiagnostics().currentType).toBe('focus_encouragement');
    expect(service.getQueueDiagnostics().pendingCount).toBe(0);

    service.handleDesktopReady();
    const promotedId = service.getDesktopPresenter().getAwaitingRenderedId();
    expect(promotedId).not.toBeNull();
    service.handleDesktopRendered(promotedId as string);
    expect(mockShowInactive).toHaveBeenCalledTimes(2);
  });
});
