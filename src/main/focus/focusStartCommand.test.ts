import { beforeEach, describe, expect, it } from 'vitest';
import { BreakEngine, resetBreakEngineForTests } from './breakEngine';
import { FocusEngine, resetFocusEngineForTests } from './focusEngine';
import { tryStartFocus } from './focusStartCommand';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import { createMockFocusedMainWindow } from '../notifications/testHarness';
import { setMainWindow } from '../notifications/mainWindowRegistry';
import { resetNotificationServiceForTests } from '../notifications/notificationService';

const TEST_USER_ID = 'test-user-id';

describe('tryStartFocus', () => {
  beforeEach(() => {
    resetAuthContextSnapshotForTests();
    resetFocusEngineForTests();
    resetBreakEngineForTests();
    applyAuthContextSnapshot(TEST_USER_ID, 1, 1, 'UTC');
    setMainWindow(createMockFocusedMainWindow());
    resetNotificationServiceForTests();
  });

  it('starts focus when idle', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);

    const result = tryStartFocus();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.activeSession).not.toBeNull();
    }
  });

  it('ends active break without break_complete and starts focus', () => {
    const clock = { now: () => 1_000 };
    const focusEngine = resetFocusEngineForTests(new FocusEngine(clock.now));
    focusEngine.setAuthContext(TEST_USER_ID);

    const breakEngine = resetBreakEngineForTests(new BreakEngine(clock.now));
    breakEngine.setAuthContext(TEST_USER_ID);
    breakEngine.start(5);

    const result = tryStartFocus();

    expect(result.ok).toBe(true);
    expect(breakEngine.getState().activeBreak).toBeNull();
    expect(focusEngine.getState().activeSession).not.toBeNull();
  });

  it('rejects when pending completion exists', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.start();
    focusEngine.stop();

    const result = tryStartFocus();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Finish saving');
    }
  });
});
