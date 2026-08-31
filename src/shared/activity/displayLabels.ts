import type { ActivityIdentity } from './types';

const LABELS: Record<string, string> = {
  youtube: 'YouTube',
  league_of_legends: 'League',
  netflix: 'Netflix',
  spotify: 'Spotify',
  vscode: 'VS Code',
  visual_studio: 'Visual Studio',
  terminal: 'Terminal',
  powershell: 'PowerShell',
  github: 'GitHub',
  stackoverflow: 'Stack Overflow',
  google_calendar: 'Google Calendar',
  discord: 'Discord',
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  file_explorer: 'File Explorer',
};

export function getActivityDisplayLabel(identity: ActivityIdentity): string {
  return LABELS[identity] ?? 'this app';
}
