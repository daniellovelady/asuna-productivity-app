export type CoachErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'tool_failure'
  | 'openai_unavailable'
  | 'rate_limited'
  | 'timeout'
  | 'verification_failed'
  | 'configuration_error';

export interface CoachError {
  code: CoachErrorCode;
  message: string;
}

export interface ResolvedEvidence {
  source: 'analytics' | 'tasks';
  path: string;
  value: string;
}

export interface VerifiedCoachResult {
  answer: string;
  recommendations: string[];
  evidence: ResolvedEvidence[];
  limitations: string[];
}

export interface CoachAnalyzeRequest {
  accessToken: string;
  question: string;
  conversationId?: string;
}

export interface CoachAnalyzeResponse {
  requestId: string;
  verificationStatus: 'verified' | 'failed' | 'repair_exhausted';
  toolsUsed: string[];
  result: VerifiedCoachResult | null;
  error: CoachError | null;
}

export interface CoachApi {
  analyze: (request: CoachAnalyzeRequest) => Promise<CoachAnalyzeResponse>;
}

declare global {
  interface Window {
    coachApi: CoachApi;
  }
}

export {};
