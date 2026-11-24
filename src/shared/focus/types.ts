import type { FocusPersistenceContext, FocusStartIntent } from './focusStartIntent';

export type FocusSessionStatus = 'running' | 'paused';

export interface FocusSessionSnapshot {
  id: string;
  status: FocusSessionStatus;
  targetDurationMs: number;
  elapsedFocusMs: number;
  startedAt: number;
  accumulatedPausedMs: number;
  pauseStartedAt: number | null;
  interruptionCount: number;
}

export interface CompletedFocusSession {
  id: string;
  ownerUserId: string;
  targetDurationMs: number;
  elapsedFocusMs: number;
  startedAt: number;
  endedAt: number;
  accumulatedPausedMs: number;
  interruptionCount: number;
  breakTargetMinutes: number;
  breakTargetOwnerMatched: boolean;
}

export interface FocusEngineState {
  activeSession: FocusSessionSnapshot | null;
  selectedDurationMinutes: number;
  pendingCompletion: CompletedFocusSession | null;
  activeFocusContext: FocusStartIntent | null;
  pendingFocusPersistence: FocusPersistenceContext | null;
}

export class FocusEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FocusEngineError';
  }
}
