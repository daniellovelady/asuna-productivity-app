export function formatAnalyticsMinutes(minutes: number | null): string {
  if (minutes === null) {
    return '—';
  }

  const clampedMinutes = Math.max(0, minutes);
  const wholeMinutes = Math.floor(clampedMinutes);
  const hours = Math.floor(wholeMinutes / 60);
  const remainingMinutes = wholeMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

export function formatAnalyticsPercent(percent: number | null): string {
  if (percent === null) {
    return '—';
  }

  return `${percent}%`;
}
