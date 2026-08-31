import { describe, expect, it } from 'vitest';
import { PERSISTENCE_HEARTBEAT_MS } from '../../shared/activity/constants';
import { PersistenceCoalescer } from './persistenceCoalescer';

describe('PersistenceCoalescer', () => {
  it('emits on identity change immediately', () => {
    const coalescer = new PersistenceCoalescer();
    const first = coalescer.consider(
      {
        identity: 'vscode',
        classification: 'productive',
        idleSeconds: 0,
        recordedAt: '2026-01-01T00:00:00.000Z',
        sessionId: null,
      },
      0,
    );
    const second = coalescer.consider(
      {
        identity: 'youtube',
        classification: 'distracting',
        idleSeconds: 0,
        recordedAt: '2026-01-01T00:00:15.000Z',
        sessionId: null,
      },
      15_000,
    );

    expect(first?.applicationName).toBe('vscode');
    expect(second?.applicationName).toBe('youtube');
  });

  it('does not emit every 15 seconds for unchanged activity', () => {
    const coalescer = new PersistenceCoalescer();
    const baseObservation = {
      identity: 'vscode',
      classification: 'productive' as const,
      idleSeconds: 0,
      recordedAt: '2026-01-01T00:00:00.000Z',
      sessionId: null,
    };

    coalescer.consider(baseObservation, 0);
    expect(coalescer.consider(baseObservation, 15_000)).toBeNull();
    expect(coalescer.consider(baseObservation, 30_000)).toBeNull();
    expect(coalescer.consider(baseObservation, 45_000)).toBeNull();
  });

  it('emits heartbeat after 60 seconds of unchanged activity', () => {
    const coalescer = new PersistenceCoalescer();
    const baseObservation = {
      identity: 'vscode',
      classification: 'productive' as const,
      idleSeconds: 0,
      recordedAt: '2026-01-01T00:00:00.000Z',
      sessionId: null,
    };

    coalescer.consider(baseObservation, 0);
    const heartbeat = coalescer.consider(
      {
        ...baseObservation,
        recordedAt: '2026-01-01T00:01:00.000Z',
      },
      PERSISTENCE_HEARTBEAT_MS,
    );

    expect(heartbeat).not.toBeNull();
  });
});
