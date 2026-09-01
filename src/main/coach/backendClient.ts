import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  CoachError,
  CoachErrorCode,
  VerifiedCoachResult,
} from '../../renderer/types/coachApi';

export class CoachClientError extends Error {
  constructor(
    message: string,
    public readonly code: CoachErrorCode = 'invalid_request',
  ) {
    super(message);
    this.name = 'CoachClientError';
  }
}

export type RawCoachBackendPayload = {
  request_id?: string;
  requestId?: string;
  verification_status?: 'verified' | 'failed' | 'repair_exhausted';
  verificationStatus?: 'verified' | 'failed' | 'repair_exhausted';
  tools_used?: string[];
  toolsUsed?: string[];
  result?: VerifiedCoachResult | null;
  error?: CoachError | null;
  code?: CoachErrorCode;
  message?: string;
};

function isCoachDiagnosticsEnabled(): boolean {
  return process.env.COACH_DIAGNOSTICS === '1';
}

function logCoachBackendDiagnostics(
  status: number,
  payload: RawCoachBackendPayload | null,
): void {
  if (!isCoachDiagnosticsEnabled()) {
    return;
  }

  const keys = payload ? Object.keys(payload) : [];
  const verificationStatus = payload?.verificationStatus ?? payload?.verification_status ?? null;
  const hasResult = payload?.result != null;
  const topLevelErrorCode = payload?.code ?? null;
  const nestedErrorCode = payload?.error?.code ?? null;

  console.info(
    'coach backend response',
    {
      status,
      keys,
      verification_status: verificationStatus,
      has_result: hasResult,
      error_code: topLevelErrorCode ?? nestedErrorCode,
    },
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function validateCoachBackendUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new CoachClientError('Coach backend URL is invalid.', 'configuration_error');
  }

  if (!parsed.hostname) {
    throw new CoachClientError('Coach backend URL is invalid.', 'configuration_error');
  }

  if (!isLoopbackHost(parsed.hostname) && parsed.protocol !== 'https:') {
    throw new CoachClientError(
      'Coach backend must use HTTPS for non-loopback hosts.',
      'configuration_error',
    );
  }

  if (isLoopbackHost(parsed.hostname) && parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CoachClientError('Coach backend URL must use HTTP or HTTPS.', 'configuration_error');
  }

  return parsed;
}

function mapVerifiedResult(result: VerifiedCoachResult): VerifiedCoachResult {
  return {
    answer: result.answer,
    recommendations: result.recommendations,
    evidence: result.evidence,
    limitations: result.limitations,
  };
}

export function parseCoachBackendPayload(
  payload: RawCoachBackendPayload | null,
): CoachAnalyzeResponse {
  if (!payload) {
    throw new CoachClientError('Coach backend returned an invalid response.', 'invalid_request');
  }

  const requestId = payload.requestId ?? payload.request_id;
  const verificationStatus = payload.verificationStatus ?? payload.verification_status;
  const toolsUsed = payload.toolsUsed ?? payload.tools_used;

  if (
    typeof requestId !== 'string'
    || typeof verificationStatus !== 'string'
    || !Array.isArray(toolsUsed)
  ) {
    throw new CoachClientError('Coach backend returned an invalid response.', 'invalid_request');
  }

  return {
    requestId,
    verificationStatus,
    toolsUsed,
    result: payload.result ? mapVerifiedResult(payload.result) : null,
    error: payload.error ?? null,
  };
}

function extractBackendError(body: RawCoachBackendPayload | null): {
  code: CoachErrorCode;
  message: string;
} {
  const code = body?.error?.code ?? body?.code ?? 'invalid_request';
  const message = body?.error?.message ?? body?.message ?? 'Coach request failed.';
  return { code, message };
}

export function mapBackendError(
  status: number,
  body: RawCoachBackendPayload | null,
): CoachClientError {
  const { code, message } = extractBackendError(body);

  if (status === 401) {
    return new CoachClientError('You must be signed in to use the coach.', 'unauthorized');
  }
  if (status === 503) {
    return new CoachClientError(
      code === 'configuration_error' ? "Coach isn't configured yet." : message,
      code,
    );
  }
  if (status === 504) {
    return new CoachClientError('Coach request timed out.', 'timeout');
  }
  if (status === 429) {
    return new CoachClientError('Coach is rate limited. Try again later.', 'rate_limited');
  }
  if (status === 502) {
    return new CoachClientError('The AI service is temporarily unavailable.', 'openai_unavailable');
  }
  if (status === 422 && code === 'verification_failed') {
    return new CoachClientError(message, 'verification_failed');
  }
  return new CoachClientError(message, code);
}

export async function analyzeCoach(
  backendUrl: string,
  timeoutMs: number,
  request: CoachAnalyzeRequest,
): Promise<CoachAnalyzeResponse> {
  const parsedUrl = validateCoachBackendUrl(backendUrl);
  const endpoint = new URL('/v1/coach/analyze', parsedUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: request.question,
        conversation_id: request.conversationId ?? null,
      }),
      signal: controller.signal,
    });

    let payload: RawCoachBackendPayload | null = null;
    try {
      payload = await response.json() as RawCoachBackendPayload;
    } catch {
      payload = null;
    }

    logCoachBackendDiagnostics(response.status, payload);

    if (!response.ok) {
      throw mapBackendError(response.status, payload);
    }

    return parseCoachBackendPayload(payload);
  } catch (error) {
    if (error instanceof CoachClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CoachClientError('Coach request timed out.', 'timeout');
    }
    throw new CoachClientError('Coach backend is unavailable.', 'invalid_request');
  } finally {
    clearTimeout(timeout);
  }
}
