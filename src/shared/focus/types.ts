export type FocusSessionStatus = 'running' | 'paused';

export interface FocusSessionSnapshot {
  id: string;
  status: FocusSessionStatus;
  targetDurationMs: number;
  elapsedFocusMs: number;
  startedAt: number;
  accumulatedPausedMs: number;
  pauseStartedAt: number | null;
}

export interface CompletedFocusSession {
  id: string;
  targetDurationMs: number;
  elapsedFocusMs: number;
  startedAt: number;
  endedAt: number;
  accumulatedPausedMs: number;
}

export interface FocusEngineState {
  activeSession: FocusSessionSnapshot | null;
  selectedDurationMinutes: number;
}

export class FocusEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FocusEngineError';
  }
}
