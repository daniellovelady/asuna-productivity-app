import { PERSISTENCE_HEARTBEAT_MS } from '../../shared/activity/constants';
import type {
  ActivityClassification,
  ActivitySamplePayload,
} from '../../shared/activity/types';

interface CoalesceState {
  lastIdentity: string | null;
  lastClassification: ActivityClassification | null;
  lastPersistAt: number | null;
}

export class PersistenceCoalescer {
  private readonly generalState: CoalesceState = {
    lastIdentity: null,
    lastClassification: null,
    lastPersistAt: null,
  };

  private readonly sessionStates = new Map<string, CoalesceState>();

  resetGeneral(): void {
    this.generalState.lastIdentity = null;
    this.generalState.lastClassification = null;
    this.generalState.lastPersistAt = null;
  }

  resetSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }

  consider(
    observation: {
      identity: string;
      classification: ActivityClassification;
      idleSeconds: number;
      recordedAt: string;
      sessionId: string | null;
    },
    now: number,
  ): ActivitySamplePayload | null {
    const state = observation.sessionId === null
      ? this.generalState
      : this.getSessionState(observation.sessionId);

    const identityChanged = state.lastIdentity !== observation.identity;
    const classificationChanged = state.lastClassification !== observation.classification;
    const heartbeatDue = state.lastPersistAt === null
      || now - state.lastPersistAt >= PERSISTENCE_HEARTBEAT_MS;

    if (!identityChanged && !classificationChanged && !heartbeatDue) {
      return null;
    }

    state.lastIdentity = observation.identity;
    state.lastClassification = observation.classification;
    state.lastPersistAt = now;

    return {
      recordedAt: observation.recordedAt,
      applicationName: observation.identity,
      idleSeconds: observation.idleSeconds,
      classification: observation.classification,
      sessionId: observation.sessionId,
    };
  }

  private getSessionState(sessionId: string): CoalesceState {
    const existing = this.sessionStates.get(sessionId);

    if (existing) {
      return existing;
    }

    const created: CoalesceState = {
      lastIdentity: null,
      lastClassification: null,
      lastPersistAt: null,
    };
    this.sessionStates.set(sessionId, created);
    return created;
  }
}
