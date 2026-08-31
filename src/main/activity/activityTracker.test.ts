import { describe, expect, it, vi } from 'vitest';
import { ActivityTracker, resetActivityTrackerForTests } from './activityTracker';
import { IdleDetector } from './idleDetector';
import { MockOsActivityProvider } from './mockOsActivityProvider';
import { FocusSessionSampleBuffer } from './focusSessionSampleBuffer';

describe('ActivityTracker', () => {
  class TestIdleDetector extends IdleDetector {
    private idleSeconds = 0;

    setIdleSeconds(value: number): void {
      this.idleSeconds = value;
    }

    override getIdleSeconds(): number {
      return this.idleSeconds;
    }
  }

  it('requires authentication to enable tracking', () => {
    const tracker = resetActivityTrackerForTests();

    expect(() => tracker.enable()).toThrow('You must be signed in to enable activity tracking.');
  });

  it('stops sampling on disable without clearing buffered focus samples', async () => {
    vi.useFakeTimers();
    const provider = new MockOsActivityProvider({
      ownerName: 'Code.exe',
      title: 'file.ts',
    });
    const idleDetector = new TestIdleDetector();
    const tracker = resetActivityTrackerForTests(
      new ActivityTracker(provider, () => Date.now(), idleDetector),
    );
    tracker.setAuthContext('user-1');
    tracker.enable();

    const observe = (tracker as unknown as { observe: () => Promise<void> }).observe.bind(tracker);
    await observe();

    tracker.disable();

    const internalBuffer = (tracker as unknown as { focusBuffer: FocusSessionSampleBuffer }).focusBuffer;
    internalBuffer.append('session-1', {
      recordedAt: '2026-01-01T00:00:00.000Z',
      applicationName: 'vscode',
      idleSeconds: 0,
      classification: 'productive',
    });

    expect(tracker.getState().status).toBe('disabled');
    expect(internalBuffer.getSnapshot('session-1')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('clears buffer only after acknowledgement', () => {
    const tracker = resetActivityTrackerForTests();
    const internalBuffer = (tracker as unknown as {
      focusBuffer: FocusSessionSampleBuffer;
    }).focusBuffer;

    internalBuffer.append('session-1', {
      recordedAt: '2026-01-01T00:00:00.000Z',
      applicationName: 'vscode',
      idleSeconds: 0,
      classification: 'productive',
    });

    expect(tracker.getBufferedSessionSamples('session-1')).toHaveLength(1);
    tracker.acknowledgeSessionSamplesPersisted('session-1');
    expect(tracker.getBufferedSessionSamples('session-1')).toHaveLength(0);
  });

  it('retains buffer when bulk persistence has not been acknowledged', () => {
    const tracker = resetActivityTrackerForTests();
    const internalBuffer = (tracker as unknown as {
      focusBuffer: FocusSessionSampleBuffer;
    }).focusBuffer;

    internalBuffer.append('session-1', {
      recordedAt: '2026-01-01T00:00:00.000Z',
      applicationName: 'vscode',
      idleSeconds: 0,
      classification: 'productive',
    });

    tracker.disable();
    expect(tracker.getBufferedSessionSamples('session-1')).toHaveLength(1);
  });
});
