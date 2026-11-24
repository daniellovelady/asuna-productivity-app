import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakEngine, resetBreakEngineForTests } from './breakEngine';
import { FocusEngine, resetFocusEngineForTests } from './focusEngine';

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

describe('BreakEngine', () => {
  beforeEach(() => {
    resetFocusEngineForTests();
    resetBreakEngineForTests();
  });

  it('starts a running break with wall-clock end time', () => {
    const clock = createClock(1_000);
    const engine = new BreakEngine(clock.now);
    engine.setAuthContext(TEST_USER_ID);

    const state = engine.start(5);

    expect(state.activeBreak).not.toBeNull();
    expect(state.activeBreak?.remainingMs).toBe(5 * 60_000);
    expect(state.activeBreak?.targetDurationMs).toBe(5 * 60_000);
  });

  it('rejects starting while focus session is active', () => {
    const focusEngine = resetFocusEngineForTests(new FocusEngine(() => 1_000));
    focusEngine.setAuthContext(TEST_USER_ID);
    focusEngine.start();

    const breakEngine = resetBreakEngineForTests(new BreakEngine(() => 1_000));
    breakEngine.setAuthContext(TEST_USER_ID);

    expect(() => breakEngine.start(5)).toThrow('A focus session is active.');
  });

  it('emits break completion only on natural expiry', () => {
    const clock = createClock(1_000);
    const onCompleted = vi.fn();
    const engine = new BreakEngine(clock.now);
    engine.setAuthContext(TEST_USER_ID);
    engine.setOnBreakCompleted(onCompleted);
    engine.startAutoCompleteTick();

    engine.start(1);
    clock.advance(60_000);
    engine.getState();

    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(engine.getState().activeBreak).toBeNull();

    engine.stopAutoCompleteTick();
  });

  it('does not emit break completion on manual end', () => {
    const onCompleted = vi.fn();
    const engine = new BreakEngine(() => 1_000);
    engine.setAuthContext(TEST_USER_ID);
    engine.setOnBreakCompleted(onCompleted);

    engine.start(5);
    engine.endEarly('manual');

    expect(onCompleted).not.toHaveBeenCalled();
    expect(engine.getState().activeBreak).toBeNull();
  });

  it('clears break on auth sign-out', () => {
    const engine = new BreakEngine(() => 1_000);
    engine.setAuthContext(TEST_USER_ID);
    engine.start(5);

    engine.setAuthContext(null);

    expect(engine.getState().activeBreak).toBeNull();
  });

  it('clears break on owner mismatch', () => {
    const engine = new BreakEngine(() => 1_000);
    engine.setAuthContext(TEST_USER_ID);
    engine.start(5);

    engine.setAuthContext('other-user');

    expect(engine.getState().activeBreak).toBeNull();
  });
});
