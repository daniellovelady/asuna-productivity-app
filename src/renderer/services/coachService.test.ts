import { describe, expect, it } from 'vitest';
import { CoachServiceError, resolveCoachAnalyzeResponse } from './coachService';
import type { CoachAnalyzeResponse } from '../types/coachApi';

const VERIFICATION_FAILED_MESSAGE =
  'Coach response could not be verified after one repair attempt.';

function verifiedResponse(): CoachAnalyzeResponse {
  return {
    requestId: 'req-live-1',
    verificationStatus: 'verified',
    toolsUsed: ['get_productivity_snapshot'],
    result: {
      answer: 'Based on your A.S.U.N.A. data, you focused for 1 hour and 41 minutes this week.',
      recommendations: [],
      evidence: [
        {
          source: 'analytics',
          path: '/analytics/totalFocusMinutes',
          value: '101',
        },
      ],
      limitations: [],
    },
    error: null,
  };
}

describe('coachService', () => {
  it('does not include access tokens in error messages', () => {
    const error = new CoachServiceError('You must be signed in to use the coach.', 'unauthorized');
    expect(error.message).not.toContain('Bearer');
    expect(error.message).not.toContain('eyJ');
  });
});

describe('resolveCoachAnalyzeResponse', () => {
  it('resolves verified responses with populated result', () => {
    const response = resolveCoachAnalyzeResponse(verifiedResponse());
    expect(response.verificationStatus).toBe('verified');
    expect(response.result).not.toBeNull();
    expect(response.error).toBeNull();
  });

  it('throws verification_failed for repair_exhausted bodies with error populated', () => {
    expect(() => resolveCoachAnalyzeResponse({
      requestId: 'req-live-3',
      verificationStatus: 'repair_exhausted',
      toolsUsed: ['get_productivity_snapshot'],
      result: null,
      error: {
        code: 'verification_failed',
        message: VERIFICATION_FAILED_MESSAGE,
      },
    })).toThrow(CoachServiceError);

    try {
      resolveCoachAnalyzeResponse({
        requestId: 'req-live-3',
        verificationStatus: 'repair_exhausted',
        toolsUsed: ['get_productivity_snapshot'],
        result: null,
        error: {
          code: 'verification_failed',
          message: VERIFICATION_FAILED_MESSAGE,
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CoachServiceError);
      expect((error as CoachServiceError).code).toBe('verification_failed');
      expect((error as CoachServiceError).message).toBe(VERIFICATION_FAILED_MESSAGE);
    }
  });

  it('rejects verified status without result', () => {
    expect(() => resolveCoachAnalyzeResponse({
      ...verifiedResponse(),
      result: null,
    })).toThrow(CoachServiceError);
  });
});
