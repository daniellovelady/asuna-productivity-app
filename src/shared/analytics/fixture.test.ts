import { describe, expect, it } from 'vitest';
import { computeAnalyticsSnapshot, getBreakComplianceDetails } from './computeSnapshot';
import {
  FIXTURE_ACTIVITY_SAMPLES,
  FIXTURE_AS_OF_DATE,
  FIXTURE_BREAK_MINUTES,
  FIXTURE_EXPECTED,
  FIXTURE_FOCUS_SESSIONS,
  FIXTURE_TIMEZONE,
} from './fixture';

const VALID_TIMEZONES = new Set([FIXTURE_TIMEZONE, 'UTC']);

describe('analytics fixture known answers', () => {
  const snapshot = computeAnalyticsSnapshot({
    asOfLocalDate: FIXTURE_AS_OF_DATE,
    storedTimezone: FIXTURE_TIMEZONE,
    validTimezoneNames: VALID_TIMEZONES,
    breakMinutes: FIXTURE_BREAK_MINUTES,
    focusSessions: FIXTURE_FOCUS_SESSIONS,
    activitySamples: FIXTURE_ACTIVITY_SAMPLES,
  });

  it('matches total focus minutes', () => {
    expect(snapshot.totalFocusMinutes).toBe(FIXTURE_EXPECTED.totalFocusMinutes);
  });

  it('matches focus today', () => {
    expect(snapshot.focusTodayMinutes).toBe(FIXTURE_EXPECTED.focusTodayMinutes);
  });

  it('matches focus by day including zero-day rows', () => {
    expect(snapshot.focusByDay).toEqual(FIXTURE_EXPECTED.focusByDay);
  });

  it('matches focus by task ordering', () => {
    expect(snapshot.focusByTask).toEqual(FIXTURE_EXPECTED.focusByTask);
  });

  it('matches completed session count', () => {
    expect(snapshot.completedSessions).toBe(FIXTURE_EXPECTED.completedSessions);
  });

  it('matches interruption count', () => {
    expect(snapshot.interruptionCount).toBe(FIXTURE_EXPECTED.interruptionCount);
  });

  it('matches average session length', () => {
    expect(snapshot.averageSessionMinutes).toBeCloseTo(FIXTURE_EXPECTED.averageSessionMinutes, 10);
  });

  it('matches break compliance numerator and denominator', () => {
    const details = getBreakComplianceDetails({
      asOfLocalDate: FIXTURE_AS_OF_DATE,
      storedTimezone: FIXTURE_TIMEZONE,
      validTimezoneNames: VALID_TIMEZONES,
      breakMinutes: FIXTURE_BREAK_MINUTES,
      focusSessions: FIXTURE_FOCUS_SESSIONS,
      activitySamples: FIXTURE_ACTIVITY_SAMPLES,
    });

    expect(details.compliantCount).toBe(FIXTURE_EXPECTED.breakCompliance.compliantCount);
    expect(details.eligibleCount).toBe(FIXTURE_EXPECTED.breakCompliance.eligibleCount);
    expect(snapshot.breakCompliancePercent).toBe(FIXTURE_EXPECTED.breakCompliance.percent);
  });

  it('matches top distracting apps ordering and durations', () => {
    expect(snapshot.topDistractingApps).toEqual(FIXTURE_EXPECTED.topDistractingApps);
  });

  it('uses the validated timezone in the range metadata', () => {
    expect(snapshot.range).toEqual({
      start: '2026-08-25',
      end: '2026-08-31',
      timezone: FIXTURE_TIMEZONE,
    });
  });

  it('falls back to UTC for invalid stored timezones', () => {
    const invalidTimezoneSnapshot = computeAnalyticsSnapshot({
      asOfLocalDate: FIXTURE_AS_OF_DATE,
      storedTimezone: 'Not/A/Timezone',
      validTimezoneNames: VALID_TIMEZONES,
      breakMinutes: FIXTURE_BREAK_MINUTES,
      focusSessions: [],
      activitySamples: [],
    });

    expect(invalidTimezoneSnapshot.range.timezone).toBe('UTC');
    expect(invalidTimezoneSnapshot.breakCompliancePercent).toBeNull();
  });
});
