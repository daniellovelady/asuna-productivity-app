import { describe, expect, it } from 'vitest';
import { describeAttributionOutcome } from './sessionAttribution';

describe('sessionAttribution', () => {
  it('promotes none context to task on attribution', () => {
    const outcome = describeAttributionOutcome('none');
    expect(outcome.mayChangeContextType).toBe(true);
    expect(outcome.nextContextType).toBe('task');
  });

  it('keeps task context for task sessions', () => {
    const outcome = describeAttributionOutcome('task');
    expect(outcome.nextContextType).toBe('task');
    expect(outcome.preservesCalendarFields).toBe(true);
  });

  it('preserves calendar context for calendar sessions', () => {
    const outcome = describeAttributionOutcome('calendar_event');
    expect(outcome.nextContextType).toBe('calendar_event');
    expect(outcome.preservesCalendarFields).toBe(true);
  });
});
