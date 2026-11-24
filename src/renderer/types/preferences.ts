import type { EncouragementLevel, ReminderTone, UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import {
  isValidBreakMinutes,
  isValidDefaultScheduleBlockMinutes,
  isValidFocusMinutes,
} from '../../shared/preferences/validation';
import { normalizeAvatarStyle } from '../../shared/assistant/avatars';

export type {
  EncouragementLevel,
  ReminderTone,
  AvatarStyle,
  UserPreferences,
} from '../../shared/preferences/types';

export { DEFAULT_USER_PREFERENCES };

export type PreferencesRow = {
  focus_minutes: number;
  default_schedule_block_minutes?: number;
  break_minutes: number;
  tracking_enabled: boolean;
  distraction_threshold_minutes: number;
  encouragement_level: EncouragementLevel;
  avatar_style: string;
  quiet_mode?: boolean;
  reminder_tone?: ReminderTone;
  ai_message_variation_enabled?: boolean;
};

const ENCOURAGEMENT_LEVELS = new Set<EncouragementLevel>(['low', 'medium', 'high']);
const REMINDER_TONES = new Set<ReminderTone>(['gentle', 'neutral', 'direct']);

export function mapPreferencesRow(row: PreferencesRow | null): UserPreferences {
  if (!row) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  const encouragementLevel = ENCOURAGEMENT_LEVELS.has(row.encouragement_level)
    ? row.encouragement_level
    : DEFAULT_USER_PREFERENCES.encouragementLevel;

  const reminderTone = row.reminder_tone && REMINDER_TONES.has(row.reminder_tone)
    ? row.reminder_tone
    : DEFAULT_USER_PREFERENCES.reminderTone;

  return {
    focusMinutes: isValidFocusMinutes(row.focus_minutes)
      ? row.focus_minutes
      : DEFAULT_USER_PREFERENCES.focusMinutes,
    defaultScheduleBlockMinutes: isValidDefaultScheduleBlockMinutes(row.default_schedule_block_minutes)
      ? row.default_schedule_block_minutes
      : DEFAULT_USER_PREFERENCES.defaultScheduleBlockMinutes,
    breakMinutes: isValidBreakMinutes(row.break_minutes)
      ? row.break_minutes
      : DEFAULT_USER_PREFERENCES.breakMinutes,
    trackingEnabled: row.tracking_enabled ?? DEFAULT_USER_PREFERENCES.trackingEnabled,
    distractionThresholdMinutes: row.distraction_threshold_minutes
      ?? DEFAULT_USER_PREFERENCES.distractionThresholdMinutes,
    encouragementLevel,
    avatarStyle: normalizeAvatarStyle(row.avatar_style),
    quietMode: row.quiet_mode ?? DEFAULT_USER_PREFERENCES.quietMode,
    reminderTone,
    aiMessageVariationEnabled: row.ai_message_variation_enabled
      ?? DEFAULT_USER_PREFERENCES.aiMessageVariationEnabled,
  };
}

export function mapPreferencesToRow(
  preferences: Partial<UserPreferences>,
): Partial<PreferencesRow> {
  const row: Partial<PreferencesRow> = {};

  if (preferences.focusMinutes !== undefined) {
    row.focus_minutes = preferences.focusMinutes;
  }
  if (preferences.defaultScheduleBlockMinutes !== undefined) {
    row.default_schedule_block_minutes = preferences.defaultScheduleBlockMinutes;
  }
  if (preferences.breakMinutes !== undefined) {
    row.break_minutes = preferences.breakMinutes;
  }
  if (preferences.trackingEnabled !== undefined) {
    row.tracking_enabled = preferences.trackingEnabled;
  }
  if (preferences.distractionThresholdMinutes !== undefined) {
    row.distraction_threshold_minutes = preferences.distractionThresholdMinutes;
  }
  if (preferences.encouragementLevel !== undefined) {
    row.encouragement_level = preferences.encouragementLevel;
  }
  if (preferences.avatarStyle !== undefined) {
    row.avatar_style = preferences.avatarStyle;
  }
  if (preferences.quietMode !== undefined) {
    row.quiet_mode = preferences.quietMode;
  }
  if (preferences.reminderTone !== undefined) {
    row.reminder_tone = preferences.reminderTone;
  }
  if (preferences.aiMessageVariationEnabled !== undefined) {
    row.ai_message_variation_enabled = preferences.aiMessageVariationEnabled;
  }

  return row;
}

export function validatePreferencesUpdate(
  update: Partial<UserPreferences>,
): string | null {
  if (update.focusMinutes !== undefined && !isValidFocusMinutes(update.focusMinutes)) {
    return 'Focus duration must be between 5 and 60 minutes in 5-minute steps.';
  }

  if (
    update.defaultScheduleBlockMinutes !== undefined
    && !isValidDefaultScheduleBlockMinutes(update.defaultScheduleBlockMinutes)
  ) {
    return 'Default schedule block must be between 15 and 240 minutes in 15-minute steps.';
  }

  if (update.breakMinutes !== undefined && !isValidBreakMinutes(update.breakMinutes)) {
    return 'Break duration must be between 1 and 30 minutes.';
  }

  if (
    update.encouragementLevel !== undefined
    && !ENCOURAGEMENT_LEVELS.has(update.encouragementLevel)
  ) {
    return 'Invalid encouragement level.';
  }

  if (update.reminderTone !== undefined && !REMINDER_TONES.has(update.reminderTone)) {
    return 'Invalid reminder tone.';
  }

  if (update.avatarStyle !== undefined) {
    const normalized = normalizeAvatarStyle(update.avatarStyle);
    if (normalized !== update.avatarStyle) {
      return 'Invalid avatar style.';
    }
  }

  return null;
}
