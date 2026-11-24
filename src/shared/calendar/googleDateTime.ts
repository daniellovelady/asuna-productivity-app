import { Temporal } from 'temporal-polyfill';

const HAS_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * Converts a Google Calendar `dateTime` string to a UTC ISO instant string.
 * Offset-less values are interpreted in `eventTimeZone` when present, otherwise `fallbackTimeZone`.
 */
export function googleDateTimeToUtcIso(
  dateTime: string,
  eventTimeZone: string | undefined,
  fallbackTimeZone: string,
): string {
  const trimmed = dateTime.trim();
  if (HAS_UTC_OFFSET.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  const zone = (eventTimeZone?.trim() || fallbackTimeZone).trim() || 'UTC';
  const instant = Temporal.ZonedDateTime.from(`${trimmed}[${zone}]`).toInstant();
  return new Date(instant.epochMilliseconds).toISOString();
}