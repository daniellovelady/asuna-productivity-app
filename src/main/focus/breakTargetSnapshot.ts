import { isValidBreakMinutes } from '../../shared/preferences/validation';
import { getPreferencesSnapshot } from '../preferences/preferencesSnapshot';

export const DEFAULT_BREAK_TARGET_MINUTES = 5;

export interface BreakTargetSnapshotResult {
  breakTargetMinutes: number;
  ownerMatched: boolean;
}

export function resolveBreakTargetMinutes(
  sessionOwnerUserId: string | null,
): BreakTargetSnapshotResult {
  const snapshot = getPreferencesSnapshot();

  if (
    sessionOwnerUserId !== null
    && snapshot.userId === sessionOwnerUserId
    && isValidBreakMinutes(snapshot.breakMinutes)
  ) {
    return {
      breakTargetMinutes: snapshot.breakMinutes,
      ownerMatched: true,
    };
  }

  console.warn('[A.S.U.N.A.] Break target owner mismatch; using safe fallback.');

  return {
    breakTargetMinutes: DEFAULT_BREAK_TARGET_MINUTES,
    ownerMatched: false,
  };
}
