export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

export const GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE =
  'Google Calendar is not configured (missing GOOGLE_OAUTH_CLIENT_ID).';

export const GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE =
  'Google Calendar OAuth client secret is not configured.';

export function getGoogleOAuthClientId(): string | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!id || !id.trim()) {
    return null;
  }
  return id.trim();
}

export function getGoogleOAuthClientSecret(): string | null {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!secret || !secret.trim()) {
    return null;
  }
  return secret.trim();
}

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export function requireGoogleOAuthCredentials(): GoogleOAuthCredentials {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    throw new Error(GOOGLE_OAUTH_MISSING_CLIENT_ID_MESSAGE);
  }

  const clientSecret = getGoogleOAuthClientSecret();
  if (!clientSecret) {
    throw new Error(GOOGLE_OAUTH_MISSING_CLIENT_SECRET_MESSAGE);
  }

  return { clientId, clientSecret };
}

/** Safe for IPC/logging — never includes credential values. */
export function getGoogleOAuthConfigDiagnostic(): {
  hasClientId: boolean;
  hasClientSecret: boolean;
  ready: boolean;
  issues: string[];
} {
  const hasClientId = getGoogleOAuthClientId() !== null;
  const hasClientSecret = getGoogleOAuthClientSecret() !== null;
  const issues: string[] = [];
  if (!hasClientId) {
    issues.push('missing_client_id');
  }
  if (!hasClientSecret) {
    issues.push('missing_client_secret');
  }
  return {
    hasClientId,
    hasClientSecret,
    ready: hasClientId && hasClientSecret,
    issues,
  };
}
