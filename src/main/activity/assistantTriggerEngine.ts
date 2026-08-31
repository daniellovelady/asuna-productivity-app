import {
  BREAK_DISTRACTING_MS,
  BREAK_FOCUS_SESSION_MS,
  BREAK_MESSAGE_COOLDOWN_MS,
  BREAK_PRODUCTIVE_MS,
  DISTRACTION_THRESHOLD_LIGHT_MS,
  DISTRACTION_THRESHOLD_STRONG_MS,
  DISTRACTION_THRESHOLD_WARNING_MS,
  OBSERVATION_INTERVAL_MS,
  PRODUCTIVE_ENCOURAGEMENT_MS,
} from '../../shared/activity/constants';
import { getActivityDisplayLabel } from '../../shared/activity/displayLabels';
import type { ActivityClassification } from '../../shared/activity/types';
import type { AssistantMessageQueue } from './assistantMessageQueue';

export interface TriggerContext {
  trackingRunning: boolean;
  isIdle: boolean;
  systemSuspended: boolean;
  identity: string;
  classification: ActivityClassification;
  activeTaskCount: number;
  focusSessionActive: boolean;
  focusSessionElapsedMs: number;
}

export class AssistantTriggerEngine {
  private productiveStreakMs = 0;

  private distractionStreakMs = 0;

  private encouragementFired = false;

  private distractionFired = new Set<number>();

  private taskReminderFired = false;

  private breakFocusFired = false;

  private breakProductiveFired = false;

  private breakDistractingFired = false;

  private lastBreakMessageAt: number | null = null;

  constructor(
    private readonly queue: AssistantMessageQueue,
    private readonly now: () => number = Date.now,
  ) {}

  resetStreaks(): void {
    this.productiveStreakMs = 0;
    this.distractionStreakMs = 0;
    this.encouragementFired = false;
    this.distractionFired.clear();
    this.taskReminderFired = false;
    this.breakFocusFired = false;
    this.breakProductiveFired = false;
    this.breakDistractingFired = false;
    this.queue.resetDedupKeys();
  }

  handleObservation(context: TriggerContext): void {
    if (!context.trackingRunning || context.isIdle || context.systemSuspended) {
      this.resetStreaks();
      return;
    }

    if (context.classification === 'productive') {
      this.distractionStreakMs = 0;
      this.distractionFired.clear();
      this.taskReminderFired = false;
      this.breakDistractingFired = false;
      this.productiveStreakMs += OBSERVATION_INTERVAL_MS;
      this.evaluateProductive(context);
      return;
    }

    if (context.classification === 'distracting') {
      this.productiveStreakMs = 0;
      this.encouragementFired = false;
      this.breakProductiveFired = false;
      this.distractionStreakMs += OBSERVATION_INTERVAL_MS;
      this.evaluateDistracting(context);
      return;
    }

    this.resetStreaks();
  }

  enqueueCelebration(): void {
    this.queue.enqueue({
      type: 'celebration',
      text: 'Focus session complete!',
      priority: 100,
      dedupKey: `celebration:${this.now()}`,
    });
  }

  private evaluateProductive(context: TriggerContext): void {
    if (!this.encouragementFired && this.productiveStreakMs >= PRODUCTIVE_ENCOURAGEMENT_MS) {
      this.encouragementFired = true;
      this.queue.enqueue({
        type: 'encouragement',
        text: "Nice work — you've been staying productive.",
        priority: 10,
        dedupKey: `encouragement:${this.productiveStreakMs}`,
      });
    }

    if (!this.breakProductiveFired && this.productiveStreakMs >= BREAK_PRODUCTIVE_MS) {
      this.breakProductiveFired = true;
      this.enqueueBreak(
        "You've been at this for a while. It might be a good time to step away for a few minutes.",
        'break-productive',
      );
    }

    if (
      context.focusSessionActive
      && !this.breakFocusFired
      && context.focusSessionElapsedMs >= BREAK_FOCUS_SESSION_MS
    ) {
      this.breakFocusFired = true;
      this.enqueueBreak(
        "You've been focused for a while. A short break might help.",
        'break-focus',
      );
    }
  }

  private evaluateDistracting(context: TriggerContext): void {
    const label = getActivityDisplayLabel(context.identity);
    const thresholds = [
      { ms: DISTRACTION_THRESHOLD_LIGHT_MS, level: 15, text: `You've been on ${label} for a while.` },
      { ms: DISTRACTION_THRESHOLD_WARNING_MS, level: 30, text: `You've been on ${label} for a while.` },
      {
        ms: DISTRACTION_THRESHOLD_STRONG_MS,
        level: 60,
        text: `You've been playing ${label} for a while.`,
      },
    ];

    for (const threshold of thresholds) {
      if (
        this.distractionStreakMs >= threshold.ms
        && !this.distractionFired.has(threshold.level)
      ) {
        this.distractionFired.add(threshold.level);
        this.queue.enqueue({
          type: 'warning',
          text: threshold.text,
          priority: 20 + threshold.level,
          dedupKey: `distraction:${threshold.level}:${context.identity}`,
        });
      }
    }

    if (
      !this.taskReminderFired
      && context.activeTaskCount > 0
      && this.distractionStreakMs >= DISTRACTION_THRESHOLD_LIGHT_MS
    ) {
      this.taskReminderFired = true;
      this.queue.enqueue({
        type: 'warning',
        text: `You've been on ${label} for a while. You still have ${context.activeTaskCount} active tasks if you want to switch gears.`,
        priority: 25,
        dedupKey: `task-reminder:${context.identity}`,
      });
    }

    if (!this.breakDistractingFired && this.distractionStreakMs >= BREAK_DISTRACTING_MS) {
      this.breakDistractingFired = true;
      this.enqueueBreak(
        "It might be a good time to step away for a few minutes.",
        'break-distracting',
      );
    }
  }

  private enqueueBreak(text: string, dedupKey: string): void {
    const now = this.now();

    if (
      this.lastBreakMessageAt !== null
      && now - this.lastBreakMessageAt < BREAK_MESSAGE_COOLDOWN_MS
    ) {
      return;
    }

    const enqueued = this.queue.enqueue({
      type: 'break',
      text,
      priority: 15,
      dedupKey,
    });

    if (enqueued) {
      this.lastBreakMessageAt = now;
    }
  }
}
