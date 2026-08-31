import { describe, expect, it } from 'vitest';
import {
  DISTRACTION_THRESHOLD_LIGHT_MS,
  OBSERVATION_INTERVAL_MS,
  PRODUCTIVE_ENCOURAGEMENT_MS,
} from '../../shared/activity/constants';
import { AssistantMessageQueue } from './assistantMessageQueue';
import { AssistantTriggerEngine } from './assistantTriggerEngine';

describe('AssistantTriggerEngine', () => {
  it('fires encouragement after sustained productive activity', () => {
    const queue = new AssistantMessageQueue(() => 0);
    const engine = new AssistantTriggerEngine(queue, () => 0);
    const context = {
      trackingRunning: true,
      isIdle: false,
      systemSuspended: false,
      identity: 'vscode',
      classification: 'productive' as const,
      activeTaskCount: 0,
      focusSessionActive: false,
      focusSessionElapsedMs: 0,
    };

    for (let index = 0; index < PRODUCTIVE_ENCOURAGEMENT_MS / OBSERVATION_INTERVAL_MS; index += 1) {
      engine.handleObservation(context);
    }

    expect(queue.getState().current?.type).toBe('encouragement');
  });

  it('does not accumulate distraction streak while suspended', () => {
    const queue = new AssistantMessageQueue(() => 0);
    const engine = new AssistantTriggerEngine(queue, () => 0);
    const distracting = {
      trackingRunning: true,
      isIdle: false,
      systemSuspended: false,
      identity: 'youtube',
      classification: 'distracting' as const,
      activeTaskCount: 0,
      focusSessionActive: false,
      focusSessionElapsedMs: 0,
    };

    for (let index = 0; index < (DISTRACTION_THRESHOLD_LIGHT_MS / OBSERVATION_INTERVAL_MS) - 1; index += 1) {
      engine.handleObservation(distracting);
    }

    engine.resetStreaks();
    engine.handleObservation({ ...distracting, systemSuspended: true });

    for (let index = 0; index < (DISTRACTION_THRESHOLD_LIGHT_MS / OBSERVATION_INTERVAL_MS) - 1; index += 1) {
      engine.handleObservation({ ...distracting, systemSuspended: true });
    }

    expect(queue.getState().current).toBeNull();
  });
});

describe('system suspend streak behavior', () => {
  it('does not accumulate streak time while suspended', () => {
    const queue = new AssistantMessageQueue(() => 0);
    const engine = new AssistantTriggerEngine(queue, () => 0);

    engine.handleObservation({
      trackingRunning: true,
      isIdle: false,
      systemSuspended: true,
      identity: 'youtube',
      classification: 'distracting',
      activeTaskCount: 0,
      focusSessionActive: false,
      focusSessionElapsedMs: 0,
    });

    expect(queue.getState().current).toBeNull();
  });
});
