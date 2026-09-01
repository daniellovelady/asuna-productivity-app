import { IDLE_THRESHOLD_SECONDS } from '../activity/constants';

export type ActivityClassification = 'productive' | 'neutral' | 'distracting';

export interface ActivitySampleInput {
  id: string;
  recordedAt: string;
  applicationName: string;
  classification: ActivityClassification;
  idleSeconds: number;
}

export interface DistractingAppDuration {
  applicationName: string;
  estimatedSeconds: number;
}

const INTERVAL_CAP_SECONDS = 60;

export function computeSampleIntervalSeconds(
  current: ActivitySampleInput,
  next: ActivitySampleInput | undefined,
): number {
  if (current.classification !== 'distracting') {
    return 0;
  }

  if (current.idleSeconds >= IDLE_THRESHOLD_SECONDS) {
    return 0;
  }

  if (!next) {
    return 0;
  }

  const rawSeconds = (new Date(next.recordedAt).getTime()
    - new Date(current.recordedAt).getTime()) / 1000;

  if (rawSeconds <= 0) {
    return 0;
  }

  return Math.min(INTERVAL_CAP_SECONDS, rawSeconds);
}

export function computeDistractingAppDurations(
  samples: ActivitySampleInput[],
): DistractingAppDuration[] {
  const sorted = [...samples].sort((left, right) => {
    const byTime = left.recordedAt.localeCompare(right.recordedAt);

    if (byTime !== 0) {
      return byTime;
    }

    return left.id.localeCompare(right.id);
  });

  const totals = new Map<string, number>();

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const creditedSeconds = computeSampleIntervalSeconds(current, next);

    if (creditedSeconds <= 0) {
      continue;
    }

    totals.set(
      current.applicationName,
      (totals.get(current.applicationName) ?? 0) + creditedSeconds,
    );
  }

  return [...totals.entries()]
    .map(([applicationName, estimatedSeconds]) => ({
      applicationName,
      estimatedSeconds,
    }))
    .filter((entry) => entry.estimatedSeconds > 0)
    .sort((left, right) => {
      if (right.estimatedSeconds !== left.estimatedSeconds) {
        return right.estimatedSeconds - left.estimatedSeconds;
      }

      return left.applicationName.localeCompare(right.applicationName);
    });
}

export function toEstimatedMinutes(estimatedSeconds: number): number {
  return estimatedSeconds / 60;
}
