import { computeBreakCompliance } from './breakCompliance';
import {
  computeDistractingAppDurations,
  toEstimatedMinutes,
  type ActivitySampleInput,
} from './distractingDuration';
import { actualFocusMinutes, resolveTaskLabel } from './focusDuration';
import {
  addLocalDays,
  computeAnalyticsWindow,
  formatLocalDate,
  resolveEffectiveTimezone,
} from './timezone';
import type { FixtureFocusSession } from './fixture';

export interface AnalyticsSnapshot {
  range: {
    start: string;
    end: string;
    timezone: string;
  };
  focusTodayMinutes: number;
  totalFocusMinutes: number;
  completedSessions: number;
  interruptionCount: number;
  averageSessionMinutes: number | null;
  breakCompliancePercent: number | null;
  focusByDay: Array<{ date: string; focusMinutes: number }>;
  focusByTask: Array<{ taskLabel: string; focusMinutes: number }>;
  topDistractingApps: Array<{ applicationName: string; estimatedMinutes: number }>;
}

export interface ComputeSnapshotInput {
  asOfLocalDate: string;
  storedTimezone: string | null | undefined;
  validTimezoneNames: ReadonlySet<string>;
  breakMinutes: number;
  focusSessions: FixtureFocusSession[];
  activitySamples: ActivitySampleInput[];
}

function isEndedSession(session: FixtureFocusSession): boolean {
  return session.endedAt !== null
    && (session.status === 'completed' || session.status === 'abandoned');
}

export function computeAnalyticsSnapshot(input: ComputeSnapshotInput): AnalyticsSnapshot {
  const timezone = resolveEffectiveTimezone(input.storedTimezone, input.validTimezoneNames);
  const window = computeAnalyticsWindow(input.asOfLocalDate, timezone);
  const windowStartMs = new Date(window.windowStartUtc).getTime();
  const windowEndMs = new Date(window.windowEndUtc).getTime();

  const endedInWindow = input.focusSessions.filter((session) => {
    if (!isEndedSession(session) || session.endedAt === null) {
      return false;
    }

    const endedMs = new Date(session.endedAt).getTime();
    return endedMs >= windowStartMs && endedMs < windowEndMs;
  });

  const focusByDayMap = new Map<string, number>();
  const focusByTaskMap = new Map<string, number>();
  let totalFocusMinutes = 0;
  let focusTodayMinutes = 0;
  let completedSessions = 0;
  let interruptionCount = 0;

  for (const session of endedInWindow) {
    if (session.endedAt === null) {
      continue;
    }

    const focusMinutes = actualFocusMinutes(
      session.startedAt,
      session.endedAt,
      session.pausedSeconds,
    );
    const localDate = formatLocalDate(session.endedAt, timezone);
    const taskLabel = resolveTaskLabel(session.taskTitleSnapshot);

    totalFocusMinutes += focusMinutes;
    focusByDayMap.set(localDate, (focusByDayMap.get(localDate) ?? 0) + focusMinutes);
    focusByTaskMap.set(taskLabel, (focusByTaskMap.get(taskLabel) ?? 0) + focusMinutes);
    interruptionCount += session.interruptionCount;

    if (session.status === 'completed') {
      completedSessions += 1;
    }

    if (localDate === input.asOfLocalDate) {
      focusTodayMinutes += focusMinutes;
    }
  }

  const focusByDay: AnalyticsSnapshot['focusByDay'] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addLocalDays(window.start, offset);
    focusByDay.push({
      date,
      focusMinutes: focusByDayMap.get(date) ?? 0,
    });
  }

  const focusByTask = [...focusByTaskMap.entries()]
    .map(([taskLabel, focusMinutes]) => ({ taskLabel, focusMinutes }))
    .sort((left, right) => {
      if (right.focusMinutes !== left.focusMinutes) {
        return right.focusMinutes - left.focusMinutes;
      }

      return left.taskLabel.localeCompare(right.taskLabel);
    });

  const endedCount = endedInWindow.length;
  const averageSessionMinutes = endedCount > 0 ? totalFocusMinutes / endedCount : null;
  const breakCompliance = computeBreakCompliance(
    input.focusSessions,
    window.windowStartUtc,
    window.windowEndUtc,
    input.breakMinutes,
  );

  const samplesInWindow = input.activitySamples.filter((sample) => {
    const recordedMs = new Date(sample.recordedAt).getTime();
    return recordedMs >= windowStartMs && recordedMs < windowEndMs;
  });

  const topDistractingApps = computeDistractingAppDurations(samplesInWindow).map((entry) => ({
    applicationName: entry.applicationName,
    estimatedMinutes: toEstimatedMinutes(entry.estimatedSeconds),
  }));

  return {
    range: {
      start: window.start,
      end: window.end,
      timezone,
    },
    focusTodayMinutes,
    totalFocusMinutes,
    completedSessions,
    interruptionCount,
    averageSessionMinutes,
    breakCompliancePercent: breakCompliance.percent,
    focusByDay,
    focusByTask,
    topDistractingApps,
  };
}

export function getBreakComplianceDetails(input: ComputeSnapshotInput): {
  compliantCount: number;
  eligibleCount: number;
} {
  const timezone = resolveEffectiveTimezone(input.storedTimezone, input.validTimezoneNames);
  const window = computeAnalyticsWindow(input.asOfLocalDate, timezone);
  const result = computeBreakCompliance(
    input.focusSessions,
    window.windowStartUtc,
    window.windowEndUtc,
    input.breakMinutes,
  );

  return {
    compliantCount: result.compliantCount,
    eligibleCount: result.eligibleCount,
  };
}
