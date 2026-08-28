const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 60;
const DURATION_STEP_MINUTES = 5;

export function isValidFocusDurationMinutes(minutes: unknown): minutes is number {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }

  if (minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
    return false;
  }

  return minutes % DURATION_STEP_MINUTES === 0;
}

export function assertValidFocusDurationMinutes(minutes: unknown): asserts minutes is number {
  if (!isValidFocusDurationMinutes(minutes)) {
    throw new Error(
      `Duration must be an integer from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES} in ${DURATION_STEP_MINUTES}-minute increments.`,
    );
  }
}

export const FOCUS_DURATION_OPTIONS = Array.from(
  { length: (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES + 1 },
  (_, index) => MIN_DURATION_MINUTES + index * DURATION_STEP_MINUTES,
);
