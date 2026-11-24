import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';

export type PreferencesSnapshot = UserPreferences & {
  userId: string | null;
  sequence: number;
};

let snapshot: PreferencesSnapshot = {
  ...DEFAULT_USER_PREFERENCES,
  userId: null,
  sequence: 0,
};

export function getPreferencesSnapshot(): Readonly<PreferencesSnapshot> {
  return snapshot;
}

export function resetPreferencesSnapshot(): void {
  snapshot = {
    ...DEFAULT_USER_PREFERENCES,
    userId: null,
    sequence: snapshot.sequence + 1,
  };
}

export function applyPreferencesSnapshot(
  userId: string,
  sequence: number,
  preferences: UserPreferences,
): boolean {
  if (sequence < snapshot.sequence) {
    return false;
  }

  if (snapshot.userId !== null && snapshot.userId !== userId && sequence <= snapshot.sequence) {
    return false;
  }

  snapshot = {
    ...preferences,
    userId,
    sequence,
  };
  return true;
}

export function resetPreferencesSnapshotForTests(): void {
  snapshot = {
    ...DEFAULT_USER_PREFERENCES,
    userId: null,
    sequence: 0,
  };
}
