export const GOOGLE_CALENDAR_REAUTH_USER_MESSAGE =
  'Google Calendar connection expired. Reconnect Google Calendar to continue syncing.';

export type GoogleTokenRefreshFailureCode = 'invalid_grant' | 'transient';

export class GoogleTokenRefreshError extends Error {
  readonly code: GoogleTokenRefreshFailureCode;

  constructor(code: GoogleTokenRefreshFailureCode, message: string) {
    super(message);
    this.name = 'GoogleTokenRefreshError';
    this.code = code;
  }
}

function readGoogleErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const record = error as Record<string, unknown>;
  const response = record.response;
  if (typeof response === 'object' && response !== null) {
    const data = (response as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const code = (data as { error?: unknown }).error;
      if (typeof code === 'string') {
        return code;
      }
    }
  }

  return null;
}

export function classifyGoogleTokenRefreshError(error: unknown): GoogleTokenRefreshError {
  const googleCode = readGoogleErrorCode(error);
  const message = error instanceof Error ? error.message : 'Token refresh failed.';
  const combined = `${googleCode ?? ''} ${message}`.toLowerCase();

  if (googleCode === 'invalid_grant' || combined.includes('invalid_grant')) {
    return new GoogleTokenRefreshError('invalid_grant', message);
  }

  return new GoogleTokenRefreshError('transient', message);
}