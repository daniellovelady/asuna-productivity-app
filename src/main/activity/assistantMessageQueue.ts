import { randomUUID } from 'crypto';
import { ASSISTANT_AUTO_DISMISS_MS, ASSISTANT_QUEUE_MAX } from '../../shared/activity/constants';
import type { AssistantMessage, AssistantQueueState } from '../../shared/activity/types';

export class AssistantMessageQueue {
  private readonly pending: AssistantMessage[] = [];

  private current: AssistantMessage | null = null;

  private autoDismissTimer: NodeJS.Timeout | null = null;

  private readonly seenDedupKeys = new Set<string>();

  constructor(private readonly now: () => number = Date.now) {}

  enqueue(message: Omit<AssistantMessage, 'id' | 'createdAt'> & { dedupKey?: string }): boolean {
    if (message.dedupKey && this.seenDedupKeys.has(message.dedupKey)) {
      return false;
    }

    if (message.dedupKey) {
      this.seenDedupKeys.add(message.dedupKey);
    }

    const entry: AssistantMessage = {
      id: randomUUID(),
      type: message.type,
      text: message.text,
      createdAt: this.now(),
      priority: message.priority,
    };

    if (this.pending.length >= ASSISTANT_QUEUE_MAX) {
      this.pending.shift();
    }

    this.pending.push(entry);
    this.pending.sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
    this.ensureCurrent();
    return true;
  }

  dismiss(messageId: string): AssistantQueueState {
    if (this.current?.id === messageId) {
      this.clearAutoDismiss();
      this.current = null;
      this.ensureCurrent();
    } else {
      this.pending.splice(
        this.pending.findIndex((message) => message.id === messageId),
        1,
      );
    }

    return this.getState();
  }

  getState(): AssistantQueueState {
    return {
      current: this.current,
      pendingCount: this.pending.length,
    };
  }

  clear(): void {
    this.clearAutoDismiss();
    this.pending.length = 0;
    this.current = null;
    this.seenDedupKeys.clear();
  }

  resetDedupKeys(): void {
    this.seenDedupKeys.clear();
  }

  private ensureCurrent(): void {
    if (this.current !== null) {
      return;
    }

    this.current = this.pending.shift() ?? null;

    if (this.current !== null) {
      this.scheduleAutoDismiss();
    }
  }

  private scheduleAutoDismiss(): void {
    this.clearAutoDismiss();
    this.autoDismissTimer = setTimeout(() => {
      if (this.current !== null) {
        this.current = null;
        this.ensureCurrent();
      }
    }, ASSISTANT_AUTO_DISMISS_MS);
  }

  private clearAutoDismiss(): void {
    if (this.autoDismissTimer !== null) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }
}
