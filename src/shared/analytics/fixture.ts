import type { ActivityClassification } from './distractingDuration';
import type { FocusSessionForBreak } from './breakCompliance';

export const FIXTURE_TIMEZONE = 'America/Chicago';
export const FIXTURE_AS_OF_DATE = '2026-08-31';
export const FIXTURE_BREAK_MINUTES = 5;

export interface FixtureFocusSession extends FocusSessionForBreak {
  pausedSeconds: number;
  interruptionCount: number;
  taskTitleSnapshot: string | null;
}

export interface FixtureActivitySample {
  id: string;
  recordedAt: string;
  applicationName: string;
  classification: ActivityClassification;
  idleSeconds: number;
}

export const FIXTURE_FOCUS_SESSIONS: FixtureFocusSession[] = [
  {
    id: 'out',
    startedAt: '2026-08-24T19:00:00.000Z',
    endedAt: '2026-08-24T19:30:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Old',
  },
  {
    id: 's1',
    startedAt: '2026-08-25T19:00:00.000Z',
    endedAt: '2026-08-25T19:50:00.000Z',
    pausedSeconds: 600,
    interruptionCount: 1,
    status: 'completed',
    taskTitleSnapshot: 'Algorithms homework',
  },
  {
    id: 's2',
    startedAt: '2026-08-26T15:00:00.000Z',
    endedAt: '2026-08-26T15:25:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Algorithms homework',
  },
  {
    id: 's3',
    startedAt: '2026-08-27T14:00:00.000Z',
    endedAt: '2026-08-27T14:10:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 3,
    status: 'abandoned',
    taskTitleSnapshot: null,
  },
  {
    id: 's4a',
    startedAt: '2026-08-28T20:00:00.000Z',
    endedAt: '2026-08-28T20:30:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Capstone',
  },
  {
    id: 's4b',
    startedAt: '2026-08-28T20:40:00.000Z',
    endedAt: '2026-08-28T21:00:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Capstone',
  },
  {
    id: 's5a',
    startedAt: '2026-08-29T16:00:00.000Z',
    endedAt: '2026-08-29T16:20:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 2,
    status: 'completed',
    taskTitleSnapshot: 'Algorithms homework',
  },
  {
    id: 's5b',
    startedAt: '2026-08-29T16:23:00.000Z',
    endedAt: '2026-08-29T16:38:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Algorithms homework',
  },
  {
    id: 's_br_a',
    startedAt: '2026-08-30T16:00:00.000Z',
    endedAt: '2026-08-30T17:00:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Break drill',
  },
  {
    id: 's_br_b',
    startedAt: '2026-08-30T17:02:00.000Z',
    endedAt: '2026-08-30T17:42:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Break drill',
  },
  {
    id: 's_br_c',
    startedAt: '2026-08-30T17:05:00.000Z',
    endedAt: '2026-08-30T17:20:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Break drill',
  },
  {
    id: 's6',
    startedAt: '2026-08-31T13:00:00.000Z',
    endedAt: '2026-08-31T14:35:00.000Z',
    pausedSeconds: 300,
    interruptionCount: 1,
    status: 'completed',
    taskTitleSnapshot: 'Capstone',
  },
  {
    id: 's7',
    startedAt: '2026-08-31T15:00:00.000Z',
    endedAt: '2026-08-31T15:08:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'abandoned',
    taskTitleSnapshot: null,
  },
  {
    id: 's_edge',
    startedAt: '2026-08-31T04:30:00.000Z',
    endedAt: '2026-08-31T04:50:00.000Z',
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'completed',
    taskTitleSnapshot: 'Capstone',
  },
  {
    id: 's_after',
    startedAt: '2026-08-31T05:10:00.000Z',
    endedAt: null,
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'running',
    taskTitleSnapshot: 'Capstone',
  },
  {
    id: 'run',
    startedAt: '2026-08-31T16:00:00.000Z',
    endedAt: null,
    pausedSeconds: 0,
    interruptionCount: 0,
    status: 'running',
    taskTitleSnapshot: 'X',
  },
];

export const FIXTURE_ACTIVITY_SAMPLES: FixtureActivitySample[] = [
  {
    id: 'a1',
    recordedAt: '2026-08-28T22:00:00.000Z',
    applicationName: 'youtube',
    classification: 'distracting',
    idleSeconds: 180,
  },
  {
    id: 'a2',
    recordedAt: '2026-08-28T22:01:00.000Z',
    applicationName: 'youtube',
    classification: 'distracting',
    idleSeconds: 0,
  },
  {
    id: 'a3',
    recordedAt: '2026-08-28T22:02:00.000Z',
    applicationName: 'chrome',
    classification: 'neutral',
    idleSeconds: 0,
  },
  {
    id: 'a4',
    recordedAt: '2026-08-29T12:00:00.000Z',
    applicationName: 'youtube',
    classification: 'distracting',
    idleSeconds: 0,
  },
  {
    id: 'a5',
    recordedAt: '2026-08-29T12:00:30.000Z',
    applicationName: 'youtube',
    classification: 'distracting',
    idleSeconds: 0,
  },
  {
    id: 'a6',
    recordedAt: '2026-08-29T12:01:30.000Z',
    applicationName: 'chrome',
    classification: 'neutral',
    idleSeconds: 0,
  },
  {
    id: 'a7',
    recordedAt: '2026-08-30T18:00:00.000Z',
    applicationName: 'league_of_legends',
    classification: 'distracting',
    idleSeconds: 0,
  },
  {
    id: 'a8',
    recordedAt: '2026-08-30T18:00:45.000Z',
    applicationName: 'chrome',
    classification: 'neutral',
    idleSeconds: 0,
  },
  {
    id: 'a9',
    recordedAt: '2026-08-30T18:30:00.000Z',
    applicationName: 'twitch',
    classification: 'distracting',
    idleSeconds: 0,
  },
  {
    id: 'a10',
    recordedAt: '2026-08-30T18:32:30.000Z',
    applicationName: 'chrome',
    classification: 'neutral',
    idleSeconds: 0,
  },
  {
    id: 'a11',
    recordedAt: '2026-08-31T20:00:00.000Z',
    applicationName: 'x',
    classification: 'distracting',
    idleSeconds: 0,
  },
];

export const FIXTURE_EXPECTED = {
  totalFocusMinutes: 393,
  focusTodayMinutes: 98,
  focusByDay: [
    { date: '2026-08-25', focusMinutes: 40 },
    { date: '2026-08-26', focusMinutes: 25 },
    { date: '2026-08-27', focusMinutes: 10 },
    { date: '2026-08-28', focusMinutes: 50 },
    { date: '2026-08-29', focusMinutes: 35 },
    { date: '2026-08-30', focusMinutes: 135 },
    { date: '2026-08-31', focusMinutes: 98 },
  ],
  focusByTask: [
    { taskLabel: 'Capstone', focusMinutes: 160 },
    { taskLabel: 'Break drill', focusMinutes: 115 },
    { taskLabel: 'Algorithms homework', focusMinutes: 100 },
    { taskLabel: 'No task', focusMinutes: 18 },
  ],
  completedSessions: 11,
  interruptionCount: 7,
  averageSessionMinutes: 393 / 13,
  breakCompliance: {
    compliantCount: 3,
    eligibleCount: 5,
    percent: 60.0,
  },
  topDistractingApps: [
    { applicationName: 'youtube', estimatedMinutes: 2.5 },
    { applicationName: 'twitch', estimatedMinutes: 1.0 },
    { applicationName: 'league_of_legends', estimatedMinutes: 0.75 },
  ],
} as const;
