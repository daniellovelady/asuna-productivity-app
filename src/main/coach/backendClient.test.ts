import { describe, expect, it } from 'vitest';
import {
  CoachClientError,
  mapBackendError,
  parseCoachBackendPayload,
  validateCoachBackendUrl,
} from './backendClient';

describe('validateCoachBackendUrl', () => {
  it('allows loopback HTTP', () => {
    expect(validateCoachBackendUrl('http://127.0.0.1:8000').hostname).toBe('127.0.0.1');
    expect(validateCoachBackendUrl('http://localhost:8000').hostname).toBe('localhost');
  });

  it('requires HTTPS for non-loopback hosts', () => {
    expect(() => validateCoachBackendUrl('http://api.example.com')).toThrow(CoachClientError);
    expect(validateCoachBackendUrl('https://api.example.com').hostname).toBe('api.example.com');
  });

  it('rejects invalid URLs', () => {
    expect(() => validateCoachBackendUrl('not-a-url')).toThrow(CoachClientError);
  });
});

describe('mapBackendError', () => {
  it('preserves top-level configuration_error from FastAPI AppError responses', () => {
    const error = mapBackendError(503, {
      code: 'configuration_error',
      message: 'Coach AI service is not configured.',
    });
    expect(error.code).toBe('configuration_error');
    expect(error.message).toBe("Coach isn't configured yet.");
  });

  it('preserves openai_unavailable for 502 responses', () => {
    const error = mapBackendError(502, {
      code: 'openai_unavailable',
      message: 'The AI service is temporarily unavailable.',
    });
    expect(error.code).toBe('openai_unavailable');
    expect(error.message).toBe('The AI service is temporarily unavailable.');
  });

  it('preserves nested error codes when present', () => {
    const error = mapBackendError(503, {
      error: {
        code: 'tool_failure',
        message: 'Productivity analytics are temporarily unavailable.',
      },
    });
    expect(error.code).toBe('tool_failure');
  });

  it('maps 422 verification_failed responses', () => {
    const error = mapBackendError(422, {
      code: 'verification_failed',
      message: 'Coach response could not be verified after one repair attempt.',
    });
    expect(error.code).toBe('verification_failed');
    expect(error.message).toBe(
      'Coach response could not be verified after one repair attempt.',
    );
  });

  it('maps 422 verification_failed responses with nested coach error body', () => {
    const error = mapBackendError(422, {
      request_id: 'req-live-3',
      verification_status: 'repair_exhausted',
      tools_used: ['get_productivity_snapshot'],
      result: null,
      error: {
        code: 'verification_failed',
        message: 'Coach response could not be verified after one repair attempt.',
      },
    });
    expect(error.code).toBe('verification_failed');
    expect(error.message).toBe(
      'Coach response could not be verified after one repair attempt.',
    );
  });
});

describe('parseCoachBackendPayload', () => {
  const verifiedBackendBody = {
    request_id: 'req-live-1',
    verification_status: 'verified' as const,
    tools_used: ['get_productivity_snapshot'],
    result: {
      answer: 'Based on your A.S.U.N.A. data, you focused for 1 hour and 41 minutes this week.',
      recommendations: ['Take a short break.'],
      evidence: [
        {
          source: 'analytics' as const,
          path: '/analytics/totalFocusMinutes',
          value: '101',
        },
      ],
      limitations: [],
    },
    error: null,
  };

  it('maps the live FastAPI snake_case success body to camelCase', () => {
    const response = parseCoachBackendPayload(verifiedBackendBody);
    expect(response.requestId).toBe('req-live-1');
    expect(response.verificationStatus).toBe('verified');
    expect(response.toolsUsed).toEqual(['get_productivity_snapshot']);
    expect(response.result?.answer).toContain('1 hour and 41 minutes');
    expect(response.error).toBeNull();
  });

  it('accepts camelCase payloads at the same boundary', () => {
    const response = parseCoachBackendPayload({
      requestId: 'req-live-2',
      verificationStatus: 'verified',
      toolsUsed: ['get_productivity_snapshot'],
      result: verifiedBackendBody.result,
      error: null,
    });
    expect(response.requestId).toBe('req-live-2');
    expect(response.verificationStatus).toBe('verified');
    expect(response.result).not.toBeNull();
  });

  it('maps repair_exhausted bodies without throwing', () => {
    const response = parseCoachBackendPayload({
      request_id: 'req-live-3',
      verification_status: 'repair_exhausted',
      tools_used: ['get_productivity_snapshot'],
      result: null,
      error: {
        code: 'verification_failed',
        message: 'Coach response could not be verified after one repair attempt.',
      },
    });
    expect(response.verificationStatus).toBe('repair_exhausted');
    expect(response.result).toBeNull();
    expect(response.error?.code).toBe('verification_failed');
  });
});
