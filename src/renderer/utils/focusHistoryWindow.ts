export type RollingSevenDayWindow = {
  windowStartIso: string;
  windowEndIso: string;
};

export function computeRollingSevenDayWindow(now: Date): RollingSevenDayWindow {
  const windowEnd = new Date(now.getTime());
  const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
  };
}
