import { describe, expect, it, vi } from 'vitest';
import { ASSISTANT_AUTO_DISMISS_MS } from '../../shared/activity/constants';
import { AssistantMessageQueue } from './assistantMessageQueue';

describe('AssistantMessageQueue', () => {
  it('displays one message at a time and advances on dismiss', () => {
    const queue = new AssistantMessageQueue(() => 0);

    queue.enqueue({ type: 'encouragement', text: 'First', priority: 1, dedupKey: 'a' });
    queue.enqueue({ type: 'warning', text: 'Second', priority: 2, dedupKey: 'b' });

    const first = queue.getState();
    expect(first.current?.text).toBe('First');
    expect(first.pendingCount).toBe(1);

    const currentId = first.current?.id;
    expect(currentId).toBeDefined();
    queue.dismiss(currentId as string);

    const second = queue.getState();
    expect(second.current?.text).toBe('Second');
    expect(second.pendingCount).toBe(0);
  });

  it('deduplicates messages with the same dedup key', () => {
    const queue = new AssistantMessageQueue(() => 0);

    expect(queue.enqueue({
      type: 'warning',
      text: 'Once',
      dedupKey: 'same-key',
    })).toBe(true);
    expect(queue.enqueue({
      type: 'warning',
      text: 'Again',
      dedupKey: 'same-key',
    })).toBe(false);

    expect(queue.getState().pendingCount).toBe(0);
  });

  it('auto-dismisses the current message after the configured interval', () => {
    vi.useFakeTimers();
    const queue = new AssistantMessageQueue(() => 0);

    queue.enqueue({ type: 'break', text: 'Take a break', dedupKey: 'break-1' });
    expect(queue.getState().current).not.toBeNull();

    vi.advanceTimersByTime(ASSISTANT_AUTO_DISMISS_MS);
    expect(queue.getState().current).toBeNull();

    vi.useRealTimers();
  });
});
