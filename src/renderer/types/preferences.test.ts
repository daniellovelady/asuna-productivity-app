import { describe, expect, it } from 'vitest';
import { mapPreferencesRow, validatePreferencesUpdate } from '../types/preferences';

describe('preferences mapping', () => {
  it('falls back to default avatar for invalid stored value', () => {
    const preferences = mapPreferencesRow({
      focus_minutes: 25,
      break_minutes: 5,
      tracking_enabled: false,
      distraction_threshold_minutes: 5,
      encouragement_level: 'medium',
      avatar_style: 'unknown-style',
    });

    expect(preferences.avatarStyle).toBe('default');
  });

  it('rejects invalid focus duration updates', () => {
    expect(validatePreferencesUpdate({ focusMinutes: 7 })).toMatch(/Focus duration/);
  });

  it('rejects invalid default schedule block minutes', () => {
    expect(validatePreferencesUpdate({ defaultScheduleBlockMinutes: 17 })).toMatch(/schedule block/);
  });
});
