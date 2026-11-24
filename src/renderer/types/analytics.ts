export interface AnalyticsFocusByDay {
  date: string;
  focusMinutes: number;
}

export type AnalyticsFocusContextType = 'none' | 'task' | 'calendar_event';

export interface AnalyticsFocusByTask {
  contextType: AnalyticsFocusContextType;
  taskLabel: string;
  focusMinutes: number;
}

export interface AnalyticsDistractingApp {
  applicationName: string;
  estimatedMinutes: number;
}

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
  focusByDay: AnalyticsFocusByDay[];
  focusByTask: AnalyticsFocusByTask[];
  topDistractingApps: AnalyticsDistractingApp[];
}
