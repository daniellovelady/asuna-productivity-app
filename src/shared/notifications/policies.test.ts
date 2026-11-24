import { describe, expect, it } from 'vitest';
import {
  getSupportedActionsForType,
  getTtlMsForType,
  isDesktopEligible,
  isSuppressedByQuietMode,
  isSuppressedForPreferenceReadiness,
} from './policies';

describe('notification policies', () => {
  it('suppresses focus encouragement in quiet mode', () => {
    expect(isSuppressedByQuietMode('focus_encouragement', true)).toBe(true);
  });

  it('does not suppress focus_complete in quiet mode', () => {
    expect(isSuppressedByQuietMode('focus_complete', true)).toBe(false);
  });

  it('does not suppress focus_started in quiet mode', () => {
    expect(isSuppressedByQuietMode('focus_started', true)).toBe(false);
  });

  it('suppresses proactive notifications when preferences are not owner-matched', () => {
    expect(isSuppressedForPreferenceReadiness('focus_encouragement', false)).toBe(true);
    expect(isSuppressedForPreferenceReadiness('focus_complete', false)).toBe(false);
  });

  it('marks focus encouragement, focus_complete, and break_complete as desktop eligible', () => {
    expect(isDesktopEligible('focus_encouragement')).toBe(true);
    expect(isDesktopEligible('focus_started')).toBe(true);
    expect(isDesktopEligible('focus_complete')).toBe(true);
    expect(isDesktopEligible('break_complete')).toBe(true);
    expect(isDesktopEligible('distraction_warning')).toBe(false);
    expect(isDesktopEligible('break_reminder')).toBe(false);
  });

  it('returns lifecycle actions for focus_complete and break_complete', () => {
    expect(getSupportedActionsForType('focus_complete')).toEqual(['start_break', 'dismiss']);
    expect(getSupportedActionsForType('break_complete')).toEqual(['start_focus', 'dismiss']);
    expect(getSupportedActionsForType('focus_encouragement')).toEqual(['dismiss']);
  });

  it('keeps lifecycle notifications persistent', () => {
    expect(getTtlMsForType('focus_complete')).toBeNull();
    expect(getTtlMsForType('break_complete')).toBeNull();
  });

  it('uses short TTL for focus_started confirmations', () => {
    expect(getTtlMsForType('focus_started')).toBe(7_000);
  });

  it('does not suppress break_complete in quiet mode', () => {
    expect(isSuppressedByQuietMode('break_complete', true)).toBe(false);
  });
});
