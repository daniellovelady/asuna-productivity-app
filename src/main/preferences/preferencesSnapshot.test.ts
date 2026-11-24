import { describe, expect, it } from 'vitest';
import {
  applyPreferencesSnapshot,
  getPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';

describe('preferencesSnapshot', () => {
  it('ignores stale account sync after newer sequence applied', () => {
    resetPreferencesSnapshotForTests();

    expect(
      applyPreferencesSnapshot('user-a', 1, {
        ...DEFAULT_USER_PREFERENCES,
        avatarStyle: 'calm',
      }),
    ).toBe(true);

    expect(
      applyPreferencesSnapshot('user-b', 2, {
        ...DEFAULT_USER_PREFERENCES,
        avatarStyle: 'focused',
      }),
    ).toBe(true);

    expect(
      applyPreferencesSnapshot('user-a', 1, {
        ...DEFAULT_USER_PREFERENCES,
        avatarStyle: 'energetic',
      }),
    ).toBe(false);

    expect(getPreferencesSnapshot().avatarStyle).toBe('focused');
  });
});
