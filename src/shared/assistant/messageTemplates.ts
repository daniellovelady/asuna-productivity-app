import type { ReminderTone } from '../preferences/types';

export type AssistantTriggerKey =
  | 'encouragement'
  | 'break-productive'
  | 'break-focus'
  | 'break-distracting'
  | 'distraction-15'
  | 'distraction-30'
  | 'distraction-60'
  | 'task-reminder'
  | 'celebration'
  | 'break-complete'
  | 'focus-start';

export type TemplateFacts = {
  app?: string;
  minutes?: number;
  taskCount?: number;
  breakMinutes?: number;
  sessionId?: string;
  contextPhrase?: string;
};

const TEMPLATES: Record<AssistantTriggerKey, Record<ReminderTone, string>> = {
  encouragement: {
    gentle: "You're doing well — keep it up.",
    neutral: "Nice work — you've been staying productive.",
    direct: 'Good focus. Stay on task.',
  },
  'break-productive': {
    gentle: "You've been at this for a while. A {breakMinutes}-minute break could help.",
    neutral: "You've been at this for a while. It might be a good time to step away for {breakMinutes} minutes.",
    direct: 'Take a {breakMinutes}-minute break. You have been working for a while.',
  },
  'break-focus': {
    gentle: "You've been focused for a while. A short {breakMinutes}-minute break might help.",
    neutral: "You've been focused for a while. A {breakMinutes}-minute break might help.",
    direct: 'Break time. Step away for {breakMinutes} minutes.',
  },
  'break-distracting': {
    gentle: 'It might be a good time to step away for {breakMinutes} minutes.',
    neutral: 'It might be a good time to step away for {breakMinutes} minutes.',
    direct: 'Take a {breakMinutes}-minute break now.',
  },
  'distraction-15': {
    gentle: "You've been on {app} for a bit.",
    neutral: "You've been on {app} for a while.",
    direct: '{app} has your attention. Refocus when ready.',
  },
  'distraction-30': {
    gentle: "You've been on {app} for a bit.",
    neutral: "You've been on {app} for a while.",
    direct: '{app} has your attention. Refocus when ready.',
  },
  'distraction-60': {
    gentle: "You've been on {app} for quite a while.",
    neutral: "You've been playing {app} for a while.",
    direct: 'You have been on {app} too long. Switch back when ready.',
  },
  'task-reminder': {
    gentle: 'You have {taskCount} active tasks waiting.',
    neutral: "You've been on {app} for a while. You still have {taskCount} active tasks if you want to switch gears.",
    direct: '{taskCount} tasks are still open.',
  },
  celebration: {
    gentle: 'Focus session complete — you focused for {minutes} minutes.',
    neutral: 'Focus session complete. You focused for {minutes} minutes.',
    direct: 'Session done. You focused for {minutes} minutes.',
  },
  'break-complete': {
    gentle: 'Your break is over. Ready to focus again?',
    neutral: 'Break complete. Ready to focus again?',
    direct: 'Break done. Start your next focus session.',
  },
  'focus-start': {
    gentle: 'Focus session started — {minutes} minutes{contextPhrase}.',
    neutral: 'Focus session started — {minutes} minutes{contextPhrase}.',
    direct: 'Focus session started — {minutes} minutes{contextPhrase}.',
  },
};

export function getMessageTemplate(
  triggerKey: AssistantTriggerKey,
  tone: ReminderTone,
): string {
  return TEMPLATES[triggerKey][tone];
}

export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{[a-zA-Z]+\}/g) ?? [];
  return [...new Set(matches)].sort();
}

export function interpolateTemplate(template: string, facts: TemplateFacts): string {
  let result = template;

  if (facts.app !== undefined) {
    result = result.replaceAll('{app}', facts.app);
  }
  if (facts.minutes !== undefined) {
    result = result.replaceAll('{minutes}', String(facts.minutes));
  }
  if (facts.taskCount !== undefined) {
    result = result.replaceAll('{taskCount}', String(facts.taskCount));
  }
  if (facts.breakMinutes !== undefined) {
    result = result.replaceAll('{breakMinutes}', String(facts.breakMinutes));
  }
  if (facts.contextPhrase !== undefined) {
    result = result.replaceAll('{contextPhrase}', facts.contextPhrase);
  }

  return result;
}
