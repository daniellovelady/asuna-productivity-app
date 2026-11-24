export const FOCUS_MIN_MINUTES = 5;
export const FOCUS_MAX_MINUTES = 60;
export const FOCUS_STEP_MINUTES = 5;

export const BREAK_MIN_MINUTES = 1;
export const BREAK_MAX_MINUTES = 30;

export const SCHEDULE_BLOCK_MIN_MINUTES = 15;
export const SCHEDULE_BLOCK_MAX_MINUTES = 240;
export const SCHEDULE_BLOCK_STEP_MINUTES = 15;

export function isValidDefaultScheduleBlockMinutes(minutes: unknown): minutes is number {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }

  return minutes >= SCHEDULE_BLOCK_MIN_MINUTES
    && minutes <= SCHEDULE_BLOCK_MAX_MINUTES
    && minutes % SCHEDULE_BLOCK_STEP_MINUTES === 0;
}

export function isValidFocusMinutes(minutes: unknown): minutes is number {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }

  return minutes >= FOCUS_MIN_MINUTES
    && minutes <= FOCUS_MAX_MINUTES
    && minutes % FOCUS_STEP_MINUTES === 0;
}

export function isValidBreakMinutes(minutes: unknown): minutes is number {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }

  return minutes >= BREAK_MIN_MINUTES && minutes <= BREAK_MAX_MINUTES;
}

export const FOCUS_DURATION_OPTIONS = Array.from(
  { length: (FOCUS_MAX_MINUTES - FOCUS_MIN_MINUTES) / FOCUS_STEP_MINUTES + 1 },
  (_, index) => FOCUS_MIN_MINUTES + index * FOCUS_STEP_MINUTES,
);

export const BREAK_DURATION_OPTIONS = Array.from(
  { length: BREAK_MAX_MINUTES - BREAK_MIN_MINUTES + 1 },
  (_, index) => BREAK_MIN_MINUTES + index,
);
