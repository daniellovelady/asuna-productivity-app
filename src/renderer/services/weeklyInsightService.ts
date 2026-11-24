import type { WeeklyInsightReportResponse } from '../types/weeklyInsight';
import { CoachServiceError } from './coachService';

function getCoachApi() {
  if (!window.coachApi?.weeklyReport) {
    throw new CoachServiceError('Coach bridge is unavailable in this environment.');
  }
  return window.coachApi;
}

export function resolveWeeklyReportResponse(
  response: WeeklyInsightReportResponse,
): WeeklyInsightReportResponse {
  if (response.verificationStatus === 'verified' && response.report !== null) {
    return response;
  }

  if (response.error) {
    throw new CoachServiceError(response.error.message, response.error.code as never);
  }

  throw new CoachServiceError('Weekly report could not be verified.', 'verification_failed');
}

export const weeklyInsightService = {
  generate: async (accessToken: string): Promise<WeeklyInsightReportResponse> => {
    const response = await getCoachApi().weeklyReport({ accessToken });
    return resolveWeeklyReportResponse(response);
  },
};
