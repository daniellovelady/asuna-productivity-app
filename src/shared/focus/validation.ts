export {
  FOCUS_MIN_MINUTES as MIN_DURATION_MINUTES,
  FOCUS_MAX_MINUTES as MAX_DURATION_MINUTES,
  FOCUS_STEP_MINUTES as DURATION_STEP_MINUTES,
  FOCUS_DURATION_OPTIONS,
  isValidFocusMinutes as isValidFocusDurationMinutes,
} from '../preferences/validation';

import { isValidFocusMinutes } from '../preferences/validation';

export function assertValidFocusDurationMinutes(minutes: unknown): asserts minutes is number {
  if (!isValidFocusMinutes(minutes)) {
    throw new Error(
      'Duration must be an integer from 5 to 60 in 5-minute increments.',
    );
  }
}
