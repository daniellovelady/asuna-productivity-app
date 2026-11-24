import { describe, expect, it, vi } from 'vitest';
import { ASSISTANT_AUTO_DISMISS_MS } from '../../shared/activity/constants';
import { buildNotification } from '../../shared/notifications/buildNotification';
import { NotificationQueue } from './notificationQueue';

function createClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function sampleNotification(
  clock: ReturnType<typeof createClock>,
  overrides: Partial<ReturnType<typeof buildNotification>> = {},
) {
  const base = buildNotification(
    {
      triggerKey: 'encouragement',
      facts: {},
      priorityScore: 10,
      dedupKey: `key-${Math.random()}`,
    },
    'user-1',
    'neutral',
    clock.now(),
  );
  return { ...base, ...overrides };
}

describe('NotificationQueue', () => {
  it('displays one notification at a time and advances on dismiss', () => {
    const clock = createClock();
    const queue = new NotificationQueue(clock.now);

    queue.enqueue(sampleNotification(clock, { dedupKey: 'a' }));
    queue.enqueue(sampleNotification(clock, { dedupKey: 'b', priorityScore: 20 }));

    const first = queue.getCurrent();
    expect(first).not.toBeNull();
    queue.markPresented(first!.id);

    expect(queue.getPendingCount()).toBe(1);
    queue.dismiss(first!.id);

    expect(queue.getCurrent()).not.toBeNull();
    expect(queue.getPendingCount()).toBe(0);
  });

  it('deduplicates notifications with the same dedup key', () => {
    const clock = createClock();
    const queue = new NotificationQueue(clock.now);

    expect(queue.enqueue(sampleNotification(clock, { dedupKey: 'same-key' }))).toBe(true);
    expect(queue.enqueue(sampleNotification(clock, { dedupKey: 'same-key' }))).toBe(false);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('auto-dismisses after ttl from shownAt', () => {
    vi.useFakeTimers();
    const clock = createClock();
    const onStateChanged = vi.fn();
    const queue = new NotificationQueue(clock.now, onStateChanged);

    const notification = sampleNotification(clock, { dedupKey: 'ttl-1', ttlMs: ASSISTANT_AUTO_DISMISS_MS });
    queue.enqueue(notification);
    queue.markPresented(queue.getCurrent()!.id);

    clock.advance(ASSISTANT_AUTO_DISMISS_MS);
    vi.advanceTimersByTime(ASSISTANT_AUTO_DISMISS_MS);

    expect(queue.getCurrent()).toBeNull();
    vi.useRealTimers();
  });

  it('grants full visible lifetime after queue wait (shownAt not createdAt)', () => {
    vi.useFakeTimers();
    const clock = createClock();
    const queue = new NotificationQueue(clock.now);

    queue.enqueue(sampleNotification(clock, { dedupKey: 'wait-a', priorityScore: 1 }));
    queue.enqueue(sampleNotification(clock, { dedupKey: 'wait-b', priorityScore: 2, ttlMs: ASSISTANT_AUTO_DISMISS_MS }));

    const first = queue.getCurrent()!;
    queue.markPresented(first.id);

    clock.advance(20_000);
    vi.advanceTimersByTime(20_000);
    queue.dismiss(first.id);

    const second = queue.getCurrent()!;
    expect(second.shownAt).toBeNull();
    queue.markPresented(second.id);

    clock.advance(ASSISTANT_AUTO_DISMISS_MS - 1_000);
    vi.advanceTimersByTime(ASSISTANT_AUTO_DISMISS_MS - 1_000);
    expect(queue.getCurrent()?.id).toBe(second.id);

    clock.advance(1_000);
    vi.advanceTimersByTime(1_000);
    expect(queue.getCurrent()).toBeNull();
    vi.useRealTimers();
  });

  it('does not expire focus_complete notifications', () => {
    vi.useFakeTimers();
    const clock = createClock();
    const queue = new NotificationQueue(clock.now);

    const complete = buildNotification(
      {
        triggerKey: 'celebration',
        facts: { minutes: 25 },
        priorityScore: 100,
        dedupKey: 'complete-1',
      },
      'user-1',
      'neutral',
      clock.now(),
    );
    queue.enqueue(complete);
    queue.markPresented(queue.getCurrent()!.id);

    clock.advance(ASSISTANT_AUTO_DISMISS_MS * 5);
    vi.advanceTimersByTime(ASSISTANT_AUTO_DISMISS_MS * 5);

    expect(queue.getCurrent()).not.toBeNull();
    vi.useRealTimers();
  });
});
