export type BreakSessionStatus = 'running';

export interface BreakSessionSnapshot {
  id: string;
  ownerUserId: string;
  status: BreakSessionStatus;
  targetDurationMs: number;
  elapsedMs: number;
  remainingMs: number;
  startedAt: number;
  endsAt: number;
  sourceFocusSessionId: string | null;
}

export interface BreakEngineState {
  activeBreak: BreakSessionSnapshot | null;
}

export class BreakEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BreakEngineError';
  }
}

export type BreakEndReason =
  | 'manual'
  | 'superseded_by_focus'
  | 'auth_cleared'
  | 'owner_mismatch';

export interface BreakSessionRestoreSnapshot {
  id: string;
  ownerUserId: string;
  targetDurationMs: number;
  startedAt: number;
  endsAt: number;
  sourceFocusSessionId: string | null;
}
