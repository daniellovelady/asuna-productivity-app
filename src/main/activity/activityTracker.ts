import { OBSERVATION_INTERVAL_MS } from '../../shared/activity/constants';
import type {
  ActivitySamplePayload,
  ActivityTrackingState,
  AssistantQueueState,
  BufferedActivitySample,
  TrackingStatus,
} from '../../shared/activity/types';
import { ActivityTrackerError } from '../../shared/activity/types';
import { getFocusEngine } from '../focus/focusEngine';
import { ActiveActivityAdapter } from './activeActivityAdapter';
import { AssistantMessageQueue } from './assistantMessageQueue';
import { AssistantTriggerEngine } from './assistantTriggerEngine';
import { handleFocusSessionCompleted } from './focusCompletionBridge';
import { FocusSessionSampleBuffer } from './focusSessionSampleBuffer';
import { IdleDetector } from './idleDetector';
import { MockOsActivityProvider } from './mockOsActivityProvider';
import type { OsActivityProvider } from './osActivityProviderTypes';
import { PersistenceCoalescer } from './persistenceCoalescer';
import { systemSuspendHandler } from './systemSuspendHandler';

export type ActivityTrackerCallbacks = {
  onStateChanged: (state: ActivityTrackingState) => void;
  onPersistCandidate: (payload: ActivitySamplePayload) => void;
  onAssistantQueueChanged: (state: AssistantQueueState) => void;
};

export type NowFn = () => number;

export class ActivityTracker {
  private status: TrackingStatus = 'disabled';

  private authenticatedUserId: string | null = null;

  private identity: string | null = null;

  private classification: ActivityClassification | null = null;

  private isIdle = false;

  private idleSeconds = 0;

  private systemSuspended = false;

  private activeTaskCount = 0;

  private observationTimer: NodeJS.Timeout | null = null;

  private lastCompletedSessionId: string | null = null;

  private readonly adapter: ActiveActivityAdapter;

  private readonly idleDetector: IdleDetector;

  private readonly coalescer = new PersistenceCoalescer();

  private readonly focusBuffer = new FocusSessionSampleBuffer();

  private readonly messageQueue = new AssistantMessageQueue(this.now);

  private readonly triggerEngine: AssistantTriggerEngine;

  private callbacks: ActivityTrackerCallbacks | null = null;

  constructor(
    provider: OsActivityProvider,
    private readonly now: NowFn = Date.now,
    idleDetector: IdleDetector = new IdleDetector(),
  ) {
    this.adapter = new ActiveActivityAdapter(provider);
    this.idleDetector = idleDetector;
    this.triggerEngine = new AssistantTriggerEngine(this.messageQueue, this.now);
  }

  setCallbacks(callbacks: ActivityTrackerCallbacks): void {
    this.callbacks = callbacks;
    this.emitState();
    this.emitAssistantQueue();
  }

  initializeSuspendHandling(): void {
    systemSuspendHandler.register({
      onSuspend: () => {
        this.systemSuspended = true;
        this.triggerEngine.resetStreaks();
      },
      onResume: () => {
        this.systemSuspended = false;
        this.triggerEngine.resetStreaks();
        if (this.status === 'running' && this.authenticatedUserId !== null) {
          this.startObservationTimer();
        }
      },
    });
  }

  watchFocusCompletions(): void {
    getFocusEngine().setOnSessionCompleted((completed) => {
      if (completed.id === this.lastCompletedSessionId) {
        return;
      }

      this.lastCompletedSessionId = completed.id;
      handleFocusSessionCompleted(completed, this.triggerEngine);
      this.emitAssistantQueue();
    });
  }

  getState(): ActivityTrackingState {
    return this.buildState();
  }

  setAuthContext(userId: string | null): ActivityTrackingState {
    this.authenticatedUserId = userId;

    if (userId === null && this.status !== 'disabled') {
      return this.disable();
    }

    return this.buildState();
  }

  enable(): ActivityTrackingState {
    this.assertAuthenticated();
    this.status = 'running';
    this.startObservationTimer();
    this.emitState();
    return this.buildState();
  }

  pause(): ActivityTrackingState {
    this.stopObservationTimer();
    this.status = 'paused';
    this.clearTransientActivityState();
    this.triggerEngine.resetStreaks();
    this.emitState();
    return this.buildState();
  }

  resume(): ActivityTrackingState {
    this.assertAuthenticated();

    if (this.status !== 'paused') {
      throw new ActivityTrackerError('Tracking can only be resumed from the paused state.');
    }

    this.status = 'running';
    this.startObservationTimer();
    this.emitState();
    return this.buildState();
  }

  disable(): ActivityTrackingState {
    this.stopObservationTimer();
    this.status = 'disabled';
    this.clearTransientActivityState();
    this.triggerEngine.resetStreaks();
    this.coalescer.resetGeneral();
    this.messageQueue.clear();
    this.emitState();
    return this.buildState();
  }

  updateTriggerContext(activeTaskCount: number): void {
    this.activeTaskCount = activeTaskCount;
  }

  getBufferedSessionSamples(sessionId: string): BufferedActivitySample[] {
    return this.focusBuffer.getSnapshot(sessionId);
  }

