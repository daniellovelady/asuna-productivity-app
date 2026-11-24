import { describe, expect, it } from 'vitest';
import { FocusEngine } from './focusEngine';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';

function createClock(start: number) {
  let current = start;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

const TEST_USER_ID = 'test-user-id';

function createEngine(now: () => number, userId = TEST_USER_ID): FocusEngine {
  const engine = new FocusEngine(now);
  engine.setAuthContext(userId);
  return engine;
}

describe('FocusEngine interruption episodes', () => {
  it('starts a new session with interruption_count = 0', () => {
    const engine = createEngine(() => 1_000, 'user-a');
    engine.start();

    expect(engine.getState().activeSession?.interruptionCount).toBe(0);
  });

  it('increments once for running -> pause and ignores repeated paused updates', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.pause();
    expect(engine.getState().activeSession?.interruptionCount).toBe(1);

    expect(() => engine.pause()).toThrow();
    expect(engine.getState().activeSession?.interruptionCount).toBe(1);
  });

  it('increments again after resume and a later independent pause', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.pause();
    engine.resume();
    engine.pause();

    expect(engine.getState().activeSession?.interruptionCount).toBe(2);
  });

  it('counts manual pause while tracking is off', () => {
    const engine = createEngine(() => 1_000);
    engine.start();
    engine.pause();

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);
  });

  it('does not fabricate idle or distraction signals while tracking is unavailable', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setIdleSignal(true, false);
    engine.setDistractionSignal(true, false);

    expect(engine.getState().activeSession?.interruptionCount).toBe(0);
  });

  it('increments exactly once for idle signal and not again while idle remains active', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setIdleSignal(true, true);
    engine.setIdleSignal(true, true);

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);
  });

  it('allows a later independent idle episode after activity returns', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setIdleSignal(true, true);
    engine.setIdleSignal(false, true);
    engine.setIdleSignal(true, true);

    expect(engine.getState().activeSession?.interruptionCount).toBe(2);
  });

  it('handles distraction then manual pause without double counting', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setDistractionSignal(true);
    engine.pause();

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);
  });

  it('clears distraction while paused and ends the episode on resume', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setDistractionSignal(true);
    engine.pause();
    engine.setDistractionSignal(false);

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);

    engine.resume();

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);
    engine.setIdleSignal(true, true);
    expect(engine.getState().activeSession?.interruptionCount).toBe(2);
  });

  it('clears stale tracking-derived signals when tracking becomes unavailable', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    engine.setDistractionSignal(true);
    engine.setIdleSignal(true, true);
    engine.clearTrackingDerivedSignals();

    expect(engine.getState().activeSession?.interruptionCount).toBe(1);

    engine.pause();

    expect(engine.getState().activeSession?.interruptionCount).toBe(2);

    engine.clearTrackingDerivedSignals();

    expect(engine.getState().activeSession?.interruptionCount).toBe(2);
  });

  it('persists interruption_count on completed and abandoned sessions', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);

    engine.setDuration(5);
    engine.start();
    engine.pause();
    engine.resume();
    clock.advance(5 * 60_000);

    const autoCompleted = engine.getState().pendingCompletion;
    expect(autoCompleted).not.toBeNull();
    expect(autoCompleted?.interruptionCount).toBe(1);

    if (autoCompleted !== null) {
      engine.acknowledgeCompletion(autoCompleted.id);
    }

    engine.setDuration(25);
    engine.start();
    engine.pause();
    const stopped = engine.stop().completed;

    expect(stopped.interruptionCount).toBe(1);
  });

  it('resets interruption_count to 0 for the next session', () => {
    const engine = createEngine(() => 1_000);

    engine.start();
    engine.pause();
    engine.stop();
    const pending = engine.getState().pendingCompletion;
    expect(pending).not.toBeNull();
    if (pending !== null) {
      engine.acknowledgeCompletion(pending.id);
    }

    engine.start();

    expect(engine.getState().activeSession?.interruptionCount).toBe(0);
  });

  it('snapshots the latest owner-matched break preference at session end', () => {
    resetPreferencesSnapshotForTests();
    applyPreferencesSnapshot('user-a', 1, {
      focusMinutes: 25,
      breakMinutes: 5,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });

    const engine = createEngine(() => 1_000, 'user-a');
    engine.start();

    applyPreferencesSnapshot('user-a', 2, {
      focusMinutes: 25,
      breakMinutes: 10,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });

    const completed = engine.stop().completed;

    expect(completed.breakTargetMinutes).toBe(10);
    expect(completed.breakTargetOwnerMatched).toBe(true);
  });

  it('does not use stale Account B preferences for an Account A session', () => {
    resetPreferencesSnapshotForTests();
    applyPreferencesSnapshot('user-b', 1, {
      focusMinutes: 25,
      breakMinutes: 15,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });

    const engine = createEngine(() => 1_000, 'user-a');
    engine.start();
    const completed = engine.stop().completed;

    expect(completed.breakTargetMinutes).toBe(5);
    expect(completed.breakTargetOwnerMatched).toBe(false);
  });
});
