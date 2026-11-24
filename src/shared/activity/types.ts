export type ActivityClassification = 'productive' | 'neutral' | 'distracting';

export type TrackingStatus = 'disabled' | 'running' | 'paused';

export type ActivityIdentity = string;

export interface NormalizedActivity {
  identity: ActivityIdentity;
}

export interface ActivitySamplePayload {
  recordedAt: string;
  applicationName: string;
  idleSeconds: number;
  classification: ActivityClassification;
  sessionId: string | null;
}

export interface BufferedActivitySample {
  recordedAt: string;
  applicationName: string;
  idleSeconds: number;
  classification: ActivityClassification;
}

export interface ActivityTrackingState {
  status: TrackingStatus;
  identity: ActivityIdentity | null;
  classification: ActivityClassification | null;
  isIdle: boolean;
  idleSeconds: number;
}

export type AssistantMessageType =
  | 'idle'
  | 'encouragement'
  | 'warning'
  | 'break'
  | 'celebration';

export interface AssistantMessageFacts {
  app?: string;
  minutes?: number;
  taskCount?: number;
  breakMinutes?: number;
}

export interface AssistantMessageAction {
  type: string;
  label: string;
  variant: 'primary' | 'secondary';
}

export interface AssistantMessage {
  id: string;
  type: AssistantMessageType;
  text: string;
  createdAt: number;
  priority?: number;
  triggerKey?: string;
  template?: string;
  facts?: AssistantMessageFacts;
  actions?: AssistantMessageAction[];
}

export interface AssistantQueueState {
  current: AssistantMessage | null;
  pendingCount: number;
}

export class ActivityTrackerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityTrackerError';
  }
}
