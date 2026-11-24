import {
  BREAK_DISTRACTING_MS,
  BREAK_FOCUS_SESSION_MS,
  BREAK_MESSAGE_COOLDOWN_MS,
  BREAK_PRODUCTIVE_MS,
  DISTRACTION_THRESHOLD_LIGHT_MS,
  DISTRACTION_THRESHOLD_STRONG_MS,
  DISTRACTION_THRESHOLD_WARNING_MS,
  OBSERVATION_INTERVAL_MS,
} from '../../shared/activity/constants';
import { getEncouragementThresholdMs } from '../../shared/assistant/encouragementConfig';
import type { AssistantTriggerKey, TemplateFacts } from '../../shared/assistant/messageTemplates';
import { getActivityDisplayLabel } from '../../shared/activity/displayLabels';
import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import type { ActivityClassification } from '../../shared/activity/types';
import type { CompletedFocusSession } from '../../shared/focus/types';
import type { NotificationEnqueueTarget } from '../notifications/notificationEnqueueTarget';

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
  private preferences: UserPreferences = { ...DEFAULT_USER_PREFERENCES };

  private productiveStreakMs = 0;

  private distractionStreakMs = 0;

  private distractionFired = new Set<number>();

  private taskReminderFired = false;

  private breakFocusFired = false;

  private breakProductiveFired = false;

  private breakDistractingFired = false;

  private lastBreakMessageAt: number | null = null;

  private focusEncouragementSessionId: string | null = null;

  private focusEncouragementMilestonesFired = 0;

  private encouragementAnchorElapsedMs = 0;

  private lastKnownFocusElapsedMs = 0;

  private distractionThresholdActive = false;

  private onDistractionThresholdCrossed: (() => void) | null = null;

  private onDistractionEpisodeEnded: (() => void) | null = null;

  constructor(
    private readonly notifications: NotificationEnqueueTarget,
    private readonly now: () => number = Date.now,
  ) {}

  setInterruptionCallbacks(callbacks: {
    onDistractionThresholdCrossed?: (() => void) | null;
    onDistractionEpisodeEnded?: (() => void) | null;
  }): void {
    this.onDistractionThresholdCrossed = callbacks.onDistractionThresholdCrossed ?? null;
    this.onDistractionEpisodeEnded = callbacks.onDistractionEpisodeEnded ?? null;
  }

  applyPreferences(preferences: UserPreferences): void {
    const encouragementChanged = preferences.encouragementLevel !== this.preferences.encouragementLevel;
    const quietModeEnabled = preferences.quietMode && !this.preferences.quietMode;

    this.preferences = { ...preferences };

    if (encouragementChanged) {
      this.resetEncouragementTimingAnchor();
    }

    if (quietModeEnabled) {
      this.notifications.clearProactive();
    }
  }

  resetStreaks(options?: { endDistractionEpisode?: boolean }): void {
    this.productiveStreakMs = 0;
    this.distractionStreakMs = 0;
    this.distractionFired.clear();
    this.taskReminderFired = false;
    this.breakFocusFired = false;
    this.breakProductiveFired = false;
    this.breakDistractingFired = false;
    this.notifications.resetDedupKeys();

    if (options?.endDistractionEpisode === false) {
      this.distractionThresholdActive = false;
      return;
    }

    this.endDistractionEpisodeIfActive();
  }

  private endDistractionEpisodeIfActive(): void {
    if (!this.distractionThresholdActive) {
      return;
    }

    this.distractionThresholdActive = false;
    this.onDistractionEpisodeEnded?.();
  }

  resetFocusEncouragement(): void {
    this.focusEncouragementSessionId = null;
    this.focusEncouragementMilestonesFired = 0;
    this.encouragementAnchorElapsedMs = 0;
    this.lastKnownFocusElapsedMs = 0;
  }

  resetEncouragementTimingAnchor(): void {
    this.encouragementAnchorElapsedMs = this.lastKnownFocusElapsedMs;
    this.focusEncouragementMilestonesFired = 0;
  }

  evaluateFocusEncouragement(sessionId: string, elapsedFocusMs: number): void {
    this.lastKnownFocusElapsedMs = elapsedFocusMs;

    if (sessionId !== this.focusEncouragementSessionId) {
      this.focusEncouragementSessionId = sessionId;
      this.focusEncouragementMilestonesFired = 0;
      this.encouragementAnchorElapsedMs = 0;
    }

    const threshold = getEncouragementThresholdMs(this.preferences.encouragementLevel);
    const effectiveElapsed = elapsedFocusMs - this.encouragementAnchorElapsedMs;
    const expectedMilestones = Math.floor(effectiveElapsed / threshold);

    while (this.focusEncouragementMilestonesFired < expectedMilestones) {
      this.focusEncouragementMilestonesFired += 1;
      this.enqueueTrigger({
        triggerKey: 'encouragement',
        facts: {},
        priorityScore: 10,
        dedupKey: `encouragement:${sessionId}:${this.focusEncouragementMilestonesFired}`,
        sessionId,
      });
    }
  }

  handleObservation(context: TriggerContext): void {
    if (!context.trackingRunning || context.isIdle || context.systemSuspended) {
      this.resetStreaks({ endDistractionEpisode: false });
      return;
    }

    if (context.classification === 'productive') {
      this.endDistractionEpisodeIfActive();
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
      this.breakProductiveFired = false;
      this.distractionStreakMs += OBSERVATION_INTERVAL_MS;
      this.evaluateDistracting(context);
      return;
    }

    this.resetStreaks();
  }

  enqueueCelebration(completed: CompletedFocusSession): void {
    const minutes = Math.round(completed.elapsedFocusMs / 60_000);
    this.enqueueTrigger({
      triggerKey: 'celebration',
      facts: {
        minutes,
        breakMinutes: completed.breakTargetMinutes,
        sessionId: completed.id,
      },
      priorityScore: 100,
      dedupKey: `celebration:${completed.id}`,
      sessionId: completed.id,
    });
  }

  private evaluateProductive(context: TriggerContext): void {
    if (!this.breakProductiveFired && this.productiveStreakMs >= BREAK_PRODUCTIVE_MS) {
      this.breakProductiveFired = true;
      this.enqueueTrigger({
        triggerKey: 'break-productive',
        facts: { breakMinutes: this.preferences.breakMinutes },
        priorityScore: 15,
        dedupKey: 'break-productive',
      });
    }

    if (
      context.focusSessionActive
      && !this.breakFocusFired
      && context.focusSessionElapsedMs >= BREAK_FOCUS_SESSION_MS
    ) {
      this.breakFocusFired = true;
      this.enqueueTrigger({
        triggerKey: 'break-focus',
        facts: { breakMinutes: this.preferences.breakMinutes },
        priorityScore: 15,
        dedupKey: 'break-focus',
      });
    }
  }

  private evaluateDistracting(context: TriggerContext): void {
    if (
      this.distractionStreakMs >= DISTRACTION_THRESHOLD_LIGHT_MS
      && !this.distractionThresholdActive
    ) {
      this.distractionThresholdActive = true;
      this.onDistractionThresholdCrossed?.();
    }

    const label = getActivityDisplayLabel(context.identity);

    const thresholds: Array<{ ms: number; level: number; triggerKey: AssistantTriggerKey }> = [
      { ms: DISTRACTION_THRESHOLD_LIGHT_MS, level: 15, triggerKey: 'distraction-15' },
      { ms: DISTRACTION_THRESHOLD_WARNING_MS, level: 30, triggerKey: 'distraction-30' },
      { ms: DISTRACTION_THRESHOLD_STRONG_MS, level: 60, triggerKey: 'distraction-60' },
    ];

    for (const threshold of thresholds) {
      if (
        this.distractionStreakMs >= threshold.ms
        && !this.distractionFired.has(threshold.level)
      ) {
        this.distractionFired.add(threshold.level);
        this.enqueueTrigger({
          triggerKey: threshold.triggerKey,
          facts: { app: label },
          priorityScore: 20 + threshold.level,
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
      this.enqueueTrigger({
        triggerKey: 'task-reminder',
        facts: { app: label, taskCount: context.activeTaskCount },
        priorityScore: 25,
        dedupKey: `task-reminder:${context.identity}`,
      });
    }

    if (!this.breakDistractingFired && this.distractionStreakMs >= BREAK_DISTRACTING_MS) {
      this.breakDistractingFired = true;
      this.enqueueTrigger({
        triggerKey: 'break-distracting',
        facts: { breakMinutes: this.preferences.breakMinutes },
        priorityScore: 15,
        dedupKey: 'break-distracting',
      });
    }
  }

  private enqueueTrigger(options: {
    triggerKey: AssistantTriggerKey;
    facts: TemplateFacts;
    priorityScore: number;
    dedupKey: string;
    sessionId?: string;
  }): void {
    if (options.triggerKey.startsWith('break')) {
      const now = this.now();
      if (
        this.lastBreakMessageAt !== null
        && now - this.lastBreakMessageAt < BREAK_MESSAGE_COOLDOWN_MS
      ) {
        return;
      }

      const enqueued = this.notifications.enqueue(options);
      if (enqueued) {
        this.lastBreakMessageAt = now;
      }
      return;
    }

    this.notifications.enqueue(options);
  }
}
