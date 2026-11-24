import { describe, expect, it } from 'vitest';
import {
  clearTrackingDerivedInterruptionSignals,
  createInterruptionEpisodeState,
  setInterruptionSignal,
} from './interruptionSignals';

describe('interruptionSignals', () => {
  it('starts with zero count and no active episode', () => {
    const state = createInterruptionEpisodeState();

    expect(state.interruptionCount).toBe(0);
    expect(state.interruptionEpisodeActive).toBe(false);
  });

  it('increments once when the first signal becomes active', () => {
    const state = setInterruptionSignal(createInterruptionEpisodeState(), 'manualPause', true);

    expect(state.interruptionCount).toBe(1);
    expect(state.interruptionEpisodeActive).toBe(true);
    expect(state.interruptionSignals.manualPause).toBe(true);
  });

  it('does not increment when additional signals join an active episode', () => {
    let state = setInterruptionSignal(createInterruptionEpisodeState(), 'distraction', true);
    state = setInterruptionSignal(state, 'manualPause', true);

    expect(state.interruptionCount).toBe(1);
    expect(state.interruptionEpisodeActive).toBe(true);
    expect(state.interruptionSignals.distraction).toBe(true);
    expect(state.interruptionSignals.manualPause).toBe(true);
  });

  it('keeps the episode active until all signals clear', () => {
    let state = setInterruptionSignal(createInterruptionEpisodeState(), 'distraction', true);
    state = setInterruptionSignal(state, 'manualPause', true);
    state = setInterruptionSignal(state, 'distraction', false);

    expect(state.interruptionCount).toBe(1);
    expect(state.interruptionEpisodeActive).toBe(true);
    expect(state.interruptionSignals.manualPause).toBe(true);

    state = setInterruptionSignal(state, 'manualPause', false);

    expect(state.interruptionCount).toBe(1);
    expect(state.interruptionEpisodeActive).toBe(false);
  });

  it('allows a later distinct interruption to increment again', () => {
    let state = setInterruptionSignal(createInterruptionEpisodeState(), 'distraction', true);
    state = setInterruptionSignal(state, 'distraction', false);
    state = setInterruptionSignal(state, 'idle', true);

    expect(state.interruptionCount).toBe(2);
    expect(state.interruptionEpisodeActive).toBe(true);
  });

  it('clears stale tracking-derived signals without leaving the episode stuck', () => {
    let state = setInterruptionSignal(createInterruptionEpisodeState(), 'idle', true);
    state = setInterruptionSignal(state, 'distraction', true);
    state = clearTrackingDerivedInterruptionSignals(state);

    expect(state.interruptionSignals.idle).toBe(false);
    expect(state.interruptionSignals.distraction).toBe(false);
    expect(state.interruptionEpisodeActive).toBe(false);
    expect(state.interruptionCount).toBe(1);
  });

  it('preserves manual pause when clearing stale tracking-derived signals', () => {
    let state = setInterruptionSignal(createInterruptionEpisodeState(), 'distraction', true);
    state = setInterruptionSignal(state, 'manualPause', true);
    state = clearTrackingDerivedInterruptionSignals(state);

    expect(state.interruptionSignals.manualPause).toBe(true);
    expect(state.interruptionEpisodeActive).toBe(true);
    expect(state.interruptionCount).toBe(1);
  });
});
