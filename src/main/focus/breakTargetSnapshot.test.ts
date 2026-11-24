import { describe, expect, it, vi } from 'vitest';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import { DEFAULT_BREAK_TARGET_MINUTES, resolveBreakTargetMinutes } from './breakTargetSnapshot';

describe('resolveBreakTargetMinutes', () => {
  it('snapshots Account A break minutes when session owner matches preferences snapshot', () => {
    resetPreferencesSnapshotForTests();
    applyPreferencesSnapshot('user-a', 1, {
      focusMinutes: 25,
      breakMinutes: 10,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });

    const result = resolveBreakTargetMinutes('user-a');

    expect(result).toEqual({
      breakTargetMinutes: 10,
      ownerMatched: true,
    });
  });

  it('does not use Account B preferences for an Account A session', () => {
    resetPreferencesSnapshotForTests();
    applyPreferencesSnapshot('user-b', 1, {
      focusMinutes: 25,
      breakMinutes: 15,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = resolveBreakTargetMinutes('user-a');

    expect(result).toEqual({
      breakTargetMinutes: DEFAULT_BREAK_TARGET_MINUTES,
      ownerMatched: false,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[A.S.U.N.A.] Break target owner mismatch; using safe fallback.',
    );
    warnSpy.mockRestore();
  });

  it('falls back safely after sign-out clears the preferences snapshot owner', () => {
    resetPreferencesSnapshotForTests();
    applyPreferencesSnapshot('user-a', 1, {
      focusMinutes: 25,
      breakMinutes: 12,
      trackingEnabled: false,
      distractionThresholdMinutes: 5,
      encouragementLevel: 'medium',
      avatarStyle: 'asuna',
      quietMode: false,
      reminderTone: 'neutral',
      aiMessageVariationEnabled: false,
    });
    resetPreferencesSnapshotForTests();

    const result = resolveBreakTargetMinutes('user-a');

    expect(result.ownerMatched).toBe(false);
    expect(result.breakTargetMinutes).toBe(DEFAULT_BREAK_TARGET_MINUTES);
  });
});
