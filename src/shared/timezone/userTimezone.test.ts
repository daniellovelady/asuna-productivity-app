import { describe, expect, it } from 'vitest';
import {
  isSupportedIanaTimeZone,
  resolveOsTimeZone,
  resolveUserTimeZone,
} from './userTimezone';

describe('userTimezone', () => {
  it('accepts a valid IANA zone', () => {
    expect(isSupportedIanaTimeZone('America/Chicago')).toBe(true);
    expect(isSupportedIanaTimeZone('UTC')).toBe(true);
  });

  it('rejects invalid zone names', () => {
    expect(isSupportedIanaTimeZone('Not/A_Real_Zone')).toBe(false);
    expect(isSupportedIanaTimeZone('')).toBe(false);
  });

  it('prefers stored profile over OS', () => {
    expect(resolveUserTimeZone('Pacific/Honolulu', 'America/Chicago')).toBe('Pacific/Honolulu');
  });

  it('treats schema-default UTC as unset and uses OS IANA', () => {
    expect(resolveUserTimeZone('UTC', 'America/Chicago')).toBe('America/Chicago');
  });

  it('treats null profile timezone as unset', () => {
    expect(resolveUserTimeZone(null, 'America/Chicago')).toBe('America/Chicago');
  });

  it('falls back to OS when profile is invalid', () => {
    expect(resolveUserTimeZone('bogus/zone', 'America/Denver')).toBe('America/Denver');
  });

  it('falls back to UTC when both are invalid', () => {
    expect(resolveUserTimeZone('bogus/zone', 'also/bogus')).toBe('UTC');
  });

  it('resolveOsTimeZone returns a supported zone or UTC', () => {
    const osZone = resolveOsTimeZone();
    expect(isSupportedIanaTimeZone(osZone)).toBe(true);
  });

  it('does not embed a fixed geographic default', () => {
    const resolved = resolveUserTimeZone(null, null);
    expect(resolved).toBe('UTC');
    expect(resolved).not.toBe('America/Chicago');
  });
});

describe('userTimezone DST boundaries', () => {
  it('America/Chicago spring-forward local day keys differ at UTC midnight', () => {
    // Instant where UTC is already March 9 but Chicago is still March 8 local
    const utcNoon = new Date('2026-03-09T04:30:00.000Z');
    const chicagoDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(utcNoon);
    const utcDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(utcNoon);

    expect(chicagoDay).not.toBe(utcDay);
  });
});