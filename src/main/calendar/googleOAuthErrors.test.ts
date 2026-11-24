import { describe, expect, it } from 'vitest';
import {
  GOOGLE_CALENDAR_REAUTH_USER_MESSAGE,
  GoogleTokenRefreshError,
  classifyGoogleTokenRefreshError,
} from './googleOAuthErrors';

describe('googleOAuthErrors', () => {
  it('exposes a user-safe reauth message without OAuth error codes', () => {
    expect(GOOGLE_CALENDAR_REAUTH_USER_MESSAGE).not.toMatch(/invalid_grant/i);
    expect(GOOGLE_CALENDAR_REAUTH_USER_MESSAGE).toContain('Reconnect Google Calendar');
  });

  it('classifies Gaxios invalid_grant responses', () => {
    const error = {
      response: {
        data: {
          error: 'invalid_grant',
        },
      },
      message: 'Bad Request',
    };

    const classified = classifyGoogleTokenRefreshError(error);
    expect(classified).toBeInstanceOf(GoogleTokenRefreshError);
    expect(classified.code).toBe('invalid_grant');
  });

  it('classifies invalid_grant mentioned in message text', () => {
    const classified = classifyGoogleTokenRefreshError(new Error('Token refresh failed: invalid_grant'));
    expect(classified.code).toBe('invalid_grant');
  });

  it('treats unknown failures as transient', () => {
    const classified = classifyGoogleTokenRefreshError(new Error('network timeout'));
    expect(classified.code).toBe('transient');
  });
});