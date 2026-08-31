import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export class PreferencesServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreferencesServiceError';
  }
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new PreferencesServiceError('You must be signed in to load preferences.');
  }

  return data.user.id;
}

export async function getTrackingEnabledPreference(
  client: SupabaseClient,
): Promise<boolean> {
  const userId = await getAuthenticatedUserId(client);

  const { data, error } = await client
    .from('preferences')
    .select('tracking_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new PreferencesServiceError('Failed to load tracking preference.');
  }

  return data?.tracking_enabled ?? false;
}

export async function setTrackingEnabledPreference(
  client: SupabaseClient,
  enabled: boolean,
): Promise<void> {
  const userId = await getAuthenticatedUserId(client);

  const { error } = await client
    .from('preferences')
    .update({ tracking_enabled: enabled })
    .eq('user_id', userId);

  if (error) {
    throw new PreferencesServiceError('Failed to update tracking preference.');
  }
}

export const preferencesService = {
  getTrackingEnabled: () => getTrackingEnabledPreference(supabase),
  setTrackingEnabled: (enabled: boolean) => setTrackingEnabledPreference(supabase, enabled),
};
