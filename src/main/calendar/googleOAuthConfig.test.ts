import { afterEach, describe, expect, it } from 'vitest';
import {
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  getGoogleOAuthConfigDiagnostic,
  GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE,
  GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE,
  requireGoogleOAuthCredentials,
} from './googleOAuthConfig';

const ENV_KEYS = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'] as const;

function clearGoogleOAuthEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearGoogleOAuthEnv();
});

describe('googleOAuthConfig', () => {
  it('fails when client ID is missing', () => {
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'secret-value';

    expect(() => requireGoogleOAuthCredentials()).toThrow(GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE);
    expect(getGoogleOAuthClientId()).toBeNull();
  });

  it('fails when client secret is missing', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client-id.apps.googleusercontent.com';

    expect(() => requireGoogleOAuthCredentials()).toThrow(GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE);
    expect(getGoogleOAuthClientSecret()).toBeNull();
  });

  it('returns trimmed credentials when both are set', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = '  id.apps.googleusercontent.com  ';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = '  my-secret  ';

    expect(requireGoogleOAuthCredentials()).toEqual({
      clientId: 'id.apps.googleusercontent.com',
      clientSecret: 'my-secret',
    });
  });

  it('diagnostics never include secret or client id values', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'leak-id.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'super-secret-material';

    const diagnostic = getGoogleOAuthConfigDiagnostic();
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.ready).toBe(true);
    expect(serialized).not.toContain('leak-id');
    expect(serialized).not.toContain('super-secret');
    expect(diagnostic).toEqual({
      hasClientId: true,
      hasClientSecret: true,
      ready: true,
      issues: [],
    });
  });
});
