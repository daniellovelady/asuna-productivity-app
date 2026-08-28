import {
  CompletedFocusSession,
  FocusEngineError,
  FocusEngineState,
  FocusSessionSnapshot,
  FocusSessionStatus,
} from '../../shared/focus/types';
import { assertValidFocusDurationMinutes } from '../../shared/focus/validation';

const DEFAULT_DURATION_MINUTES = 25;
const AUTO_COMPLETE_INTERVAL_MS = 1000;

interface ActiveFocusSession {
  id: string;
  status: FocusSessionStatus;
  targetDurationMs: number;
  startedAt: number;
  accumulatedPausedMs: number;
  pauseStartedAt: number | null;
}

export type NowFn = () => number;

export function getElapsedFocusMs(session: ActiveFocusSession, now: number): number {
  if (session.status === 'paused' && session.pauseStartedAt !== null) {
    return session.pauseStartedAt - session.startedAt - session.accumulatedPausedMs;
  }

  return now - session.startedAt - session.accumulatedPausedMs;
}

function createSessionId(now: number): string {
  return `focus-${now}`;
}

function toSnapshot(session: ActiveFocusSession, now: number): FocusSessionSnapshot {
  return {
    id: session.id,
    status: session.status,
    targetDurationMs: session.targetDurationMs,
    elapsedFocusMs: getElapsedFocusMs(session, now),
    startedAt: session.startedAt,
    accumulatedPausedMs: session.accumulatedPausedMs,
    pauseStartedAt: session.pauseStartedAt,
  };
}

function toCompletedSession(session: ActiveFocusSession, now: number): CompletedFocusSession {
  return {
    id: session.id,
    targetDurationMs: session.targetDurationMs,
    elapsedFocusMs: getElapsedFocusMs(session, now),
    startedAt: session.startedAt,
    endedAt: now,
    accumulatedPausedMs: session.accumulatedPausedMs,
  };
}

export class FocusEngine {
  private activeSession: ActiveFocusSession | null = null;

  private selectedDurationMinutes = DEFAULT_DURATION_MINUTES;

  private autoCompleteTimer: NodeJS.Timeout | null = null;

  constructor(private readonly now: NowFn = Date.now) {}

  startAutoCompleteTick(): void {
    if (this.autoCompleteTimer !== null) {
      return;
    }

    this.autoCompleteTimer = setInterval(() => {
      this.checkAutoComplete();
    }, AUTO_COMPLETE_INTERVAL_MS);
  }

  stopAutoCompleteTick(): void {
    if (this.autoCompleteTimer === null) {
      return;
    }

    clearInterval(this.autoCompleteTimer);
    this.autoCompleteTimer = null;
  }

  getState(): FocusEngineState {
    this.checkAutoComplete();

    const now = this.now();

    return {
      activeSession: this.activeSession ? toSnapshot(this.activeSession, now) : null,
      selectedDurationMinutes: this.selectedDurationMinutes,
    };
  }

  setDuration(minutes: unknown): FocusEngineState {
    if (this.activeSession !== null) {
      throw new FocusEngineError('Duration cannot be changed while a session is active.');
    }

    assertValidFocusDurationMinutes(minutes);
    this.selectedDurationMinutes = minutes;

    return this.getState();
  }

  start(): FocusEngineState {
    if (this.activeSession !== null) {
      throw new FocusEngineError('A focus session is already active.');
    }

    const now = this.now();

    this.activeSession = {
      id: createSessionId(now),
      status: 'running',
      targetDurationMs: this.selectedDurationMinutes * 60_000,
      startedAt: now,
      accumulatedPausedMs: 0,
      pauseStartedAt: null,
    };

    return this.getState();
  }

  pause(): FocusEngineState {
    if (this.activeSession === null) {
      throw new FocusEngineError('No active focus session to pause.');
    }

    if (this.activeSession.status !== 'running') {
      throw new FocusEngineError('Only a running session can be paused.');
    }

    this.activeSession.status = 'paused';
    this.activeSession.pauseStartedAt = this.now();

    return this.getState();
  }

  resume(): FocusEngineState {
    if (this.activeSession === null) {
      throw new FocusEngineError('No active focus session to resume.');
    }

    if (this.activeSession.status !== 'paused' || this.activeSession.pauseStartedAt === null) {
      throw new FocusEngineError('Only a paused session can be resumed.');
    }

    const now = this.now();
    this.activeSession.accumulatedPausedMs += now - this.activeSession.pauseStartedAt;
    this.activeSession.pauseStartedAt = null;
    this.activeSession.status = 'running';

    return this.getState();
  }

  stop(): { state: FocusEngineState; completed: CompletedFocusSession } {
    if (this.activeSession === null) {
      throw new FocusEngineError('No active focus session to stop.');
    }

    const now = this.now();
    const completed = toCompletedSession(this.activeSession, now);
    this.activeSession = null;

    return {
      state: this.getState(),
      completed,
    };
  }

  private checkAutoComplete(): void {
    if (this.activeSession === null || this.activeSession.status !== 'running') {
      return;
    }

    const now = this.now();
    const elapsedFocusMs = getElapsedFocusMs(this.activeSession, now);

    if (elapsedFocusMs >= this.activeSession.targetDurationMs) {
      this.activeSession = null;
    }
  }
}

let focusEngineSingleton: FocusEngine | null = null;

export function getFocusEngine(): FocusEngine {
  if (focusEngineSingleton === null) {
    focusEngineSingleton = new FocusEngine();
    focusEngineSingleton.startAutoCompleteTick();
  }

  return focusEngineSingleton;
}

export function resetFocusEngineForTests(engine?: FocusEngine): FocusEngine {
  if (focusEngineSingleton !== null) {
    focusEngineSingleton.stopAutoCompleteTick();
  }

  focusEngineSingleton = engine ?? new FocusEngine();
  focusEngineSingleton.startAutoCompleteTick();

  return focusEngineSingleton;
}
