import { describe, expect, it } from 'vitest';
import { FocusSessionSampleBuffer } from './focusSessionSampleBuffer';

describe('FocusSessionSampleBuffer', () => {
  it('returns snapshot copies and clears only on ack', () => {
    const buffer = new FocusSessionSampleBuffer();
    const sample = {
      recordedAt: '2026-01-01T00:00:00.000Z',
      applicationName: 'vscode',
      idleSeconds: 0,
      classification: 'productive' as const,
    };

    buffer.append('session-1', sample);
    const snapshot = buffer.getSnapshot('session-1');

    expect(snapshot).toHaveLength(1);
    snapshot[0].applicationName = 'mutated';
    expect(buffer.getSnapshot('session-1')[0].applicationName).toBe('vscode');

    buffer.clear('session-1');
    expect(buffer.getSnapshot('session-1')).toHaveLength(0);
  });
});
