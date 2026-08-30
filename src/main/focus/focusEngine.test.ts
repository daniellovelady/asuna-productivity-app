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

describe('FocusEngine', () => {
  it('starts a running session with the selected duration', () => {
    const clock = createClock(1_000);
    const engine = new FocusEngine(clock.now);

    engine.setDuration(15);
    const state = engine.start();

    expect(state.activeSession).not.toBeNull();
    expect(state.activeSession?.status).toBe('running');
    expect(state.activeSession?.targetDurationMs).toBe(15 * 60_000);
    expect(state.activeSession?.elapsedFocusMs).toBe(0);
  });

  it('rejects starting when a session is already active', () => {
    const engine = new FocusEngine(() => 1_000);

    engine.start();

    expect(() => engine.start()).toThrow(FocusEngineError);
    expect(() => engine.start()).toThrow('A focus session is already active.');
  });

  it('freezes elapsed time while paused and excludes paused time after resume', () => {
    const clock = createClock(1_000);
    const engine = new FocusEngine(clock.now);

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
  });

  it('handles multiple pause and resume cycles', () => {
    const clock = createClock(0);
    const engine = new FocusEngine(clock.now);

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
    const engine = new FocusEngine(clock.now);

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
    const engine = new FocusEngine(clock.now);

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
    const engine = new FocusEngine(() => 1_000);
    engine.start();

    const sessionId = engine.getState().activeSession?.id;
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('blocks start while pending completion is unsaved', () => {
    const clock = createClock(0);
    const engine = new FocusEngine(clock.now);

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
    const engine = new FocusEngine(clock.now);

    engine.setDuration(5);
    engine.start();
    clock.advance(5 * 60_000);
    const firstPending = engine.getState().pendingCompletion;

    expect(firstPending).not.toBeNull();
    expect(engine.getState().pendingCompletion?.id).toBe(firstPending?.id);
  });

  it('acknowledges completion only for matching session id', () => {
    const clock = createClock(1_000);
    const engine = new FocusEngine(clock.now);

    engine.start();
    clock.advance(10_000);
    const { completed } = engine.stop();

    engine.acknowledgeCompletion('wrong-id');
    expect(engine.getState().pendingCompletion).not.toBeNull();

    engine.acknowledgeCompletion(completed.id);
    expect(engine.getState().pendingCompletion).toBeNull();
  });

  it('allows changing duration only while idle', () => {
    const engine = new FocusEngine(() => 1_000);

    engine.setDuration(10);
    expect(engine.getState().selectedDurationMinutes).toBe(10);

    engine.start();

    expect(() => engine.setDuration(15)).toThrow(FocusEngineError);
    expect(() => engine.setDuration(15)).toThrow(
      'Duration cannot be changed while a session is active.',
    );
  });

  it('rejects invalid durations', () => {
    const engine = new FocusEngine(() => 1_000);

    expect(() => engine.setDuration(7)).toThrow(
      'Duration must be an integer from 5 to 60 in 5-minute increments.',
    );
  });
});

describe('getElapsedFocusMs', () => {
  it('does not count time after a pause begins', () => {
    const elapsed = getElapsedFocusMs(
      {
        id: 'focus-1',
        status: 'paused',
        targetDurationMs: 25 * 60_000,
        startedAt: 1_000,
        accumulatedPausedMs: 0,
        pauseStartedAt: 61_000,
      },
      120_000,
    );

    expect(elapsed).toBe(60_000);
  });
});
