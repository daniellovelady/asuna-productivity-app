import { logCalendarMemoryCounters } from './calendarMemoryDiag';

export type MemoryReproScenarioId =
  | 'dashboard-baseline'
  | 'calendar-month-idle'
  | 'calendar-nav-month-stress'
  | 'calendar-nav-week-stress'
  | 'calendar-nav-year-stress'
  | 'calendar-source-toggle-stress';

declare global {
  interface Window {
    __ASUNA_MEMORY_REPRO__?: {
      beginScenario: (id: MemoryReproScenarioId) => void;
      logCheckpoint: (label: string) => void;
      scenarios: MemoryReproScenarioId[];
    };
  }
}

const SCENARIOS: MemoryReproScenarioId[] = [
  'dashboard-baseline',
  'calendar-month-idle',
  'calendar-nav-month-stress',
  'calendar-nav-week-stress',
  'calendar-nav-year-stress',
  'calendar-source-toggle-stress',
];

export function installCalendarMemoryReproHarness(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  window.__ASUNA_MEMORY_REPRO__ = {
    scenarios: SCENARIOS,
    beginScenario: (id) => {
      logCalendarMemoryCounters({ reason: `repro-begin:${id}` });
      window.diagnosticsApi?.requestMemorySnapshot?.(`repro-begin:${id}`);
    },
    logCheckpoint: (label) => {
      logCalendarMemoryCounters({ reason: `repro-checkpoint:${label}` });
      window.diagnosticsApi?.requestMemorySnapshot?.(`repro-checkpoint:${label}`);
    },
  };
}