import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { getPreferencesSnapshot } from '../preferences/preferencesSnapshot';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import type { SafeNotificationPreferences } from '../../shared/notifications/types';

function cosmeticFallbackPreferences(): SafeNotificationPreferences {
  return {
    ownerMatched: false,
    avatarStyle: DEFAULT_USER_PREFERENCES.avatarStyle,
    reminderTone: DEFAULT_USER_PREFERENCES.reminderTone,
    quietMode: DEFAULT_USER_PREFERENCES.quietMode,
    aiMessageVariationEnabled: false,
  };
}

export function resolveSafePreferencesForNotification(
  ownerUserId: string,
): SafeNotificationPreferences {
  const authUserId = getAuthContextSnapshot().userId;
  const prefs = getPreferencesSnapshot();

  if (
    authUserId === null
    || authUserId !== ownerUserId
    || prefs.userId === null
    || prefs.userId !== ownerUserId
  ) {
    return cosmeticFallbackPreferences();
  }

  return {
    ownerMatched: true,
    avatarStyle: prefs.avatarStyle,
    reminderTone: prefs.reminderTone,
    quietMode: prefs.quietMode,
    aiMessageVariationEnabled: prefs.aiMessageVariationEnabled,
  };
}

export function arePreferencesMatchedForOwner(ownerUserId: string): boolean {
  return resolveSafePreferencesForNotification(ownerUserId).ownerMatched;
}
