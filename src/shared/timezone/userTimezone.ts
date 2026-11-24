/**
 * Resolves the effective IANA timezone for calendar grouping and display.
 * Hierarchy: explicit user profile IANA → OS/browser IANA → UTC.
 *
 * `profiles.timezone` defaults to this value on signup; it is a placeholder, not an explicit user choice.
 */
export const PROFILE_TIMEZONE_SCHEMA_DEFAULT = 'UTC';

export function isProfileTimeZoneUnset(stored: string | null | undefined): boolean {
  if (stored == null) {
    return true;
  }

  const trimmed = stored.trim();
  return trimmed.length === 0 || trimmed === PROFILE_TIMEZONE_SCHEMA_DEFAULT;
}

export function isSupportedIanaTimeZone(timeZone: string): boolean {  const trimmed = timeZone.trim();
  if (!trimmed) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function resolveUserTimeZone(
  storedProfileTimeZone: string | null | undefined,
  osTimeZone: string | null | undefined,
): string {
  if (!isProfileTimeZoneUnset(storedProfileTimeZone) && typeof storedProfileTimeZone === 'string') {
    const storedTrimmed = storedProfileTimeZone.trim();
    if (isSupportedIanaTimeZone(storedTrimmed)) {
      return storedTrimmed;
    }
  }

  if (typeof osTimeZone === 'string') {
    const osTrimmed = osTimeZone.trim();
    if (isSupportedIanaTimeZone(osTrimmed)) {
      return osTrimmed;
    }
  }

  return 'UTC';
}

export function resolveOsTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}