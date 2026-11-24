import { describe, expect, it } from 'vitest';
import { FocusEngine, getElapsedFocusMs } from './focusEngine';
import { FocusEngineError } from '../../shared/focus/types';

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

function createEngine(now: () => number, withAuth = true): FocusEngine {
  const engine = new FocusEngine(now);

  if (withAuth) {
    engine.setAuthContext(TEST_USER_ID);
  }

  return engine;
}

describe('FocusEngine', () => {
  it('starts a running session with the selected duration', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);

    engine.setDuration(15);
    const state = engine.start();

    expect(state.activeSession).not.toBeNull();
    expect(state.activeSession?.status).toBe('running');
    expect(state.activeSession?.targetDurationMs).toBe(15 * 60_000);
    expect(state.activeSession?.elapsedFocusMs).toBe(0);
  });

  it('rejects starting when auth context is not ready', () => {
    const engine = createEngine(() => 1_000, false);

    expect(() => engine.start()).toThrow(FocusEngineError);
    expect(() => engine.start()).toThrow('Sign-in context is not ready. Try again in a moment.');
  });

  it('rejects starting when a session is already active', () => {
    const engine = createEngine(() => 1_000);

    engine.start();

    expect(() => engine.start()).toThrow(FocusEngineError);
    expect(() => engine.start()).toThrow('A focus session is already active.');
  });

  it('freezes elapsed time while paused and excludes paused time after resume', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);

    engine.setDuration(25);
    engine.start();

    clock.advance(60_000);
    engine.pause();

    const pausedState = engine.getState();
    expect(pausedState.activeSession?.elapsedFocusMs).toBe(60_000);

    clock.advance(30_000);
    expect(engine.getState().activeSession?.elapsedFocusMs).toBe(60_000);

    engine.resume();
    clock.advance(60_000);

    const resumedState = engine.getState();
    expect(resumedState.activeSession?.elapsedFocusMs).toBe(120_000);
    expect(resumedState.activeSession?.accumulatedPausedMs).toBe(30_000);
    expect(resumedState.activeSession?.interruptionCount).toBe(1);
  });

  it('handles multiple pause and resume cycles', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);

    engine.start();

    clock.advance(10_000);
    engine.pause();

    clock.advance(5_000);
    engine.resume();

    clock.advance(10_000);
    engine.pause();

    clock.advance(7_000);
    engine.resume();

    clock.advance(10_000);

    const state = engine.getState();
    expect(state.activeSession?.elapsedFocusMs).toBe(30_000);
    expect(state.activeSession?.accumulatedPausedMs).toBe(12_000);
  });

  it('auto-completes when elapsed focus time reaches the target duration', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);

    engine.setDuration(5);
    engine.start();

    clock.advance(5 * 60_000);

    const state = engine.getState();
    expect(state.activeSession).toBeNull();
    expect(state.pendingCompletion).not.toBeNull();
    expect(state.pendingCompletion?.targetDurationMs).toBe(5 * 60_000);
  });

  it('returns a completed session and clears active state on stop', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);

    engine.setDuration(25);
    engine.start();
    clock.advance(90_000);

    const result = engine.stop();

    expect(result.state.activeSession).toBeNull();
    expect(result.state.pendingCompletion).not.toBeNull();
    expect(result.state.pendingCompletion?.id).toBe(result.completed.id);
    expect(result.completed.elapsedFocusMs).toBe(90_000);
    expect(result.completed.targetDurationMs).toBe(25 * 60_000);
    expect(result.completed.endedAt).toBe(91_000);
  });

  it('uses UUID session ids', () => {
    const engine = createEngine(() => 1_000);
    engine.start();

    const sessionId = engine.getState().activeSession?.id;
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('blocks start while pending completion is unsaved', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);

    engine.setDuration(5);
    engine.start();
    clock.advance(5 * 60_000);
    engine.getState();

    expect(() => engine.start()).toThrow(FocusEngineError);
    expect(() => engine.start()).toThrow(
      'Finish saving the previous session before starting a new one.',
    );
  });

  it('does not overwrite pending completion', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);

    engine.setDuration(5);
    engine.start();
    clock.advance(5 * 60_000);
    const firstPending = engine.getState().pendingCompletion;

    expect(firstPending).not.toBeNull();
    expect(engine.getState().pendingCompletion?.id).toBe(firstPending?.id);
  });

  it('acknowledges completion only for matching session id', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);

    engine.start();
    clock.advance(10_000);
    const { completed } = engine.stop();

    engine.acknowledgeCompletion('wrong-id');
    expect(engine.getState().pendingCompletion).not.toBeNull();

    engine.acknowledgeCompletion(completed.id);
    expect(engine.getState().pendingCompletion).toBeNull();
  });

  it('allows changing duration only while idle', () => {
    const engine = createEngine(() => 1_000);

    engine.setDuration(10);
    expect(engine.getState().selectedDurationMinutes).toBe(10);

    engine.start();

    expect(() => engine.setDuration(15)).toThrow(FocusEngineError);
    expect(() => engine.setDuration(15)).toThrow(
      'Duration cannot be changed while a session is active.',
    );
  });

  it('rejects invalid durations', () => {
    const engine = createEngine(() => 1_000);

    expect(() => engine.setDuration(7)).toThrow(
      'Duration must be an integer from 5 to 60 in 5-minute increments.',
    );
  });
  describe('default duration preference propagation', () => {
    it('applies preference update immediately when idle', () => {
      const engine = createEngine(() => 1_000);

      engine.applyDefaultDuration(30);
      expect(engine.getState().selectedDurationMinutes).toBe(30);

      engine.applyDefaultDuration(45);
      expect(engine.getState().selectedDurationMinutes).toBe(45);
    });

    it('keeps running target but applies default after stop', () => {
      const clock = createClock(1_000);
      const engine = createEngine(clock.now);

      engine.applyDefaultDuration(30);
      engine.start();

      engine.applyDefaultDuration(45);

      expect(engine.getState().activeSession?.targetDurationMs).toBe(30 * 60_000);
      expect(engine.getState().selectedDurationMinutes).toBe(30);

      engine.stop();

      expect(engine.getState().selectedDurationMinutes).toBe(45);
    });

    it('keeps paused target but applies default after stop', () => {
      const clock = createClock(1_000);
      const engine = createEngine(clock.now);

      engine.applyDefaultDuration(30);
      engine.start();
      clock.advance(60_000);
      engine.pause();

      engine.applyDefaultDuration(45);

      expect(engine.getState().activeSession?.targetDurationMs).toBe(30 * 60_000);
      expect(engine.getState().selectedDurationMinutes).toBe(30);

      engine.stop();

      expect(engine.getState().selectedDurationMinutes).toBe(45);
    });

    it('applies default after auto-completion', () => {
      const clock = createClock(0);
      const engine = createEngine(clock.now);

      engine.applyDefaultDuration(30);
      engine.start();

      engine.applyDefaultDuration(45);

      clock.advance(30 * 60_000);
      const state = engine.getState();

      expect(state.activeSession).toBeNull();
      expect(state.selectedDurationMinutes).toBe(45);
    });

    it('does not change stored default when user manually selects idle duration', () => {
      const engine = createEngine(() => 1_000);

      engine.applyDefaultDuration(30);
      engine.setDuration(20);

      expect(engine.getState().selectedDurationMinutes).toBe(20);

      engine.applyDefaultDuration(45);
      expect(engine.getState().selectedDurationMinutes).toBe(45);
    });

    it('uses manual idle selection for the next session without changing stored default', () => {
      const engine = createEngine(() => 1_000);

      engine.applyDefaultDuration(30);
      engine.setDuration(20);
      const state = engine.start();

      expect(state.selectedDurationMinutes).toBe(20);
      expect(state.activeSession?.targetDurationMs).toBe(20 * 60_000);
    });

    it('resets idle selection when default is reset after sign-out', () => {
      const engine = createEngine(() => 1_000);

      engine.applyDefaultDuration(45);
      expect(engine.getState().selectedDurationMinutes).toBe(45);

      engine.applyDefaultDuration(25);
      expect(engine.getState().selectedDurationMinutes).toBe(25);
    });
  });

  it('notifies completion listeners when a session ends', () => {
    const clock = createClock(1_000);
    const engine = createEngine(clock.now);
    const completedSessions: string[] = [];

    engine.setOnSessionCompleted((completed) => {
      completedSessions.push(completed.id);
    });

    engine.setDuration(5);
    engine.start();
    clock.advance(5 * 60_000);
    engine.getState();

    expect(completedSessions).toHaveLength(1);
  });

  it('invokes running tick listener while session is running', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);
    const ticks: Array<{ sessionId: string; elapsedFocusMs: number }> = [];

    engine.setOnRunningTick((sessionId, elapsedFocusMs) => {
      ticks.push({ sessionId, elapsedFocusMs });
    });

    engine.setDuration(25);
    const started = engine.start();
    const sessionId = started.activeSession?.id ?? '';

    clock.advance(5_000);
    engine.getState();

    expect(ticks.length).toBeGreaterThanOrEqual(1);
    expect(ticks[ticks.length - 1]).toEqual({
      sessionId,
      elapsedFocusMs: 5_000,
    });
  });

  it('does not invoke running tick listener while session is paused', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);
    let tickCount = 0;

    engine.setOnRunningTick(() => {
      tickCount += 1;
    });

    engine.start();
    clock.advance(60_000);
    engine.getState();
    const ticksBeforePause = tickCount;

    engine.pause();
    clock.advance(30_000);
    engine.getState();

    expect(tickCount).toBe(ticksBeforePause);
  });

  it('delivers monotonically increasing elapsed time on running ticks', () => {
    const clock = createClock(0);
    const engine = createEngine(clock.now);
    const elapsedValues: number[] = [];

    engine.setOnRunningTick((_sessionId, elapsedFocusMs) => {
      elapsedValues.push(elapsedFocusMs);
    });

    engine.start();
    clock.advance(10_000);
    engine.getState();
    clock.advance(20_000);
    engine.getState();

    expect(elapsedValues.length).toBeGreaterThanOrEqual(2);
    for (let index = 1; index < elapsedValues.length; index += 1) {
      expect(elapsedValues[index]).toBeGreaterThanOrEqual(elapsedValues[index - 1]);
    }
  });
});

describe('getElapsedFocusMs', () => {
  it('does not count time after a pause begins', () => {
    const elapsed = getElapsedFocusMs(
      {
        id: 'focus-1',
        ownerUserId: null,
        status: 'paused',
        targetDurationMs: 25 * 60_000,
        startedAt: 1_000,
        accumulatedPausedMs: 0,
        pauseStartedAt: 61_000,
        interruptionCount: 0,
        interruptionSignals: { manualPause: true, idle: false, distraction: false },
        interruptionEpisodeActive: true,
      },
      120_000,
    );

    expect(elapsed).toBe(60_000);
  });
});
