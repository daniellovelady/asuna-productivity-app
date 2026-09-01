import type {
  CoachAnalyzeRequest,
  CoachAnalyzeResponse,
  CoachError,
  CoachErrorCode,
} from '../types/coachApi';

export class CoachServiceError extends Error {
  constructor(
    message: string,
    public readonly code: CoachErrorCode = 'invalid_request',
  ) {
    super(message);
    this.name = 'CoachServiceError';
  }
}

const VERIFICATION_FAILED_MESSAGE =
  'Coach response could not be verified after one repair attempt.';

function isCoachDiagnosticsEnabled(): boolean {
  return import.meta.env.VITE_COACH_DIAGNOSTICS === '1';
}

function logCoachServiceDiagnostics(response: CoachAnalyzeResponse): void {
  if (!isCoachDiagnosticsEnabled()) {
    return;
  }

  console.info(
    'coach service response',
    {
      verification_status: response.verificationStatus,
      has_result: response.result != null,
      has_error: response.error != null,
    },
  );
}

function getCoachApi() {
  if (!window.coachApi) {
    throw new CoachServiceError('Coach bridge is unavailable in this environment.');
  }
  return window.coachApi;
}

function mapCoachError(error: CoachError): CoachServiceError {
  const friendlyMessage = error.code === 'configuration_error'
    ? "Coach isn't configured yet."
    : error.code === 'openai_unavailable'
      ? 'The AI service is temporarily unavailable.'
      : error.message;
  return new CoachServiceError(friendlyMessage, error.code);
}

function mapThrownClientError(error: unknown): CoachServiceError {
  if (error instanceof Error) {
    if (error.message.includes("Coach isn't configured yet.")) {
      return new CoachServiceError("Coach isn't configured yet.", 'configuration_error');
    }
    if (error.message.includes('The AI service is temporarily unavailable.')) {
      return new CoachServiceError(
        'The AI service is temporarily unavailable.',
        'openai_unavailable',
      );
    }
    if (error.message.includes('Coach backend is unavailable.')) {
      return new CoachServiceError('Coach backend is unavailable.', 'invalid_request');
    }
    if (error.message.includes(VERIFICATION_FAILED_MESSAGE)) {
      return new CoachServiceError(VERIFICATION_FAILED_MESSAGE, 'verification_failed');
    }
  }
  return new CoachServiceError('Coach request failed.');
}

export function resolveCoachAnalyzeResponse(
  response: CoachAnalyzeResponse,
): CoachAnalyzeResponse {
  if (response.verificationStatus === 'verified' && response.result != null) {
    return response;
  }

  if (response.error) {
    throw mapCoachError(response.error);
  }

  if (
    response.verificationStatus === 'repair_exhausted'
    || response.verificationStatus === 'failed'
  ) {
    throw new CoachServiceError(VERIFICATION_FAILED_MESSAGE, 'verification_failed');
  }

  throw new CoachServiceError('Coach backend returned an invalid response.', 'invalid_request');
}

export const coachService = {
  analyze: async (
    accessToken: string,
    question: string,
    conversationId?: string,
  ): Promise<CoachAnalyzeResponse> => {
    const request: CoachAnalyzeRequest = {
      accessToken,
      question,
      conversationId,
    };
    try {
      const response = await getCoachApi().analyze(request);
      logCoachServiceDiagnostics(response);
      return resolveCoachAnalyzeResponse(response);
    } catch (error) {
      if (error instanceof CoachServiceError) {
        throw error;
      }
      throw mapThrownClientError(error);
    }
  },
};
