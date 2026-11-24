import { shell } from 'electron';
import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import {
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  GOOGLE_OAUTH_SCOPES,
  requireGoogleOAuthCredentials,
} from './googleOAuthConfig';
import type { StoredGoogleTokens } from './calendarTokenStore';
import { deleteTokens, loadTokens, saveTokens } from './calendarTokenStore';
import { SafeStorageUnavailableError } from './safeStorageBlob';
import { classifyGoogleTokenRefreshError } from './googleOAuthErrors';

const LOOPBACK_TIMEOUT_MS = 10 * 60 * 1000;
const OAUTH_CALLBACK_PATH = '/oauth/callback';

export class GoogleOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

export function createOAuthClient(redirectUri: string): OAuth2Client {
  try {
    const { clientId, clientSecret } = requireGoogleOAuthCredentials();
    return new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
    });
  } catch (error) {
    throw new GoogleOAuthError(error instanceof Error ? error.message : 'Google Calendar OAuth is not configured.');
  }
}

function createOAuthClientForStoredTokens(): OAuth2Client | null {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientId || !clientSecret) {
    return null;
  }
  return new OAuth2Client({ clientId, clientSecret });
}

export async function runGoogleConnectFlow(userId: string): Promise<StoredGoogleTokens> {
  const { safeStorage } = await import('electron');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SafeStorageUnavailableError();
  }

  try {
    requireGoogleOAuthCredentials();
  } catch (error) {
    throw new GoogleOAuthError(error instanceof Error ? error.message : 'Google Calendar OAuth is not configured.');
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer();
    let settled = false;

    const finish = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      server.close();
      handler();
    };

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        finish(() => reject(new GoogleOAuthError('Could not start OAuth loopback listener.')));
        return;
      }

      const redirectUri = `http://127.0.0.1:${address.port}${OAUTH_CALLBACK_PATH}`;
      const client = createOAuthClient(redirectUri);
      let pendingCodeVerifier: string | null = null;

      void (async () => {
        try {
          const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
          pendingCodeVerifier = codeVerifier;
          const authUrl = client.generateAuthUrl({
            access_type: 'offline',
            scope: GOOGLE_OAUTH_SCOPES,
            prompt: 'consent',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          });

          await shell.openExternal(authUrl);
        } catch (error) {
          finish(() => reject(error instanceof Error ? error : new GoogleOAuthError('OAuth failed.')));
        }
      })();

      server.on('request', (req, res) => {
        if (!req.url?.startsWith(OAUTH_CALLBACK_PATH)) {
          res.writeHead(404);
          res.end();
          return;
        }

        const url = new URL(req.url, redirectUri);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Authorization complete. You can close this tab.</p></body></html>');

        if (errorParam) {
          finish(() => reject(new GoogleOAuthError('Google authorization was denied.')));
          return;
        }

        if (!code) {
          finish(() => reject(new GoogleOAuthError('Missing authorization code.')));
          return;
        }

        void client.getToken({ code, codeVerifier: pendingCodeVerifier ?? undefined }).then(({ tokens }) => {
          if (!tokens.refresh_token) {
            finish(() => reject(new GoogleOAuthError(
              'No refresh token received. Disconnect in Google account settings and try again.',
            )));
            return;
          }

          const stored: StoredGoogleTokens = {
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token ?? null,
            expiryDateMs: tokens.expiry_date ?? null,
            scopes: GOOGLE_OAUTH_SCOPES,
            connectedAt: new Date().toISOString(),
          };

          saveTokens(userId, stored);
          finish(() => resolve(stored));
        }).catch((error) => {
          finish(() => reject(error instanceof Error ? error : new GoogleOAuthError('Token exchange failed.')));
        });
      });
    });

    const timeoutId = setTimeout(() => {
      finish(() => reject(new GoogleOAuthError('OAuth timed out. Try connecting again.')));
    }, LOOPBACK_TIMEOUT_MS);
  });
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const stored = loadTokens(userId);
  if (!stored) {
    return null;
  }

  const client = createOAuthClientForStoredTokens();
  if (!client) {
    return null;
  }
  client.setCredentials({
    refresh_token: stored.refreshToken,
    access_token: stored.accessToken,
    expiry_date: stored.expiryDateMs,
  });

  try {
    const { credentials } = await client.refreshAccessToken();
    const accessToken = credentials.access_token;
    if (!accessToken) {
      return null;
    }

    saveTokens(userId, {
      ...stored,
      accessToken,
      expiryDateMs: credentials.expiry_date ?? stored.expiryDateMs,
    });

    return accessToken;
  } catch (error) {
    throw classifyGoogleTokenRefreshError(error);
  }
}

export async function revokeAndDeleteTokens(userId: string): Promise<void> {
  const stored = loadTokens(userId);
  if (stored?.accessToken) {
    try {
      const client = createOAuthClientForStoredTokens();
      if (client) {
        await client.revokeToken(stored.accessToken);
      }
    } catch {
      // Best effort revoke.
    }
  }

  deleteTokens(userId);
}

export function hasStoredTokens(userId: string): boolean {
  return loadTokens(userId) !== null;
}
