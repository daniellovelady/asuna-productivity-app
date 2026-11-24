import { describe, expect, it } from 'vitest';
import { interpretInstantInCalendarTimeZone } from './calendarTimedEventDiag';

describe('interpretInstantInCalendarTimeZone', () => {
  it('maps 19:25Z to 13:25 America/Chicago on 2026-11-23', () => {
    const result = interpretInstantInCalendarTimeZone(
      '2026-11-23T19:25:00.000Z',
      'America/Chicago',
    );
    expect(result).not.toBeNull();
    expect(result?.temporalHour).toBe(13);
    expect(result?.temporalMinute).toBe(25);
    expect(result?.temporalZonedStart).toContain('2026-11-23');
  });
});