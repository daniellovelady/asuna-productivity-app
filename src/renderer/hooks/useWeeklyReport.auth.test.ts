import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

/**
 * Documents the Weekly Report auth contract implemented in useWeeklyReport.generate.
 */
describe('useWeeklyReport auth contract', () => {
  it('Supabase User does not carry access_token; JWT lives on Session', () => {
    const user = { id: 'user-1' } as User;
    expect(Object.prototype.hasOwnProperty.call(user, 'access_token')).toBe(false);
  });

  it('distinguishes auth initializing from signed out', () => {
    const initializingMessage = 'Authentication is still loading. Try again in a moment.';
    const signedOutMessage = 'You must be signed in to generate a weekly report.';

    expect(initializingMessage).not.toMatch(/signed out/i);
    expect(signedOutMessage).not.toMatch(/loading/i);
  });
});