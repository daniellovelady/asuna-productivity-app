import { randomUUID } from 'crypto';
import {
  BreakEngineError,
  BreakEngineState,
  BreakEndReason,
  BreakSessionRestoreSnapshot,
  BreakSessionSnapshot,
} from '../../shared/focus/breakTypes';
import { getFocusEngine } from './focusEngine';

const AUTO_COMPLETE_INTERVAL_MS = 1000;

interface ActiveBreakSession {
  id: string;
  ownerUserId: string;
  targetDurationMs: number;
  startedAt: number;
  endsAt: number;
  sourceFocusSessionId: string | null;
}

export type BreakCompletedListener = (breakSessionId: string) => void;

export type NowFn = () => number;

function toSnapshot(session: ActiveBreakSession, now: number): BreakSessionSnapshot {
  const elapsedMs = Math.min(now - session.startedAt, session.targetDurationMs);
  const remainingMs = Math.max(0, session.endsAt - now);

  return {
    id: session.id,
    ownerUserId: session.ownerUserId,
    status: 'running',
    targetDurationMs: session.targetDurationMs,
    elapsedMs,
    remainingMs,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    sourceFocusSessionId: session.sourceFocusSessionId,
  };
}

function toRestoreSnapshot(session: ActiveBreakSession): BreakSessionRestoreSnapshot {
  return {
    id: session.id,
    ownerUserId: session.ownerUserId,
    targetDurationMs: session.targetDurationMs,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    sourceFocusSessionId: session.sourceFocusSessionId,
  };
}

export class BreakEngine {
  private activeBreak: ActiveBreakSession | null = null;

  private authenticatedUserId: string | null = null;

  private autoCompleteTimer: NodeJS.Timeout | null = null;

  private onBreakCompleted: BreakCompletedListener | null = null;

  constructor(private readonly now: NowFn = Date.now) {}

  setAuthContext(userId: string | null): void {
    this.authenticatedUserId = userId;

    if (userId === null) {
      this.clear();
      return;
    }

    if (this.activeBreak !== null && this.activeBreak.ownerUserId !== userId) {
      this.clear();
    }
  }

  setOnBreakCompleted(listener: BreakCompletedListener | null): void {
    this.onBreakCompleted = listener;
  }

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

  getState(): BreakEngineState {
    this.checkAutoComplete();

    if (this.activeBreak === null) {
      return { activeBreak: null };
    }

    return {
      activeBreak: toSnapshot(this.activeBreak, this.now()),
    };
  }

  start(breakMinutes: number, sourceFocusSessionId?: string | null): BreakEngineState {
    if (!Number.isInteger(breakMinutes) || breakMinutes < 1 || breakMinutes > 30) {
      throw new BreakEngineError('Invalid break duration.');
    }

    const focusState = getFocusEngine().getState();
    if (focusState.pendingCompletion !== null) {
      throw new BreakEngineError('Finish saving the previous session before starting a break.');
    }

    if (focusState.activeSession !== null) {
      throw new BreakEngineError('A focus session is active.');
    }

    if (this.activeBreak !== null) {
      throw new BreakEngineError('A break is already active.');
    }

    if (this.authenticatedUserId === null) {
      throw new BreakEngineError('Sign-in context is not ready. Try again in a moment.');
    }

    const now = this.now();
    const targetDurationMs = breakMinutes * 60_000;

    this.activeBreak = {
      id: randomUUID(),
      ownerUserId: this.authenticatedUserId,
      targetDurationMs,
      startedAt: now,
      endsAt: now + targetDurationMs,
      sourceFocusSessionId: sourceFocusSessionId ?? null,
    };

    return this.getState();
  }

  endEarly(reason: BreakEndReason): BreakSessionRestoreSnapshot | null {
    void reason;
    if (this.activeBreak === null) {
      return null;
    }

    const snapshot = toRestoreSnapshot(this.activeBreak);
    this.activeBreak = null;
    return snapshot;
  }

  restoreBreak(snapshot: BreakSessionRestoreSnapshot): BreakEngineState {
    if (this.activeBreak !== null) {
      throw new BreakEngineError('Cannot restore break while another break is active.');
    }

    const focusState = getFocusEngine().getState();
    if (focusState.activeSession !== null || focusState.pendingCompletion !== null) {
      throw new BreakEngineError('Cannot restore break while focus session state is active.');
    }

    this.activeBreak = {
      id: snapshot.id,
      ownerUserId: snapshot.ownerUserId,
      targetDurationMs: snapshot.targetDurationMs,
      startedAt: snapshot.startedAt,
      endsAt: snapshot.endsAt,
      sourceFocusSessionId: snapshot.sourceFocusSessionId,
    };

    return this.getState();
  }

  clear(): void {
    this.activeBreak = null;
  }

  private checkAutoComplete(): void {
    if (this.activeBreak === null) {
      return;
    }

    const now = this.now();
    if (now < this.activeBreak.endsAt) {
      return;
    }

    const completedId = this.activeBreak.id;
    this.activeBreak = null;
    this.onBreakCompleted?.(completedId);
  }
}

let breakEngineSingleton: BreakEngine | null = null;

export function getBreakEngine(): BreakEngine {
  if (breakEngineSingleton === null) {
    breakEngineSingleton = new BreakEngine();
    breakEngineSingleton.startAutoCompleteTick();
  }

  return breakEngineSingleton;
}

export function resetBreakEngineForTests(engine?: BreakEngine): BreakEngine {
  if (breakEngineSingleton !== null) {
    breakEngineSingleton.stopAutoCompleteTick();
  }

  breakEngineSingleton = engine ?? new BreakEngine();
  breakEngineSingleton.startAutoCompleteTick();

  return breakEngineSingleton;
}
