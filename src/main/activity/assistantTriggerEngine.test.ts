import { describe, expect, it } from 'vitest';
import {
  DISTRACTION_THRESHOLD_LIGHT_MS,
  OBSERVATION_INTERVAL_MS,
} from '../../shared/activity/constants';
import { getMessageTemplate } from '../../shared/assistant/messageTemplates';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { applyPreferencesSnapshot } from '../preferences/preferencesSnapshot';
import { createNotificationTestHarness } from '../notifications/testHarness';
describe('AssistantTriggerEngine', () => {
  const sessionId = 'focus-session-1';

  const context = {
    trackingRunning: true,
    isIdle: false,
    systemSuspended: false,
    identity: 'vscode',
    classification: 'productive' as const,
    activeTaskCount: 0,
    focusSessionActive: false,
    focusSessionElapsedMs: 0,
  };

  const completed = {
    id: 'session-1',
    ownerUserId: 'test-user',
    targetDurationMs: 25 * 60_000,
    elapsedFocusMs: 25 * 60_000,
    startedAt: 0,
    endedAt: 25 * 60_000,
    accumulatedPausedMs: 0,
    interruptionCount: 0,
    breakTargetMinutes: 5,
    breakTargetOwnerMatched: true,
  };

  describe('focus encouragement', () => {
    it('fires one encouragement at 5 active minutes with HIGH level (tracking not required)', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);

      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('fires exactly two encouragements at 10 active minutes with HIGH level', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 10 * 60_000);

      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(1);
    });

    it('fires first encouragement after pause/resume accumulates 5 active minutes', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 3 * 60_000);
      expect(service.getInAppQueueState().current).toBeNull();

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
    });

    it('does not fire encouragement from paused elapsed time alone', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 3 * 60_000);
      expect(service.getInAppQueueState().current).toBeNull();
    });

    it('fires one encouragement at 10 active minutes with MEDIUM level', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'medium',
      });

      engine.evaluateFocusEncouragement(sessionId, 10 * 60_000);

      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('fires one encouragement at 20 active minutes with LOW level', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'low',
      });

      engine.evaluateFocusEncouragement(sessionId, 20 * 60_000);

      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('advances milestones silently in quiet mode without retroactive bursts', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
        quietMode: true,
      });

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
      expect(service.getInAppQueueState().current).toBeNull();

      const quietOffPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high' as const,
        quietMode: false,
      };
      applyPreferencesSnapshot('test-user', 2, quietOffPreferences);
      engine.applyPreferences(quietOffPreferences);
      service.applyPreferences();

      engine.evaluateFocusEncouragement(sessionId, 10 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('enqueues deterministic template text without AI variation', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
        aiMessageVariationEnabled: false,
      });

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);

      const message = service.getInAppQueueState().current;
      expect(message?.type).toBe('encouragement');
      expect(message?.text).toBe(
        getMessageTemplate('encouragement', DEFAULT_USER_PREFERENCES.reminderTone),
      );
      expect(message?.template).toBeTruthy();
      expect(message?.triggerKey).toBe('encouragement');
    });

    it('clears per-session encouragement state on reset', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');

      engine.resetFocusEncouragement();
      service.clear();

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
    });

    it('starts a fresh schedule for a new focus session', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement('session-a', 10 * 60_000);
      expect(service.getInAppQueueState().pendingCount).toBe(1);

      engine.resetFocusEncouragement();
      service.clear();

      engine.evaluateFocusEncouragement('session-b', 5 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('does not duplicate encouragement at the same milestone boundary', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'high',
      });

      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000 + 500);
      engine.evaluateFocusEncouragement(sessionId, 5 * 60_000 + 999);

      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
      expect(service.getInAppQueueState().pendingCount).toBe(0);
    });

    it('resets encouragement timing anchor when encouragement level changes mid-session', () => {
      const { engine, service } = createNotificationTestHarness({
        ...DEFAULT_USER_PREFERENCES,
        encouragementLevel: 'medium',
      });

      engine.evaluateFocusEncouragement(sessionId, 8 * 60_000);
      expect(service.getInAppQueueState().current).toBeNull();

      engine.applyPreferences({ ...DEFAULT_USER_PREFERENCES, encouragementLevel: 'high' });

      engine.evaluateFocusEncouragement(sessionId, 12 * 60_000);
      expect(service.getInAppQueueState().current).toBeNull();

      engine.evaluateFocusEncouragement(sessionId, 13 * 60_000);
      expect(service.getInAppQueueState().current?.type).toBe('encouragement');
    });

    it('does not fire encouragement from productive activity observations', () => {
      const { engine, service } = createNotificationTestHarness();

      for (let index = 0; index < (10 * 60 * 1000) / OBSERVATION_INTERVAL_MS; index += 1) {
        engine.handleObservation(context);
      }

      expect(service.getInAppQueueState().current).toBeNull();
    });
  });

  it('still enqueues celebration when quiet mode is enabled', () => {
    const { engine, service } = createNotificationTestHarness({
      ...DEFAULT_USER_PREFERENCES,
      quietMode: true,
    });

    engine.enqueueCelebration(completed);
    expect(service.getInAppQueueState().current?.type).toBe('celebration');
  });

  it('clears proactive queue when quiet mode turns on', () => {
    const { engine, service } = createNotificationTestHarness({
      ...DEFAULT_USER_PREFERENCES,
      encouragementLevel: 'high',
    });

    engine.evaluateFocusEncouragement(sessionId, 5 * 60_000);
    expect(service.getInAppQueueState().current).not.toBeNull();

    engine.applyPreferences({ ...DEFAULT_USER_PREFERENCES, quietMode: true });
    expect(service.getInAppQueueState().current).toBeNull();
  });

  it('does not accumulate distraction streak while suspended', () => {
    const { engine, service } = createNotificationTestHarness();
    const distracting = {
      trackingRunning: true,
      isIdle: false,
      systemSuspended: false,
      identity: 'youtube',
      classification: 'distracting' as const,
      activeTaskCount: 0,
      focusSessionActive: false,
      focusSessionElapsedMs: 0,
    };

    for (let index = 0; index < (DISTRACTION_THRESHOLD_LIGHT_MS / OBSERVATION_INTERVAL_MS) - 1; index += 1) {
      engine.handleObservation(distracting);
    }

    engine.resetStreaks();
    engine.handleObservation({ ...distracting, systemSuspended: true });

    for (let index = 0; index < (DISTRACTION_THRESHOLD_LIGHT_MS / OBSERVATION_INTERVAL_MS) - 1; index += 1) {
      engine.handleObservation({ ...distracting, systemSuspended: true });
    }

    expect(service.getInAppQueueState().current).toBeNull();
  });
});
