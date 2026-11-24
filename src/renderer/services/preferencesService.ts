import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  DEFAULT_USER_PREFERENCES,
  mapPreferencesRow,
  mapPreferencesToRow,
  type PreferencesRow,
  type UserPreferences,
  validatePreferencesUpdate,
} from '../types/preferences';

export class PreferencesServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreferencesServiceError';
  }
}

const PREFERENCES_SELECT = [
  'focus_minutes',
  'default_schedule_block_minutes',
  'break_minutes',
  'tracking_enabled',
  'distraction_threshold_minutes',
  'encouragement_level',
  'avatar_style',
  'quiet_mode',
  'reminder_tone',
  'ai_message_variation_enabled',
].join(', ');

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new PreferencesServiceError('You must be signed in to load preferences.');
  }

  return data.user.id;
}

export async function getPreferences(
  client: SupabaseClient,
): Promise<UserPreferences> {
  const userId = await getAuthenticatedUserId(client);

  const { data, error } = await client
    .from('preferences')
    .select(PREFERENCES_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new PreferencesServiceError('Failed to load preferences.');
  }

  return mapPreferencesRow(data as PreferencesRow | null);
}

export async function updatePreferences(
  client: SupabaseClient,
  update: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const validationError = validatePreferencesUpdate(update);
  if (validationError) {
    throw new PreferencesServiceError(validationError);
  }

  const userId = await getAuthenticatedUserId(client);
  const rowUpdate = mapPreferencesToRow(update);

  if (Object.keys(rowUpdate).length === 0) {
    return getPreferences(client);
  }

  const { error } = await client
    .from('preferences')
    .update(rowUpdate)
    .eq('user_id', userId);

  if (error) {
    throw new PreferencesServiceError('Failed to update preferences.');
  }

  return getPreferences(client);
}

export async function getTrackingEnabledPreference(
  client: SupabaseClient,
): Promise<boolean> {
  const preferences = await getPreferences(client);
  return preferences.trackingEnabled;
}

export async function setTrackingEnabledPreference(
  client: SupabaseClient,
  enabled: boolean,
): Promise<void> {
  await updatePreferences(client, { trackingEnabled: enabled });
}

export const preferencesService = {
  getPreferences: () => getPreferences(supabase),
  updatePreferences: (update: Partial<UserPreferences>) => updatePreferences(supabase, update),
  getTrackingEnabled: () => getTrackingEnabledPreference(supabase),
  setTrackingEnabled: (enabled: boolean) => setTrackingEnabledPreference(supabase, enabled),
  getDefaults: () => ({ ...DEFAULT_USER_PREFERENCES }),
};
