import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { getMessageTemplate, interpolateTemplate } from '../../shared/assistant/messageTemplates';
import { FocusEngine, resetFocusEngineForTests } from './focusEngine';
import { tryStartFocus } from './focusStartCommand';
import { resetBreakEngineForTests } from './breakEngine';
import { NotificationActionExecutor } from '../notifications/notificationActionExecutor';
import { resetNotificationServiceForTests } from '../notifications/notificationService';
import { createMockFocusedMainWindow, createMockUnfocusedMainWindow } from '../notifications/testHarness';
import { setMainWindow } from '../notifications/mainWindowRegistry';
import { resolvePresentation } from '../notifications/presentationRouter';
import { buildNotification } from '../../shared/notifications/buildNotification';
import type { AsunaNotification } from '../../shared/notifications/types';
import * as focusStartBridge from '../activity/focusStartBridge';

const TEST_USER_ID = 'user-focus-lifecycle';

function countFocusStartedEnqueues(service: ReturnType<typeof resetNotificationServiceForTests>): number {
  return service.getQueueDiagnostics().currentType === 'focus_started' ? 1 : 0;
}

describe('focus start lifecycle notifications', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    resetFocusEngineForTests();
    resetBreakEngineForTests();
    applyAuthContextSnapshot(TEST_USER_ID, 1, 1, 'UTC');
    applyPreferencesSnapshot(TEST_USER_ID, 1, DEFAULT_USER_PREFERENCES);
  });

  it('emits exactly one focus_started for canonical no-context start', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.setDuration(30);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    const result = tryStartFocus({ kind: 'none' });

    expect(result.ok).toBe(true);
    expect(countFocusStartedEnqueues(service)).toBe(1);
    expect(service.getInAppQueueState().current?.text).toBe(
      'Focus session started — 30 minutes.',
    );
  });

  it('includes task title and duration for task-context start', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.setDuration(30);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    tryStartFocus({
      kind: 'task',
      taskId: 'task-1',
      titleSnapshot: 'Finish Lab 4',
    });

    expect(service.getInAppQueueState().current?.text).toBe(
      'Focus session started — 30 minutes for Finish Lab 4.',
    );
  });

  it('includes calendar title for calendar-context start', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.setDuration(45);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    tryStartFocus({
      kind: 'calendar_event',
      calendarId: 'cal-1',
      externalEventId: 'evt-1',
      titleSnapshot: 'Ethics, Law, & Cybersecurity',
      calendarProvider: 'google',
      linkedTaskId: null,
      linkedTaskTitleSnapshot: null,
    });

    expect(service.getInAppQueueState().current?.text).toBe(
      'Focus session started — 45 minutes for Ethics, Law, & Cybersecurity.',
    );
  });

  it('emits one confirmation for linked calendar/task start', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    tryStartFocus({
      kind: 'calendar_event',
      calendarId: 'cal-1',
      externalEventId: 'evt-2',
      titleSnapshot: 'Team sync',
      calendarProvider: 'google',
      linkedTaskId: 'task-9',
      linkedTaskTitleSnapshot: 'Prep notes',
    });

    expect(countFocusStartedEnqueues(service)).toBe(1);
    expect(service.getInAppQueueState().current?.text).toContain('Team sync');
  });

  it('emits one focus_started when break complete starts focus', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();
    const executor = new NotificationActionExecutor(service);

    const breakNotification: AsunaNotification = {
      id: 'break-1',
      type: 'break_complete',
      title: 'Break complete',
      message: 'Break complete',
      baseTemplate: 'Break complete',
      triggerKey: 'break-complete',
      facts: {},
      avatarState: 'focused',
      priority: 'normal',
      priorityScore: 80,
      supportedActions: ['start_focus', 'dismiss'],
      desktopEligible: true,
      createdAt: 0,
      shownAt: null,
      ttlMs: null,
      expiresAt: null,
      ownerUserId: TEST_USER_ID,
      presentation: 'in_app',
      variationGeneration: 0,
      legacyMessageType: 'break',
    };

    const result = executor.execute(breakNotification, 'start_focus', true);
    expect(result.ok).toBe(true);
    expect(countFocusStartedEnqueues(service)).toBe(1);
    expect(service.getQueueDiagnostics().currentType).toBe('focus_started');
  });

  it('does not emit focus_started on rejected double-start', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    expect(tryStartFocus({ kind: 'none' }).ok).toBe(true);
    expect(tryStartFocus({ kind: 'none' }).ok).toBe(false);
    expect(countFocusStartedEnqueues(service)).toBe(1);
  });

  it('does not emit focus_started when auth is missing', () => {
    resetAuthContextSnapshotForTests();
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();
    const handleSpy = vi.spyOn(focusStartBridge, 'handleFocusSessionStarted');

    const result = tryStartFocus({ kind: 'none' });

    expect(result.ok).toBe(false);
    expect(handleSpy).not.toHaveBeenCalled();
    expect(countFocusStartedEnqueues(service)).toBe(0);
    handleSpy.mockRestore();
  });

  it('does not emit when handleFocusSessionStarted is never reached on engine failure', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.start();
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();
    const handleSpy = vi.spyOn(focusStartBridge, 'handleFocusSessionStarted');

    const result = tryStartFocus({ kind: 'none' });

    expect(result.ok).toBe(false);
    expect(handleSpy).not.toHaveBeenCalled();
    expect(countFocusStartedEnqueues(service)).toBe(0);
    handleSpy.mockRestore();
  });

  it('is not suppressed by quiet mode', () => {
    applyPreferencesSnapshot(TEST_USER_ID, 2, {
      ...DEFAULT_USER_PREFERENCES,
      quietMode: true,
    });
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    expect(tryStartFocus({ kind: 'none' }).ok).toBe(true);
    expect(countFocusStartedEnqueues(service)).toBe(1);
  });

  it('routes to in-app presentation when main window is focused', () => {
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);

    tryStartFocus({ kind: 'none' });

    expect(service.getInAppQueueState().current).not.toBeNull();
    expect(service.getQueueDiagnostics().currentType).toBe('focus_started');
  });

  it('is desktop eligible when main window is unfocused', () => {
    const notification = buildNotification(
      {
        triggerKey: 'focus-start',
        facts: { minutes: 25, contextPhrase: '' },
        priorityScore: 85,
        dedupKey: 'focus-started:test',
      },
      TEST_USER_ID,
      'neutral',
      0,
    );

    expect(resolvePresentation(notification, createMockUnfocusedMainWindow())).toBe('desktop');
    expect(resolvePresentation(notification, createMockFocusedMainWindow())).toBe('in_app');
  });

  it('uses neutral deterministic template wording', () => {
    const template = getMessageTemplate('focus-start', 'neutral');
    expect(interpolateTemplate(template, { minutes: 30, contextPhrase: ' for Finish Lab 4' }))
      .toBe('Focus session started — 30 minutes for Finish Lab 4.');
    expect(interpolateTemplate(template, { minutes: 30, contextPhrase: '' }))
      .toBe('Focus session started — 30 minutes.');
  });
});
