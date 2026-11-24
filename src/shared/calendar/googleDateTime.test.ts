import { describe, expect, it } from 'vitest';
import { googleDateTimeToUtcIso } from './googleDateTime';

describe('googleDateTimeToUtcIso', () => {
  it('preserves explicit UTC offset in the string', () => {
    expect(googleDateTimeToUtcIso('2026-11-23T13:25:00Z', undefined, 'America/Chicago')).toBe(
      '2026-11-23T13:25:00.000Z',
    );
  });

  it('preserves explicit numeric offset', () => {
    expect(
      googleDateTimeToUtcIso('2026-11-23T13:25:00-06:00', undefined, 'America/Chicago'),
    ).toBe('2026-11-23T19:25:00.000Z');
  });

  it('interprets offset-less datetime in event timeZone', () => {
    expect(
      googleDateTimeToUtcIso(
        '2026-11-23T13:25:00',
        'America/Chicago',
        'America/Los_Angeles',
      ),
    ).toBe('2026-11-23T19:25:00.000Z');
  });

  it('uses fallback timeZone when event timeZone is missing', () => {
    expect(
      googleDateTimeToUtcIso('2026-11-23T13:25:00', undefined, 'America/Chicago'),
    ).toBe('2026-11-23T19:25:00.000Z');
  });
});