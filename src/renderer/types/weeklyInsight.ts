import type { ResolvedEvidence } from './coachApi';

export type DataConfidence = 'low' | 'medium' | 'high';

export interface ReportPeriod {
  start: string;
  end: string;
  timezone: string;
}

export interface ResolvedInsightItem {
  text: string;
  evidence: ResolvedEvidence[];
}

export interface WeeklyInsightReport {
  reportPeriod: ReportPeriod;
  summary: ResolvedInsightItem;
  strengths: ResolvedInsightItem[];
  observations: ResolvedInsightItem[];
  recommendations: ResolvedInsightItem[];
  dataConfidence: DataConfidence;
  limitations: string[];
  generatedAt: string;
}

export interface WeeklyInsightReportResponse {
  requestId: string;
  verificationStatus: 'verified' | 'failed' | 'repair_exhausted';
  report: WeeklyInsightReport | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface VaryMessageRequest {
  accessToken: string;
  triggerKey: string;
  tone: 'gentle' | 'neutral' | 'direct';
  template: string;
}

export interface VaryMessageResponse {
  template: string;
}
