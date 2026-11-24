import { ipcMain } from 'electron';
import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import {
  applyPreferencesSnapshot,
  getPreferencesSnapshot,
  resetPreferencesSnapshot,
} from '../preferences/preferencesSnapshot';
import { getActivityTracker } from '../activity/activityTracker';
import { getFocusEngine } from '../focus/focusEngine';

function isUserPreferences(value: unknown): value is UserPreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.focusMinutes === 'number'
    && typeof record.defaultScheduleBlockMinutes === 'number'
    && typeof record.breakMinutes === 'number'
    && typeof record.trackingEnabled === 'boolean'
    && typeof record.distractionThresholdMinutes === 'number'
    && typeof record.encouragementLevel === 'string'
    && typeof record.avatarStyle === 'string'
    && typeof record.quietMode === 'boolean'
    && typeof record.reminderTone === 'string'
    && typeof record.aiMessageVariationEnabled === 'boolean';
}

function isSyncPayload(value: unknown): value is {
  userId: string;
  sequence: number;
  preferences: UserPreferences;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.userId === 'string'
    && typeof record.sequence === 'number'
    && isUserPreferences(record.preferences);
}

function applyToRuntime(preferences: UserPreferences): void {
  const tracker = getActivityTracker();
  tracker.applyPreferences(preferences);
  getFocusEngine().applyDefaultDuration(preferences.focusMinutes);
}

export function registerPreferencesHandlers(): void {
  ipcMain.handle('preferences:getSnapshot', () => {
    const current = getPreferencesSnapshot();
    return {
      userId: current.userId,
      sequence: current.sequence,
      preferences: {
        focusMinutes: current.focusMinutes,
        defaultScheduleBlockMinutes: current.defaultScheduleBlockMinutes,
        breakMinutes: current.breakMinutes,
        trackingEnabled: current.trackingEnabled,
        distractionThresholdMinutes: current.distractionThresholdMinutes,
        encouragementLevel: current.encouragementLevel,
        avatarStyle: current.avatarStyle,
        quietMode: current.quietMode,
        reminderTone: current.reminderTone,
        aiMessageVariationEnabled: current.aiMessageVariationEnabled,
      },
    };
  });

  ipcMain.handle('preferences:sync', (_event, payload: unknown) => {
    if (!isSyncPayload(payload)) {
      throw new Error('Invalid preferences sync payload.');
    }

    const applied = applyPreferencesSnapshot(
      payload.userId,
      payload.sequence,
      payload.preferences,
    );

    if (applied) {
      applyToRuntime(payload.preferences);
    }

    return { applied };
  });

  ipcMain.handle('preferences:reset', (_event, payload: unknown) => {
    const sequence = typeof payload === 'object'
      && payload !== null
      && 'sequence' in payload
      && typeof (payload as { sequence: unknown }).sequence === 'number'
      ? (payload as { sequence: number }).sequence
      : getPreferencesSnapshot().sequence + 1;

    resetPreferencesSnapshot();
    applyToRuntime(DEFAULT_USER_PREFERENCES);
    return { sequence };
  });
}
