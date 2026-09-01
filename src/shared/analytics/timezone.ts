export function resolveEffectiveTimezone(
  storedTimezone: string | null | undefined,
  validTimezoneNames: ReadonlySet<string>,
): string {
  const trimmed = storedTimezone?.trim();

  if (!trimmed || !validTimezoneNames.has(trimmed)) {
    return 'UTC';
  }

  return trimmed;
}

export function formatLocalDate(isoUtc: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoUtc));
}

function formatLocalDateTimeParts(
  date: Date,
  timezone: string,
): { date: string; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '0';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
}

export function localMidnightUtcIso(localDate: string, timezone: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const dayStart = Date.UTC(year, month - 1, day - 1, 0, 0, 0);
  const dayEnd = Date.UTC(year, month - 1, day + 2, 0, 0, 0);

  for (let candidate = dayStart; candidate < dayEnd; candidate += 60_000) {
    const formatted = formatLocalDateTimeParts(new Date(candidate), timezone);

    if (
      formatted.date === localDate
      && formatted.hour === 0
      && formatted.minute === 0
      && formatted.second === 0
    ) {
      return new Date(candidate).toISOString();
    }
  }

  throw new Error(`Cannot resolve local midnight for ${localDate} in ${timezone}`);
}

export function addLocalDays(localDate: string, dayOffset: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return shifted.toISOString().slice(0, 10);
}

export function computeAnalyticsWindow(
  asOfLocalDate: string,
  timezone: string,
): { start: string; end: string; windowStartUtc: string; windowEndUtc: string } {
  const start = addLocalDays(asOfLocalDate, -6);
  const end = asOfLocalDate;
  const windowStartUtc = localMidnightUtcIso(start, timezone);
  const windowEndUtc = localMidnightUtcIso(addLocalDays(end, 1), timezone);

  return {
    start,
    end,
    windowStartUtc,
    windowEndUtc,
  };
}
