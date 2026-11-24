import {
  resolveOsTimeZone,
  resolveUserTimeZone,
} from '../../shared/timezone/userTimezone';
import { backfillProfileTimeZoneFromOs, fetchProfileTimeZone } from './profileService';

export async function resolveAuthContextTimeZone(userId: string | null): Promise<string> {
  if (userId === null) {
    return 'UTC';
  }

  const osTimeZone = resolveOsTimeZone();
  const storedBefore = await fetchProfileTimeZone(userId);

  if (import.meta.env.DEV) {
    console.info('[calendar-timezone]', {
      boundary: 'resolveAuthContextTimeZone',
      profileTimezoneDbValue: storedBefore ?? null,
      osResolvedTimeZone: osTimeZone,
    });
  }

  const backfilled = await backfillProfileTimeZoneFromOs(userId, osTimeZone);
  const stored = backfilled ?? storedBefore;
  const effective = resolveUserTimeZone(stored, osTimeZone);

  if (import.meta.env.DEV) {
    console.info('[calendar-timezone]', {
      boundary: 'resolveAuthContextTimeZone',
      effectiveTimeZone: effective,
      profileTimeZoneBackfilled: backfilled !== null,
    });
  }

  return effective;
}