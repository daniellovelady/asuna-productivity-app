import { describe, expect, it } from 'vitest';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { buildInAppQueueState } from './inAppPresenter';
import { createMockFocusedMainWindow } from './testHarness';
import { setMainWindow } from './mainWindowRegistry';
import { resolveSafePreferencesForNotification } from './resolveSafePreferences';
import { resetNotificationServiceForTests } from './notificationService';
import type { AsunaNotification } from '../../shared/notifications/types';

function sampleNotification(overrides: Partial<AsunaNotification> = {}): AsunaNotification {
  return {
    id: 'n-1',
    type: 'focus_encouragement',
    title: 'A.S.U.N.A.',
    message: 'Keep going',
    baseTemplate: 'Keep going',
    triggerKey: 'encouragement',
    facts: {},
    avatarState: 'encouraging',
    priority: 'low',
    priorityScore: 10,
    supportedActions: ['dismiss'],
    desktopEligible: true,
    createdAt: 0,
    shownAt: null,
    ttlMs: 12_000,
    expiresAt: null,
    ownerUserId: 'user-a',
    presentation: null,
    variationGeneration: 0,
    legacyMessageType: 'encouragement',
    ...overrides,
  };
}

describe('NotificationService', () => {
  it('rejects enqueue without auth context', () => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    const service = resetNotificationServiceForTests();

    const result = service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-1',
    });

    expect(result).toBe(false);
  });

  it('stamps ownerUserId from authContextSnapshot', () => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-2',
    });

    const state = service.getInAppQueueState();
    expect(state.current).not.toBeNull();
  });

  it('suppresses encouragement in quiet mode but not focus_complete', () => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, { ...DEFAULT_USER_PREFERENCES, quietMode: true });
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    expect(service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-quiet',
    })).toBe(false);

    expect(service.enqueueFromTrigger({
      triggerKey: 'celebration',
      facts: { minutes: 25 },
      priorityScore: 100,
      dedupKey: 'complete-quiet',
    })).toBe(true);

    expect(service.enqueueFromTrigger({
      triggerKey: 'focus-start',
      facts: { minutes: 25, contextPhrase: '' },
      priorityScore: 85,
      dedupKey: 'started-quiet',
    })).toBe(true);
  });

  it('clears notifications for prior account on auth change', () => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'enc-auth',
    });

    applyAuthContextSnapshot('user-b', 2, 1, 'UTC');
    service.handleAuthContextChange('user-b');

    expect(service.getInAppQueueState().current).toBeNull();
  });

  it('ignores stale variation for dismissed notification', () => {
    resetAuthContextSnapshotForTests();
    resetPreferencesSnapshotForTests();
    applyAuthContextSnapshot('user-a', 1, 1, 'UTC');
    applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
    setMainWindow(createMockFocusedMainWindow());
    const service = resetNotificationServiceForTests();

    service.enqueueFromTrigger({
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: 'var-1',
    });

    const current = service.getInAppQueueState().current;
    expect(current).not.toBeNull();
    service.dismiss(current!.id);

    const applied = service.applyVariation(current!.id, 0, 'New template {minutes}');
    expect(applied).toBe(false);
  });

  describe('preference owner-match readiness', () => {
    it('suppresses focus_encouragement when B auth is accepted but stale A preferences remain', () => {
      resetAuthContextSnapshotForTests();
      resetPreferencesSnapshotForTests();
      applyAuthContextSnapshot('user-b', 1, 1, 'UTC');
      applyPreferencesSnapshot('user-a', 1, {
        ...DEFAULT_USER_PREFERENCES,
        quietMode: false,
        avatarStyle: 'energetic',
      });
      setMainWindow(createMockFocusedMainWindow());
      const service = resetNotificationServiceForTests();

      expect(service.enqueueFromTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: 'enc-stale-prefs',
      })).toBe(false);
      expect(service.getInAppQueueState().current).toBeNull();
    });

    it('allows focus_complete with default presentation when B auth has stale A preferences', () => {
      resetAuthContextSnapshotForTests();
      resetPreferencesSnapshotForTests();
      applyAuthContextSnapshot('user-b', 1, 1, 'UTC');
      applyPreferencesSnapshot('user-a', 1, {
        ...DEFAULT_USER_PREFERENCES,
        avatarStyle: 'energetic',
        aiMessageVariationEnabled: true,
      });
      setMainWindow(createMockFocusedMainWindow());
      const service = resetNotificationServiceForTests();

      expect(service.enqueueFromTrigger({
        triggerKey: 'celebration',
        facts: { minutes: 25 },
        priorityScore: 100,
        dedupKey: 'complete-stale-prefs',
      })).toBe(true);

      const current = service.getInAppQueueState().current;
      expect(current?.type).toBe('celebration');
      expect(current?.text).toContain('25');

      const prefs = resolveSafePreferencesForNotification('user-b');
      expect(prefs.ownerMatched).toBe(false);
      expect(prefs.avatarStyle).toBe('default');
      expect(prefs.aiMessageVariationEnabled).toBe(false);
    });

    it('follows B quiet mode for future encouragement after B preferences load', () => {
      resetAuthContextSnapshotForTests();
      resetPreferencesSnapshotForTests();
      applyAuthContextSnapshot('user-b', 1, 1, 'UTC');
      applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
      setMainWindow(createMockFocusedMainWindow());
      const service = resetNotificationServiceForTests();

      expect(service.enqueueFromTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: 'enc-before-load',
      })).toBe(false);

      applyPreferencesSnapshot('user-b', 2, {
        ...DEFAULT_USER_PREFERENCES,
        quietMode: true,
      });
      service.applyPreferences();

      expect(service.enqueueFromTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: 'enc-after-quiet-load',
      })).toBe(false);

      applyPreferencesSnapshot('user-b', 3, {
        ...DEFAULT_USER_PREFERENCES,
        quietMode: false,
      });
      service.applyPreferences();

      expect(service.enqueueFromTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: 'enc-after-ready',
      })).toBe(true);
    });

    it('does not replay suppressed proactive notification when preferences load', () => {
      resetAuthContextSnapshotForTests();
      resetPreferencesSnapshotForTests();
      applyAuthContextSnapshot('user-b', 1, 1, 'UTC');
      applyPreferencesSnapshot('user-a', 1, DEFAULT_USER_PREFERENCES);
      setMainWindow(createMockFocusedMainWindow());
      const service = resetNotificationServiceForTests();

      expect(service.enqueueFromTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: 'enc-no-replay',
      })).toBe(false);

      applyPreferencesSnapshot('user-b', 2, {
        ...DEFAULT_USER_PREFERENCES,
        quietMode: false,
      });
      service.applyPreferences();

      expect(service.getInAppQueueState().current).toBeNull();
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });
  });
});

describe('buildInAppQueueState', () => {
  it('uses pendingCount convention for desktop current', () => {
    const state = buildInAppQueueState(
      sampleNotification({ presentation: 'desktop' }),
      2,
    );

    expect(state.current).toBeNull();
    expect(state.pendingCount).toBe(2);
  });

  it('populates current only for in-app presentation', () => {
    const state = buildInAppQueueState(
      sampleNotification({ presentation: 'in_app' }),
      1,
    );

    expect(state.current?.type).toBe('encouragement');
    expect(state.pendingCount).toBe(1);
  });
});
