import { describe, expect, it } from 'vitest';
import { buildActionDescriptors } from './buildActionDescriptors';
import type { AsunaNotification } from './types';

function sampleNotification(overrides: Partial<AsunaNotification> = {}): AsunaNotification {
  return {
    id: 'n-1',
    type: 'focus_complete',
    title: 'Focus session complete',
    message: 'Done',
    baseTemplate: 'Done',
    triggerKey: 'celebration',
    facts: { minutes: 25, breakMinutes: 10, sessionId: 'session-1' },
    avatarState: 'celebrating',
    priority: 'high',
    priorityScore: 100,
    supportedActions: ['start_break', 'dismiss'],
    desktopEligible: true,
    createdAt: 0,
    shownAt: null,
    ttlMs: null,
    expiresAt: null,
    ownerUserId: 'user-a',
    presentation: null,
    variationGeneration: 0,
    legacyMessageType: 'celebration',
    ...overrides,
  };
}

describe('buildActionDescriptors', () => {
  it('builds Start Break label from snapshotted breakMinutes', () => {
    const descriptors = buildActionDescriptors(sampleNotification());
    expect(descriptors).toEqual([
      { type: 'start_break', label: 'Start 10m Break', variant: 'primary' },
      { type: 'dismiss', label: 'Dismiss', variant: 'secondary' },
    ]);
  });

  it('does not change label when breakMinutes in facts differ from current settings', () => {
    const descriptors = buildActionDescriptors(sampleNotification({
      facts: { minutes: 25, breakMinutes: 10, sessionId: 'session-1' },
    }));
    expect(descriptors[0]?.label).toBe('Start 10m Break');
  });

  it('builds break_complete actions', () => {
    const descriptors = buildActionDescriptors(sampleNotification({
      type: 'break_complete',
      supportedActions: ['start_focus', 'dismiss'],
      facts: {},
      triggerKey: 'break-complete',
      legacyMessageType: 'break',
    }));

    expect(descriptors).toEqual([
      { type: 'start_focus', label: 'Start Focus', variant: 'primary' },
      { type: 'dismiss', label: 'Dismiss', variant: 'secondary' },
    ]);
  });
});
