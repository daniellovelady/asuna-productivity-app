export interface InterruptionSignals {
  manualPause: boolean;
  idle: boolean;
  distraction: boolean;
}

export interface InterruptionEpisodeState {
  interruptionCount: number;
  interruptionSignals: InterruptionSignals;
  interruptionEpisodeActive: boolean;
}

export function createInterruptionSignals(): InterruptionSignals {
  return {
    manualPause: false,
    idle: false,
    distraction: false,
  };
}

export function createInterruptionEpisodeState(): InterruptionEpisodeState {
  return {
    interruptionCount: 0,
    interruptionSignals: createInterruptionSignals(),
    interruptionEpisodeActive: false,
  };
}

export function hasAnyInterruptionSignal(signals: InterruptionSignals): boolean {
  return signals.manualPause || signals.idle || signals.distraction;
}

export function setInterruptionSignal(
  state: InterruptionEpisodeState,
  key: keyof InterruptionSignals,
  active: boolean,
): InterruptionEpisodeState {
  const hadAny = hasAnyInterruptionSignal(state.interruptionSignals);
  const nextSignals = { ...state.interruptionSignals, [key]: active };
  const hasAny = hasAnyInterruptionSignal(nextSignals);

  let { interruptionCount, interruptionEpisodeActive } = state;

  if (!hadAny && hasAny) {
    interruptionCount += 1;
    interruptionEpisodeActive = true;
  } else if (hadAny && !hasAny) {
    interruptionEpisodeActive = false;
  }

  return {
    interruptionCount,
    interruptionSignals: nextSignals,
    interruptionEpisodeActive,
  };
}

export function clearTrackingDerivedInterruptionSignals(
  state: InterruptionEpisodeState,
): InterruptionEpisodeState {
  let next = state;

  if (next.interruptionSignals.idle) {
    next = setInterruptionSignal(next, 'idle', false);
  }

  if (next.interruptionSignals.distraction) {
    next = setInterruptionSignal(next, 'distraction', false);
  }

  return next;
}
