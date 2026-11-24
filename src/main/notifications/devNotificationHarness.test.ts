import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationTriggerInput } from '../../shared/notifications/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';



const mockUnregister = vi.hoisted(() => vi.fn(() => true));

const mockRegister = vi.hoisted(() => vi.fn(() => true));



vi.mock('electron', () => ({

  app: { isPackaged: false },

  globalShortcut: {

    register: mockRegister,

    unregister: mockUnregister,

  },

}));



import {

  buildDevEncouragementTrigger,

  buildDevFocusCompleteTrigger,

  dismissDevCurrentNotification,

  formatDevQueueDiagnostics,

  getRegisteredDevNotificationShortcuts,

  isDevNotificationHarnessEnabled,

  registerDevNotificationHarness,

  resetDevNotificationHarnessStateForTests,

  triggerDevEncouragement,

  triggerDevFocusComplete,

  unregisterDevNotificationHarness,

  DEV_DISMISS_SHORTCUT,

  DEV_NOTIFICATION_HARNESS_ENV,

} from './devNotificationHarness';



describe('devNotificationHarness', () => {

  beforeEach(() => {

    resetDevNotificationHarnessStateForTests();
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();

    mockRegister.mockClear();

    mockUnregister.mockClear();

    delete process.env[DEV_NOTIFICATION_HARNESS_ENV];

  });



  it('is disabled when app.isPackaged is true', () => {

    expect(isDevNotificationHarnessEnabled(true, '1')).toBe(false);

  });



  it('is disabled without ASUNA_DEV_NOTIFICATION_HARNESS=1', () => {

    expect(isDevNotificationHarnessEnabled(false, undefined)).toBe(false);

    expect(isDevNotificationHarnessEnabled(false, '0')).toBe(false);

  });



  it('is enabled only when unpackaged and env opt-in is set', () => {

    expect(isDevNotificationHarnessEnabled(false, '1')).toBe(true);

  });



  it('uses canonical encouragement trigger input on enqueue path', () => {

    const enqueue = vi.fn(() => true);

    const log = vi.fn();



    triggerDevEncouragement(enqueue, () => 'user-1', log, 1, 123);



    expect(enqueue).toHaveBeenCalledWith(buildDevEncouragementTrigger(1, 123));

  });



  it('logs queue diagnostics after encouragement emit', () => {

    const enqueue = vi.fn(() => true);

    const log = vi.fn();



    triggerDevEncouragement(

      enqueue,

      () => 'user-1',

      log,

      1,

      123,

      () => ({ currentType: 'focus_encouragement', pendingCount: 0 }),

    );



    expect(log).toHaveBeenCalledWith(

      '[dev-notification-harness] emitted focus_encouragement current=focus_encouragement pending=0',

    );

  });



  it('uses canonical focus_complete trigger input on enqueue path', () => {

    const enqueue = vi.fn(() => true);

    const log = vi.fn();

    applyPreferencesSnapshot('user-1', 1, { ...DEFAULT_USER_PREFERENCES, breakMinutes: 5 });



    triggerDevFocusComplete(enqueue, () => 'user-1', log, 2, 456);



    expect(enqueue).toHaveBeenCalledWith(buildDevFocusCompleteTrigger(2, 456, 5));

    expect(buildDevFocusCompleteTrigger(2, 456, 5).facts.minutes).toBe(25);

  });

  it('uses owner-matched breakMinutes=1 in synthetic focus_complete facts', () => {
    applyPreferencesSnapshot('user-1', 1, { ...DEFAULT_USER_PREFERENCES, breakMinutes: 1 });
    const enqueue = vi.fn(() => true);

    triggerDevFocusComplete(enqueue, () => 'user-1', vi.fn(), 1, 100);

    expect(enqueue).toHaveBeenCalledWith(
      buildDevFocusCompleteTrigger(1, 100, 1),
    );
    expect(enqueue.mock.calls[0]?.[0].facts.breakMinutes).toBe(1);
  });

  it('uses owner-matched breakMinutes=10 in synthetic focus_complete facts', () => {
    applyPreferencesSnapshot('user-1', 1, { ...DEFAULT_USER_PREFERENCES, breakMinutes: 10 });
    const enqueue = vi.fn(() => true);

    triggerDevFocusComplete(enqueue, () => 'user-1', vi.fn(), 2, 200);

    expect(enqueue.mock.calls[0]?.[0].facts.breakMinutes).toBe(10);
  });

  it('suppresses synthetic focus_complete when preference owner does not match auth', () => {
    applyPreferencesSnapshot('user-other', 1, { ...DEFAULT_USER_PREFERENCES, breakMinutes: 10 });
    const enqueue = vi.fn(() => true);
    const log = vi.fn();

    expect(triggerDevFocusComplete(enqueue, () => 'user-1', log, 3, 300)).toBe(false);
    expect(enqueue).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      '[dev-notification-harness] focus_complete not emitted; owner-matched break preferences unavailable.',
    );
  });



  it('logs queue diagnostics after focus_complete emit', () => {

    const enqueue = vi.fn(() => true);

    const log = vi.fn();

    applyPreferencesSnapshot('user-1', 1, DEFAULT_USER_PREFERENCES);



    triggerDevFocusComplete(

      enqueue,

      () => 'user-1',

      log,

      2,

      456,

      () => ({ currentType: 'focus_complete', pendingCount: 2 }),

    );



    expect(log).toHaveBeenCalledWith(

      '[dev-notification-harness] emitted focus_complete current=focus_complete pending=2',

    );

    expect(formatDevQueueDiagnostics({ currentType: 'focus_complete', pendingCount: 2 }))

      .toBe('current=focus_complete pending=2');

  });



  it('does not invoke FocusEngine or persistence from focus_complete dev trigger', () => {

    const enqueue = vi.fn((input: NotificationTriggerInput) => {

      expect(input.triggerKey).toBe('celebration');

      expect(input.source).toBe('dev_test');

      return true;

    });

    applyPreferencesSnapshot('user-1', 1, DEFAULT_USER_PREFERENCES);



    triggerDevFocusComplete(enqueue, () => 'user-1', vi.fn(), 3, 789);



    expect(enqueue).toHaveBeenCalledTimes(1);

  });



  it('does not emit when auth is missing', () => {

    const enqueue = vi.fn(() => true);

    const log = vi.fn();



    expect(triggerDevEncouragement(enqueue, () => null, log, 1, 100)).toBe(false);

    expect(triggerDevFocusComplete(enqueue, () => null, log, 2, 200)).toBe(false);

    expect(enqueue).not.toHaveBeenCalled();

    expect(log).toHaveBeenCalled();

  });



  it('dismiss shortcut uses canonical dismiss path', () => {

    const dismissCurrent = vi.fn(() => true);

    const log = vi.fn();



    expect(dismissDevCurrentNotification(

      dismissCurrent,

      log,

      () => ({ currentType: null, pendingCount: 1 }),

    )).toBe(true);



    expect(dismissCurrent).toHaveBeenCalledTimes(1);

    expect(log).toHaveBeenCalledWith(

      '[dev-notification-harness] dismiss current ok current=none pending=1',

    );

  });



  it('unregister removes only tracked dev shortcuts', () => {

    process.env[DEV_NOTIFICATION_HARNESS_ENV] = '1';

    registerDevNotificationHarness();



    expect(getRegisteredDevNotificationShortcuts()).toEqual([

      'CommandOrControl+Alt+Shift+E',

      'CommandOrControl+Alt+Shift+C',

      'CommandOrControl+Alt+Shift+B',

      DEV_DISMISS_SHORTCUT,

    ]);



    unregisterDevNotificationHarness();



    expect(mockUnregister).toHaveBeenCalledWith('CommandOrControl+Alt+Shift+E');

    expect(mockUnregister).toHaveBeenCalledWith('CommandOrControl+Alt+Shift+C');

    expect(mockUnregister).toHaveBeenCalledWith(DEV_DISMISS_SHORTCUT);

    expect(getRegisteredDevNotificationShortcuts()).toEqual([]);

  });

});


