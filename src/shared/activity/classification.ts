import type { ActivityClassification, ActivityIdentity } from './types';

const PRODUCTIVE_IDENTITIES = new Set<ActivityIdentity>([
  'vscode',
  'visual_studio',
  'terminal',
  'powershell',
  'github',
  'stackoverflow',
  'google_calendar',
]);

const DISTRACTING_IDENTITIES = new Set<ActivityIdentity>([
  'league_of_legends',
  'youtube',
  'netflix',
]);

export function classifyActivity(identity: ActivityIdentity): ActivityClassification {
  if (PRODUCTIVE_IDENTITIES.has(identity)) {
    return 'productive';
  }

  if (DISTRACTING_IDENTITIES.has(identity)) {
    return 'distracting';
  }

  return 'neutral';
}
