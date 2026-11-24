import { describe, expect, it } from 'vitest';
import { parseWeeklyReportPayload } from '../coach/backendClient';

describe('parseWeeklyReportPayload', () => {
  it('maps snake_case weekly report fields to camelCase', () => {
    const response = parseWeeklyReportPayload({
      request_id: 'req-1',
      verification_status: 'verified',
      report: {
        report_period: {
          start: '2026-08-25',
          end: '2026-08-31',
          timezone: 'UTC',
        },
        summary: {
          text: 'Summary text',
          evidence: [{ source: 'analytics', path: '/analytics/totalFocusMinutes', value: '120' }],
        },
        strengths: [],
        observations: [],
        recommendations: [],
        data_confidence: 'medium',
        limitations: ['Sparse data'],
        generated_at: '2026-09-01T12:00:00+00:00',
      },
      error: null,
    });

    expect(response.requestId).toBe('req-1');
    expect(response.report?.reportPeriod.start).toBe('2026-08-25');
    expect(response.report?.dataConfidence).toBe('medium');
    expect(response.report?.generatedAt).toBe('2026-09-01T12:00:00+00:00');
    expect(response.report?.summary.text).toBe('Summary text');
  });
});
