import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  CoachError,
  CoachErrorCode,
  ResolvedEvidence,
  VerifiedCoachResult,
} from '../../renderer/types/coachApi';
import type {
  DataConfidence,
  VaryMessageRequest,
  VaryMessageResponse,
  WeeklyInsightReport,
  WeeklyInsightReportResponse,
} from '../../renderer/types/weeklyInsight';

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

type RawWeeklyPayload = {
  request_id?: string;
  verification_status?: string;
  report?: RawWeeklyReport | null;
  error?: CoachError | null;
  code?: CoachErrorCode;
  message?: string;
};

type RawWeeklyReport = {
  report_period?: {
    start: string;
    end: string;
    timezone: string;
  };
  summary?: RawInsightItem;
  strengths?: RawInsightItem[];
  observations?: RawInsightItem[];
  recommendations?: RawInsightItem[];
  data_confidence?: DataConfidence;
  limitations?: string[];
  generated_at?: string;
};

type RawInsightItem = {
  text: string;
  evidence: ResolvedEvidence[];
};

function mapInsightItem(item: RawInsightItem) {
  return {
    text: item.text,
    evidence: item.evidence,
  };
}

export function parseWeeklyReportPayload(
  payload: RawWeeklyPayload | null,
): WeeklyInsightReportResponse {
  if (!payload || typeof payload.request_id !== 'string') {
    throw new CoachClientError('Coach backend returned an invalid response.', 'invalid_request');
  }

  const verificationStatus = payload.verification_status;
  if (
    verificationStatus !== 'verified'
    && verificationStatus !== 'failed'
    && verificationStatus !== 'repair_exhausted'
  ) {
    throw new CoachClientError('Coach backend returned an invalid response.', 'invalid_request');
  }

  let report: WeeklyInsightReport | null = null;
  if (payload.report && payload.report.report_period && payload.report.summary) {
    const raw = payload.report;
    report = {
      reportPeriod: {
        start: raw.report_period.start,
        end: raw.report_period.end,
        timezone: raw.report_period.timezone,
      },
      summary: mapInsightItem(raw.summary),
      strengths: (raw.strengths ?? []).map(mapInsightItem),
      observations: (raw.observations ?? []).map(mapInsightItem),
      recommendations: (raw.recommendations ?? []).map(mapInsightItem),
      dataConfidence: raw.data_confidence ?? 'low',
      limitations: raw.limitations ?? [],
      generatedAt: raw.generated_at ?? '',
    };
  }

  return {
    requestId: payload.request_id,
    verificationStatus,
    report,
    error: payload.error ?? null,
  };
}

export async function fetchWeeklyReport(
  backendUrl: string,
  timeoutMs: number,
  accessToken: string,
): Promise<WeeklyInsightReportResponse> {
  const parsedUrl = validateCoachBackendUrl(backendUrl);
  const endpoint = new URL('/v1/insights/weekly-report', parsedUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    let payload: RawWeeklyPayload | null = null;
    try {
      payload = await response.json() as RawWeeklyPayload;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw mapBackendError(response.status, payload);
    }

    return parseWeeklyReportPayload(payload);
  } catch (error) {
    if (error instanceof CoachClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CoachClientError('Weekly report request timed out.', 'timeout');
    }
    throw new CoachClientError('Coach backend is unavailable.', 'invalid_request');
  } finally {
    clearTimeout(timeout);
  }
}

export async function varyAssistantMessage(
  backendUrl: string,
  timeoutMs: number,
  request: VaryMessageRequest,
): Promise<VaryMessageResponse> {
  const parsedUrl = validateCoachBackendUrl(backendUrl);
  const endpoint = new URL('/v1/assistant/vary-message', parsedUrl);
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
        trigger_key: request.triggerKey,
        tone: request.tone,
        template: request.template,
      }),
      signal: controller.signal,
    });

    let payload: { template?: string; error?: CoachError; code?: CoachErrorCode; message?: string } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw mapBackendError(response.status, payload);
    }

    if (!payload || typeof payload.template !== 'string') {
      throw new CoachClientError('Coach backend returned an invalid response.', 'invalid_request');
    }

    return { template: payload.template };
  } catch (error) {
    if (error instanceof CoachClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CoachClientError('Message variation timed out.', 'timeout');
    }
    throw new CoachClientError('Coach backend is unavailable.', 'invalid_request');
  } finally {
    clearTimeout(timeout);
  }
}
