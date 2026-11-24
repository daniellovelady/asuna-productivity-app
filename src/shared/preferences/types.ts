export type EncouragementLevel = 'low' | 'medium' | 'high';

export type ReminderTone = 'gentle' | 'neutral' | 'direct';

export type AvatarStyle = 'default' | 'calm' | 'energetic' | 'focused';

export interface UserPreferences {
  focusMinutes: number;
  defaultScheduleBlockMinutes: number;
  breakMinutes: number;
  trackingEnabled: boolean;
  distractionThresholdMinutes: number;
  encouragementLevel: EncouragementLevel;
  avatarStyle: AvatarStyle;
  quietMode: boolean;
  reminderTone: ReminderTone;
  aiMessageVariationEnabled: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  focusMinutes: 25,
  defaultScheduleBlockMinutes: 60,
  breakMinutes: 5,
  trackingEnabled: false,
  distractionThresholdMinutes: 5,
  encouragementLevel: 'medium',
  avatarStyle: 'default',
  quietMode: false,
  reminderTone: 'neutral',
  aiMessageVariationEnabled: false,
};
