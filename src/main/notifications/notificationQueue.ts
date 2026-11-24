import { ASSISTANT_QUEUE_MAX } from '../../shared/activity/constants';
import type { AsunaNotification } from '../../shared/notifications/types';
import { isProactiveType } from '../../shared/notifications/policies';

export type NotificationQueueListener = () => void;

export class NotificationQueue {
  private readonly pending: AsunaNotification[] = [];

  private current: AsunaNotification | null = null;

  private autoDismissTimer: NodeJS.Timeout | null = null;

  private readonly seenDedupKeys = new Set<string>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly onStateChanged?: NotificationQueueListener,
  ) {}

  enqueue(notification: AsunaNotification): boolean {
    if (notification.dedupKey && this.seenDedupKeys.has(notification.dedupKey)) {
      return false;
    }

    if (notification.dedupKey) {
      this.seenDedupKeys.add(notification.dedupKey);
    }

    if (this.pending.length >= ASSISTANT_QUEUE_MAX) {
      this.pending.shift();
    }

    this.pending.push(notification);
    this.pending.sort((left, right) => right.priorityScore - left.priorityScore);
    this.ensureCurrent();
    this.notifyStateChanged();
    return true;
  }

  dismiss(notificationId: string): boolean {
    if (this.current?.id === notificationId) {
      this.clearCurrentMessage();
      this.ensureCurrent();
      this.notifyStateChanged();
      return true;
    }

    const index = this.pending.findIndex((entry) => entry.id === notificationId);
    if (index >= 0) {
      this.pending.splice(index, 1);
      return true;
    }

    return false;
  }

  getCurrent(): AsunaNotification | null {
    this.evaluateExpiration();
    return this.current;
  }

  getPendingCount(): number {
    return this.pending.length;
  }

  updateCurrent(mutator: (current: AsunaNotification) => AsunaNotification): void {
    if (this.current === null) {
      return;
    }
    this.current = mutator(this.current);
    this.notifyStateChanged();
  }

  markPresented(notificationId: string): boolean {
    if (this.current === null || this.current.id !== notificationId) {
      return false;
    }

    if (this.current.shownAt !== null) {
      return true;
    }

    const shownAt = this.now();
    const expiresAt = this.current.ttlMs !== null
      ? shownAt + this.current.ttlMs
      : null;

    this.current = {
      ...this.current,
      shownAt,
      expiresAt,
    };

    this.scheduleAutoDismiss();
    this.notifyStateChanged();
    return true;
  }

  setPresentation(notificationId: string, presentation: 'in_app' | 'desktop'): boolean {
    if (this.current === null || this.current.id !== notificationId) {
      return false;
    }

    if (this.current.presentation !== null) {
      return this.current.presentation === presentation;
    }

    this.current = {
      ...this.current,
      presentation,
    };
    return true;
  }

  clear(): void {
    this.clearAutoDismiss();
    this.pending.length = 0;
    this.current = null;
    this.seenDedupKeys.clear();
    this.notifyStateChanged();
  }

  clearProactive(): void {
    if (this.current !== null && isProactiveType(this.current.type)) {
      this.clearCurrentMessage();
    }

    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      if (isProactiveType(this.pending[index].type)) {
        this.pending.splice(index, 1);
      }
    }

    this.ensureCurrent();
    this.notifyStateChanged();
  }

  resetDedupKeys(): void {
    this.seenDedupKeys.clear();
  }

  evaluateExpiration(): boolean {
    if (this.current === null || this.current.shownAt === null || this.current.expiresAt === null) {
      return false;
    }

    if (this.now() < this.current.expiresAt) {
      return false;
    }

    this.clearCurrentMessage();
    this.ensureCurrent();
    this.notifyStateChanged();
    return true;
  }

  private getExpiresAt(): number {
    return this.current?.expiresAt ?? this.now();
  }

  private ensureCurrent(): void {
    if (this.current !== null) {
      return;
    }

    this.current = this.pending.shift() ?? null;
  }

  private scheduleAutoDismiss(): void {
    this.clearAutoDismiss();

    if (this.current === null || this.current.shownAt === null || this.current.expiresAt === null) {
      return;
    }

    const remaining = Math.max(0, this.getExpiresAt() - this.now());
    this.autoDismissTimer = setTimeout(() => {
      this.evaluateExpiration();
    }, remaining);
  }

  private clearCurrentMessage(): void {
    this.clearAutoDismiss();
    this.current = null;
  }

  private clearAutoDismiss(): void {
    if (this.autoDismissTimer !== null) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }

  private notifyStateChanged(): void {
    this.onStateChanged?.();
  }
}
