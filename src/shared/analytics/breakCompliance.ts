export interface FocusSessionForBreak {
  id: string;
  status: 'completed' | 'abandoned' | 'running' | 'paused';
  startedAt: string;
  endedAt: string | null;
}

const MAX_BREAK_GAP_MS = 120 * 60 * 1000;

export function findChronologicalNextSession(
  sessions: FocusSessionForBreak[],
  prevEndedAt: string,
): FocusSessionForBreak | null {
  const prevEndedMs = new Date(prevEndedAt).getTime();
  let nextSession: FocusSessionForBreak | null = null;
  let nextStartedMs = Number.POSITIVE_INFINITY;

  for (const session of sessions) {
    const startedMs = new Date(session.startedAt).getTime();

    if (startedMs > prevEndedMs && startedMs < nextStartedMs) {
      nextSession = session;
      nextStartedMs = startedMs;
    }
  }

  return nextSession;
}

export interface BreakComplianceResult {
  compliantCount: number;
  eligibleCount: number;
  percent: number | null;
}

export function computeBreakCompliance(
  sessions: FocusSessionForBreak[],
  windowStartUtc: string,
  windowEndUtc: string,
  breakMinutes: number,
): BreakComplianceResult {
  const windowStartMs = new Date(windowStartUtc).getTime();
  const windowEndMs = new Date(windowEndUtc).getTime();
  const requiredGapMs = breakMinutes * 60 * 1000;
  let compliantCount = 0;
  let eligibleCount = 0;

  for (const previous of sessions) {
    if (previous.status !== 'completed' || previous.endedAt === null) {
      continue;
    }

    const endedMs = new Date(previous.endedAt).getTime();

    if (endedMs < windowStartMs || endedMs >= windowEndMs) {
      continue;
    }

    const next = findChronologicalNextSession(sessions, previous.endedAt);

    if (!next) {
      continue;
    }

    const gapMs = new Date(next.startedAt).getTime() - endedMs;

    if (gapMs > MAX_BREAK_GAP_MS) {
      continue;
    }

    eligibleCount += 1;

    if (gapMs >= requiredGapMs) {
      compliantCount += 1;
    }
  }

  return {
    compliantCount,
    eligibleCount,
    percent: eligibleCount > 0
      ? Math.round((1000 * compliantCount) / eligibleCount) / 10
      : null,
  };
}
