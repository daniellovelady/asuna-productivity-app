import { beforeEach, describe, expect, it } from 'vitest';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import { getBreakEngine, resetBreakEngineForTests } from '../focus/breakEngine';
import { resetFocusEngineForTests } from '../focus/focusEngine';
import { NotificationActionExecutor } from './notificationActionExecutor';
import { NotificationService, resetNotificationServiceForTests } from './notificationService';
import { createMockFocusedMainWindow } from './testHarness';
import { setMainWindow } from './mainWindowRegistry';
import type { AsunaNotification } from '../../shared/notifications/types';

const TEST_USER_ID = 'user-a';

function sampleNotification(overrides: Partial<AsunaNotification> = {}): AsunaNotification {
  return {
    id: 'n-1',
    type: 'focus_complete',
    title: 'Focus session complete',
    message: 'Done',
    baseTemplate: 'Done',
    triggerKey: 'celebration',
    facts: { minutes: 25, breakMinutes: 10, sessionId: 'session-1' },
    avatarState: 'celebrating',
    priority: 'high',
    priorityScore: 100,
    supportedActions: ['start_break', 'dismiss'],
    desktopEligible: true,
    createdAt: 0,
    shownAt: null,
    ttlMs: null,
    expiresAt: null,
    ownerUserId: TEST_USER_ID,
    presentation: null,
    variationGeneration: 0,
    legacyMessageType: 'celebration',
    ...overrides,
  };
}

describe('NotificationActionExecutor', () => {
  let service: NotificationService;
  let executor: NotificationActionExecutor;

  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetFocusEngineForTests();
    resetBreakEngineForTests();
    applyAuthContextSnapshot(TEST_USER_ID, 1, 1, 'UTC');
    setMainWindow(createMockFocusedMainWindow());
    service = resetNotificationServiceForTests();
    executor = new NotificationActionExecutor(service);
    getBreakEngine().setAuthContext(TEST_USER_ID);
  });

  it('starts break from focus_complete facts', () => {
    const notification = sampleNotification();
    const result = executor.execute(notification, 'start_break', true);

    expect(result.ok).toBe(true);
  });

  it('rejects unsupported action types', () => {
    const notification = sampleNotification();
    const result = executor.execute(notification, 'snooze', true);

    expect(result.ok).toBe(false);
  });

  it('rejects when notification is not current', () => {
    const notification = sampleNotification();
    const result = executor.execute(notification, 'start_break', false);

    expect(result.ok).toBe(false);
  });

  it('rejects start_break for wrong notification type', () => {
    const notification = sampleNotification({ type: 'break_complete', supportedActions: ['start_focus', 'dismiss'] });
    const result = executor.execute(notification, 'start_break', true);

    expect(result.ok).toBe(false);
  });

  it('emits exactly one focus_started when Start Focus succeeds from break_complete', () => {
    const focusEngine = resetFocusEngineForTests();
    focusEngine.setAuthContext(TEST_USER_ID);

    const notification = sampleNotification({
      type: 'break_complete',
      triggerKey: 'break-complete',
      supportedActions: ['start_focus', 'dismiss'],
      legacyMessageType: 'break',
    });

    const result = executor.execute(notification, 'start_focus', true);

    expect(result.ok).toBe(true);
    expect(service.getQueueDiagnostics().currentType).toBe('focus_started');
    expect(service.getInAppQueueState().current?.text).toContain('Focus session started');
  });
});
