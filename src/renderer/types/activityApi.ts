import type {
  ActivitySamplePayload,
  ActivityTrackingState,
  AssistantQueueState,
  BufferedActivitySample,
} from '../../shared/activity/types';

export interface ActivityApi {
  getState: () => Promise<ActivityTrackingState>;
  enable: () => Promise<ActivityTrackingState>;
  disable: () => Promise<ActivityTrackingState>;
  pause: () => Promise<ActivityTrackingState>;
  resume: () => Promise<ActivityTrackingState>;
  setAuthContext: (userId: string | null) => Promise<ActivityTrackingState>;
  updateTriggerContext: (activeTaskCount: number) => Promise<void>;
  getBufferedSessionSamples: (sessionId: string) => Promise<BufferedActivitySample[]>;
  acknowledgeSessionSamplesPersisted: (sessionId: string) => Promise<void>;
  dismissAssistantMessage: (messageId: string) => Promise<AssistantQueueState>;
  onStateChanged: (callback: (state: ActivityTrackingState) => void) => () => void;
  onPersistCandidate: (callback: (payload: ActivitySamplePayload) => void) => () => void;
  onAssistantQueueChanged: (callback: (state: AssistantQueueState) => void) => () => void;
}

declare global {
  interface Window {
    activityApi: ActivityApi;
  }
}

export {};
