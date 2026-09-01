import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  AnalyticsDistractingApp,
  AnalyticsFocusByDay,
  AnalyticsFocusByTask,
  AnalyticsSnapshot,
} from '../types/analytics';

export class AnalyticsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new AnalyticsServiceError(`Analytics response is missing a valid ${field}.`);
  }

  return value;
}

function readNullableNumber(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }

  return readNumber(value, field);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AnalyticsServiceError(`Analytics response is missing a valid ${field}.`);
  }

  return value;
}

function mapFocusByDay(value: unknown): AnalyticsFocusByDay[] {
  if (!Array.isArray(value)) {
    throw new AnalyticsServiceError('Analytics response is missing focusByDay.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new AnalyticsServiceError(`Analytics focusByDay[${index}] is invalid.`);
    }

    return {
      date: readString(entry.date, `focusByDay[${index}].date`),
      focusMinutes: readNumber(entry.focusMinutes, `focusByDay[${index}].focusMinutes`),
    };
  });
}

function mapFocusByTask(value: unknown): AnalyticsFocusByTask[] {
  if (!Array.isArray(value)) {
    throw new AnalyticsServiceError('Analytics response is missing focusByTask.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new AnalyticsServiceError(`Analytics focusByTask[${index}] is invalid.`);
    }

    return {
      taskLabel: readString(entry.taskLabel, `focusByTask[${index}].taskLabel`),
      focusMinutes: readNumber(entry.focusMinutes, `focusByTask[${index}].focusMinutes`),
    };
  });
}

function mapTopDistractingApps(value: unknown): AnalyticsDistractingApp[] {
  if (!Array.isArray(value)) {
    throw new AnalyticsServiceError('Analytics response is missing topDistractingApps.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new AnalyticsServiceError(`Analytics topDistractingApps[${index}] is invalid.`);
    }

    return {
      applicationName: readString(
        entry.applicationName,
        `topDistractingApps[${index}].applicationName`,
      ),
      estimatedMinutes: readNumber(
        entry.estimatedMinutes,
        `topDistractingApps[${index}].estimatedMinutes`,
      ),
    };
  });
}

export function mapAnalyticsSnapshot(raw: unknown): AnalyticsSnapshot {
  if (!isRecord(raw)) {
    throw new AnalyticsServiceError('Analytics response was empty or invalid.');
  }

  if (!isRecord(raw.range)) {
    throw new AnalyticsServiceError('Analytics response is missing range.');
  }

  return {
    range: {
      start: readString(raw.range.start, 'range.start'),
      end: readString(raw.range.end, 'range.end'),
      timezone: readString(raw.range.timezone, 'range.timezone'),
    },
    focusTodayMinutes: readNumber(raw.focusTodayMinutes, 'focusTodayMinutes'),
    totalFocusMinutes: readNumber(raw.totalFocusMinutes, 'totalFocusMinutes'),
    completedSessions: readNumber(raw.completedSessions, 'completedSessions'),
    interruptionCount: readNumber(raw.interruptionCount, 'interruptionCount'),
    averageSessionMinutes: readNullableNumber(raw.averageSessionMinutes, 'averageSessionMinutes'),
    breakCompliancePercent: readNullableNumber(
      raw.breakCompliancePercent,
      'breakCompliancePercent',
    ),
    focusByDay: mapFocusByDay(raw.focusByDay),
    focusByTask: mapFocusByTask(raw.focusByTask),
    topDistractingApps: mapTopDistractingApps(raw.topDistractingApps),
  };
}

export function mapAnalyticsError(error: Error | null): string {
  if (!error) {
    return 'Failed to load analytics.';
  }

  return error.message;
}

async function getAuthenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new AnalyticsServiceError('You must be signed in to view analytics.');
  }

  return data.user.id;
}

export function createAnalyticsService(client: SupabaseClient) {
  return {
    fetchSnapshot: async (): Promise<AnalyticsSnapshot> => {
      await getAuthenticatedUserId(client);

      const { data, error } = await client.rpc('get_analytics_snapshot');

      if (error) {
        throw new AnalyticsServiceError(error.message);
      }

      return mapAnalyticsSnapshot(data);
    },
  };
}

export const analyticsService = createAnalyticsService(supabase);
