import {
  isProfileTimeZoneUnset,
  isSupportedIanaTimeZone,
  PROFILE_TIMEZONE_SCHEMA_DEFAULT,
} from '../../shared/timezone/userTimezone';
import { supabase } from './supabaseClient';

export async function fetchProfileTimeZone(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  const value = data?.timezone;
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * When the DB still has the signup placeholder (`UTC`), persist the OS IANA zone once.
 * Does not overwrite an explicit non-placeholder profile timezone.
 */
export async function backfillProfileTimeZoneFromOs(
  userId: string,
  osTimeZone: string,
): Promise<string | null> {
  const stored = await fetchProfileTimeZone(userId);
  if (!isProfileTimeZoneUnset(stored)) {
    return null;
  }

  const osTrimmed = osTimeZone.trim();
  if (!isSupportedIanaTimeZone(osTrimmed) || osTrimmed === PROFILE_TIMEZONE_SCHEMA_DEFAULT) {
    return null;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ timezone: osTrimmed })
    .eq('id', userId);

  if (error) {
    return null;
  }

  return osTrimmed;
}