import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE,
  GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE,
} from './googleOAuthConfig';

const oauth2Instances: Array<{
  opts: Record<string, unknown>;
  generateCodeVerifierAsync: ReturnType<typeof vi.fn>;
  generateAuthUrl: ReturnType<typeof vi.fn>;
  getToken: ReturnType<typeof vi.fn>;
}> = [];

const OAuth2ClientMock = vi.fn(function OAuth2ClientMock(this: unknown, opts: Record<string, unknown>) {
  const instance = {
    opts,
    generateCodeVerifierAsync: vi.fn(async () => ({
      codeVerifier: 'test-verifier',
      codeChallenge: 'test-challenge',
    })),
    generateAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?test=1'),
    getToken: vi.fn(async () => ({
      tokens: {
        refresh_token: 'refresh',
        access_token: 'access',
        expiry_date: Date.now() + 3600_000,
      },
    })),
  };
  oauth2Instances.push(instance);
  return instance;
});

vi.mock('google-auth-library', () => ({
  OAuth2Client: OAuth2ClientMock,
}));

const openExternal = vi.fn(async () => undefined);

vi.mock('electron', () => ({
  shell: {
    openExternal,
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
  },
}));

vi.mock('./calendarTokenStore', () => ({
  saveTokens: vi.fn(),
  loadTokens: vi.fn(),
  deleteTokens: vi.fn(),
}));

const ENV_KEYS = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'] as const;

function setGoogleOAuthEnv(overrides: Partial<Record<typeof ENV_KEYS[number], string>>): void {
  process.env.GOOGLE_OAUTH_CLIENT_ID = overrides.GOOGLE_OAUTH_CLIENT_ID ?? 'id.apps.googleusercontent.com';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = overrides.GOOGLE_OAUTH_CLIENT_SECRET ?? 'client-secret';
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  oauth2Instances.length = 0;
  OAuth2ClientMock.mockClear();
  openExternal.mockClear();
});

describe('googleOAuthService', () => {
  beforeEach(() => {
    setGoogleOAuthEnv({});
  });

  it('createOAuthClient passes clientId, clientSecret, and redirectUri to OAuth2Client', async () => {
    const { createOAuthClient } = await import('./googleOAuthService');
    const redirectUri = 'http://127.0.0.1:43210/oauth/callback';

    createOAuthClient(redirectUri);

    expect(OAuth2ClientMock).toHaveBeenCalledTimes(1);
    expect(oauth2Instances[0]?.opts).toEqual({
      clientId: 'id.apps.googleusercontent.com',
      clientSecret: 'client-secret',
      redirectUri,
    });
  });

  it('runGoogleConnectFlow rejects missing client ID before opening the browser', async () => {
    setGoogleOAuthEnv({ GOOGLE_OAUTH_CLIENT_ID: '' });

    const { runGoogleConnectFlow, GoogleOAuthError } = await import('./googleOAuthService');

    await expect(runGoogleConnectFlow('user-1')).rejects.toThrow(GoogleOAuthError);
    await expect(runGoogleConnectFlow('user-1')).rejects.toThrow(GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('runGoogleConnectFlow rejects missing client secret before opening the browser', async () => {
    setGoogleOAuthEnv({ GOOGLE_OAUTH_CLIENT_SECRET: '' });

    const { runGoogleConnectFlow, GoogleOAuthError } = await import('./googleOAuthService');

    await expect(runGoogleConnectFlow('user-1')).rejects.toThrow(GoogleOAuthError);
    await expect(runGoogleConnectFlow('user-1')).rejects.toThrow(GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('token exchange uses the same redirect URI as the auth request and includes PKCE verifier', async () => {
    const { runGoogleConnectFlow } = await import('./googleOAuthService');

    const flowPromise = runGoogleConnectFlow('user-1');

    await vi.waitFor(() => expect(oauth2Instances.length).toBe(1));
    await vi.waitFor(() => expect(openExternal).toHaveBeenCalled());

    const client = oauth2Instances[0];
    const redirectUri = client?.opts.redirectUri as string;
    expect(redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/oauth\/callback$/);

    expect(client?.generateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      scope: expect.any(Array),
      prompt: 'consent',
      code_challenge: 'test-challenge',
      code_challenge_method: 'S256',
    });

    const callbackUrl = `${redirectUri}?code=auth-code`;
    const response = await fetch(callbackUrl);
    expect(response.status).toBe(200);

    await vi.waitFor(() => expect(client?.getToken).toHaveBeenCalled());
    expect(client?.getToken).toHaveBeenCalledWith({
      code: 'auth-code',
      codeVerifier: 'test-verifier',
    });

    await expect(flowPromise).resolves.toMatchObject({
      refreshToken: 'refresh',
      accessToken: 'access',
    });
  });
});