  acknowledgeSessionSamplesPersisted(sessionId: string): void {
    this.focusBuffer.clear(sessionId);
    this.coalescer.resetSession(sessionId);
  }

  hasBufferedSessionSamples(sessionId: string): boolean {
    return this.focusBuffer.has(sessionId);
  }

  dismissAssistantMessage(messageId: string): AssistantQueueState {
    const state = this.messageQueue.dismiss(messageId);
    this.emitAssistantQueue();
    return state;
  }

  getAssistantQueueState(): AssistantQueueState {
    return this.messageQueue.getState();
  }

  shutdown(): void {
    this.stopObservationTimer();
    this.status = 'disabled';
    this.clearTransientActivityState();
    this.triggerEngine.resetStreaks();
  }

  private assertAuthenticated(): void {
    if (this.authenticatedUserId === null) {
      throw new ActivityTrackerError('You must be signed in to enable activity tracking.');
    }
  }

  private startObservationTimer(): void {
    this.stopObservationTimer();
    this.observationTimer = setInterval(() => {
      void this.observe();
    }, OBSERVATION_INTERVAL_MS);
  }

  private stopObservationTimer(): void {
    if (this.observationTimer !== null) {
      clearInterval(this.observationTimer);
      this.observationTimer = null;
    }
  }

  private async observe(): Promise<void> {
    if (this.status !== 'running' || this.authenticatedUserId === null || this.systemSuspended) {
      return;
    }

    const idleSeconds = this.idleDetector.getIdleSeconds();
    this.idleSeconds = idleSeconds;
    this.isIdle = this.idleDetector.isIdle(idleSeconds);

    const sample = await this.adapter.sampleWithClassification();

    if (!sample) {
      return;
    }

    this.identity = sample.identity;
    this.classification = sample.classification;

    const focusState = getFocusEngine().getState();
    const sessionId = focusState.activeSession?.id ?? null;
    const recordedAt = new Date(this.now()).toISOString();

    this.triggerEngine.handleObservation({
      trackingRunning: true,
      isIdle: this.isIdle,
      systemSuspended: this.systemSuspended,
      identity: sample.identity,
      classification: sample.classification,
      activeTaskCount: this.activeTaskCount,
      focusSessionActive: focusState.activeSession !== null,
      focusSessionElapsedMs: focusState.activeSession?.elapsedFocusMs ?? 0,
    });

    const persistCandidate = this.coalescer.consider(
      {
        identity: sample.identity,
        classification: sample.classification,
        idleSeconds,
        recordedAt,
        sessionId,
      },
      this.now(),
    );

    if (persistCandidate) {
      if (sessionId === null) {
        this.callbacks?.onPersistCandidate(persistCandidate);
      } else {
        this.focusBuffer.append(sessionId, {
          recordedAt: persistCandidate.recordedAt,
          applicationName: persistCandidate.applicationName,
          idleSeconds: persistCandidate.idleSeconds,
          classification: persistCandidate.classification,
        });
      }
    }

    this.emitState();
    this.emitAssistantQueue();
  }

  private clearTransientActivityState(): void {
    this.identity = null;
    this.classification = null;
    this.isIdle = false;
    this.idleSeconds = 0;
  }

  private buildState(): ActivityTrackingState {
    return {
      status: this.status,
      identity: this.identity,
      classification: this.classification,
      isIdle: this.isIdle,
      idleSeconds: this.idleSeconds,
    };
  }

  private emitState(): void {
    this.callbacks?.onStateChanged(this.buildState());
  }

  private emitAssistantQueue(): void {
    this.callbacks?.onAssistantQueueChanged(this.messageQueue.getState());
  }
}

type ActivityClassification = import('../../shared/activity/types').ActivityClassification;

let activityProvider: OsActivityProvider = new MockOsActivityProvider();
let activityTrackerSingleton: ActivityTracker | null = null;

export function configureActivityProvider(provider: OsActivityProvider): void {
  activityProvider = provider;

  if (activityTrackerSingleton !== null) {
    activityTrackerSingleton.shutdown();
    activityTrackerSingleton = null;
  }
}

export async function bootstrapActivityProvider(): Promise<void> {
  try {
    const { createGetWindowsProvider } = await import('./osActivityProvider');
    configureActivityProvider(await createGetWindowsProvider());
  } catch {
    configureActivityProvider(new MockOsActivityProvider());
  }
}

export function getActivityTracker(): ActivityTracker {
  if (activityTrackerSingleton === null) {
    activityTrackerSingleton = new ActivityTracker(activityProvider);
    activityTrackerSingleton.initializeSuspendHandling();
    activityTrackerSingleton.watchFocusCompletions();
  }

  return activityTrackerSingleton;
}

export function resetActivityTrackerForTests(tracker?: ActivityTracker): ActivityTracker {
  activityTrackerSingleton = tracker ?? new ActivityTracker(new MockOsActivityProvider());
  activityTrackerSingleton.initializeSuspendHandling();
  activityTrackerSingleton.watchFocusCompletions();
  return activityTrackerSingleton;
}
