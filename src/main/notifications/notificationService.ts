import type { WebContents } from 'electron';
import type { AssistantQueueState } from '../../shared/activity/types';
import { buildNotification } from '../../shared/notifications/buildNotification';
import { interpolateTemplate } from '../../shared/assistant/messageTemplates';
import {
  isSuppressedByQuietMode,
  isSuppressedForPreferenceReadiness,
} from '../../shared/notifications/policies';
import { buildActionDescriptors } from '../../shared/notifications/buildActionDescriptors';
import type {
  AsunaNotification,
  NotificationAction,
  NotificationActionResult,
  NotificationTriggerInput,
  NotificationViewModel,
} from '../../shared/notifications/types';
import { NotificationActionExecutor } from './notificationActionExecutor';
import { getAuthContextSnapshot } from '../auth/authContextSnapshot';
import { DesktopNotificationPresenter } from './desktopNotificationPresenter';
import { DesktopNotificationWindow, logDevPopupGeometry } from './desktopNotificationWindow';
import { logDevNotification, shortNotificationId } from './devNotificationLogger';
import { buildInAppQueueState } from './inAppPresenter';
import { getMainWindow } from './mainWindowRegistry';
import { NotificationQueue } from './notificationQueue';
import { NotificationVariationCoordinator } from './notificationVariationCoordinator';
import { resolvePresentation } from './presentationRouter';
import { arePreferencesMatchedForOwner, resolveSafePreferencesForNotification } from './resolveSafePreferences';

export type NotificationServiceCallbacks = {
  onInAppQueueChanged: (state: AssistantQueueState) => void;
};

export class NotificationService {
  private readonly queue: NotificationQueue;

  private readonly desktopWindow = new DesktopNotificationWindow({
    onRendererGone: () => {
      this.desktopPresenter.markNotReady();
    },
    onWillNavigate: () => {
      this.desktopPresenter.markNotReady();
    },
  });

  private readonly desktopPresenter = new DesktopNotificationPresenter(this.desktopWindow);

  private readonly variationCoordinator = new NotificationVariationCoordinator();

  private callbacks: NotificationServiceCallbacks | null = null;

  private lifecycleTimer: NodeJS.Timeout | null = null;

  private mainWebContents: WebContents | null = null;

  private readonly actionExecutor = new NotificationActionExecutor(this);

  constructor(
    private readonly now: () => number = Date.now,
  ) {
    this.queue = new NotificationQueue(this.now, () => {
      this.handleQueueChanged();
    });
    this.startLifecycleTimer();
  }

  setCallbacks(callbacks: NotificationServiceCallbacks | null): void {
    this.callbacks = callbacks;
    this.emitInAppQueue();
  }

  setMainWebContents(contents: WebContents | null): void {
    this.mainWebContents = contents;
    this.variationCoordinator.setMainWebContents(contents);
  }

  getVariationCoordinator(): NotificationVariationCoordinator {
    return this.variationCoordinator;
  }

  getDesktopPresenter(): DesktopNotificationPresenter {
    return this.desktopPresenter;
  }

  getDesktopWebContents(): WebContents | null {
    return this.desktopPresenter.getWebContents();
  }

  enqueueFromTrigger(input: NotificationTriggerInput): boolean {
    const ownerUserId = getAuthContextSnapshot().userId;
    if (ownerUserId === null) {
      return false;
    }

    const safePrefs = resolveSafePreferencesForNotification(ownerUserId);
    const notification = buildNotification(input, ownerUserId, safePrefs.reminderTone, this.now());

    if (isSuppressedForPreferenceReadiness(notification.type, safePrefs.ownerMatched)) {
      return false;
    }

    if (safePrefs.ownerMatched && isSuppressedByQuietMode(notification.type, safePrefs.quietMode)) {
      return false;
    }

    const enqueued = this.queue.enqueue(notification);
    if (enqueued) {
      this.logLifecycle('enqueue', notification.id, notification.type);
    }
    return enqueued;
  }

  dismiss(notificationId: string): AssistantQueueState {
    const current = this.queue.getCurrent();
    if (current?.id === notificationId) {
      this.queue.updateCurrent((entry) => ({
        ...entry,
        variationGeneration: entry.variationGeneration + 1,
      }));
      if (current.presentation === 'desktop') {
        this.hideDesktopPresentation(notificationId);
      }
    }

    this.queue.dismiss(notificationId);
    const promoted = this.queue.getCurrent();
    if (promoted !== null) {
      this.logPromotion(promoted);
    }
    this.handleQueueChanged();
    return this.getInAppQueueState();
  }

  executeAction(notificationId: string, action: NotificationAction): NotificationActionResult {
    const current = this.queue.getCurrent();
    const isCurrent = current !== null && current.id === notificationId;

    if (!isCurrent || current === null) {
      return {
        ok: false,
        reason: 'Notification is no longer active.',
        queueState: this.getInAppQueueState(),
      };
    }

    const result = this.actionExecutor.execute(current, action, isCurrent);

    return {
      ok: result.ok,
      reason: result.reason,
      queueState: this.getInAppQueueState(),
    };
  }

  applyVariation(
    notificationId: string,
    variationGeneration: number,
    variedTemplate: string,
  ): boolean {
    const current = this.queue.getCurrent();
    if (current === null) {
      return false;
    }

    if (current.id !== notificationId || current.variationGeneration !== variationGeneration) {
      return false;
    }

    this.assertOwner(current);

    const message = interpolateTemplate(variedTemplate, current.facts);
    this.queue.updateCurrent((entry) => ({
      ...entry,
      message,
      baseTemplate: variedTemplate,
    }));

    this.refreshActivePresenter();
    return true;
  }

  handleDesktopReady(): void {
    this.desktopPresenter.markReady();
    const current = this.queue.getCurrent();
    if (current === null || current.presentation !== 'desktop') {
      return;
    }

    this.presentCurrentDesktop(current);
  }

  handleAuthContextChange(userId: string | null): void {
    if (userId === null) {
      this.clearAll();
      return;
    }

    const current = this.queue.getCurrent();
    if (current !== null && current.ownerUserId !== userId) {
      this.clearAll();
    }
  }

  applyPreferences(): void {
    const authUserId = getAuthContextSnapshot().userId;
    if (authUserId === null) {
      return;
    }

    const safePrefs = resolveSafePreferencesForNotification(authUserId);
    if (safePrefs.ownerMatched && safePrefs.quietMode) {
      const current = this.queue.getCurrent();
      if (current !== null && current.presentation === 'desktop' && isSuppressedByQuietMode(current.type, true)) {
        this.hideDesktopPresentation(current.id);
      }
      this.queue.clearProactive();
      this.handleQueueChanged();
    }

    this.refreshActivePresenter();
  }

  clear(): void {
    this.queue.clear();
    this.hideDesktopPresentation();
    this.emitInAppQueue();
  }

  clearProactive(): void {
    const current = this.queue.getCurrent();
    if (current !== null && current.presentation === 'desktop' && isSuppressedByQuietMode(current.type, true)) {
      this.hideDesktopPresentation(current.id);
    }
    this.queue.clearProactive();
    void this.handleQueueChanged();
  }

  resetDedupKeys(): void {
    this.queue.resetDedupKeys();
  }

  getInAppQueueState(): AssistantQueueState {
    const current = this.queue.getCurrent();
    const pendingCount = this.queue.getPendingCount();
    return buildInAppQueueState(current, pendingCount);
  }

  getQueueDiagnostics(): { currentType: string | null; pendingCount: number } {
    const current = this.queue.getCurrent();
    return {
      currentType: current?.type ?? null,
      pendingCount: this.queue.getPendingCount(),
    };
  }

  dismissCurrentNotification(): boolean {
    const current = this.queue.getCurrent();
    if (current === null) {
      return false;
    }

    this.dismiss(current.id);
    return true;
  }

  handleDesktopRendered(notificationId: string): void {
    const current = this.queue.getCurrent();
    if (current === null || current.presentation !== 'desktop') {
      return;
    }

    if (current.id !== notificationId) {
      return;
    }

    this.logLifecycle('rendered', notificationId, current.type);

    const shown = this.desktopPresenter.acknowledgeRendered(notificationId);
    if (!shown) {
      return;
    }

    logDevPopupGeometry(this.desktopWindow.computePlacement());

    if (current.shownAt !== null) {
      return;
    }

    if (!this.queue.markPresented(notificationId)) {
      return;
    }

    this.logLifecycle('presented', notificationId, current.type);
    this.maybeRequestVariation(this.queue.getCurrent() ?? current);
  }

  shutdown(): void {
    this.stopLifecycleTimer();
    this.clearAll();
    this.desktopPresenter.destroy();
  }

  private handleQueueChanged(): void {
    const current = this.queue.getCurrent();
    if (current === null) {
      this.hideDesktopPresentation();
      this.emitInAppQueue();
      return;
    }

    if (!this.isOwnerValid(current)) {
      this.queue.dismiss(current.id);
      return;
    }

    if (current.presentation === null) {
      const presentation = resolvePresentation(current, getMainWindow());
      this.queue.setPresentation(current.id, presentation);
    }

    const updated = this.queue.getCurrent();
    if (updated === null) {
      this.emitInAppQueue();
      return;
    }

    if (updated.presentation === 'in_app') {
      this.hideDesktopPresentation(updated.id);
      if (updated.shownAt === null) {
        this.queue.markPresented(updated.id);
        this.maybeRequestVariation(updated);
      }
      this.emitInAppQueue();
      return;
    }

    if (updated.shownAt === null) {
      this.presentCurrentDesktop(updated);
    } else {
      this.sendDesktopDisplay(updated);
    }

    this.emitInAppQueue();
  }

  private presentCurrentDesktop(notification: AsunaNotification): void {
    const viewModel = this.buildViewModel(notification);
    this.desktopWindow.ensureCreated();
    const updateOnly = notification.shownAt !== null;
    if (!updateOnly) {
      this.logLifecycle('desktop display', notification.id, notification.type);
    }
    const displayed = this.desktopPresenter.present(viewModel, { updateOnly });
    if (!displayed) {
      console.info('notification desktop presentation waiting for renderer ready');
    }
  }

  private sendDesktopDisplay(notification: AsunaNotification): void {
    const viewModel = this.buildViewModel(notification);
    this.desktopPresenter.present(viewModel, { updateOnly: true });
  }

  private buildViewModel(notification: AsunaNotification): NotificationViewModel {
    const prefs = resolveSafePreferencesForNotification(notification.ownerUserId);
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      avatarStyle: prefs.avatarStyle,
      avatarState: notification.avatarState,
      actions: buildActionDescriptors(notification),
    };
  }

  private maybeRequestVariation(notification: AsunaNotification): void {
    const prefs = resolveSafePreferencesForNotification(notification.ownerUserId);
    if (!prefs.aiMessageVariationEnabled || !arePreferencesMatchedForOwner(notification.ownerUserId)) {
      return;
    }

    this.variationCoordinator.requestVariation({
      notificationId: notification.id,
      variationGeneration: notification.variationGeneration,
      triggerKey: notification.triggerKey,
      tone: prefs.reminderTone,
      baseTemplate: notification.baseTemplate,
    });
  }

  private refreshActivePresenter(): void {
    const current = this.queue.getCurrent();
    if (current === null) {
      return;
    }

    if (current.presentation === 'in_app') {
      this.emitInAppQueue();
      return;
    }

    if (current.presentation === 'desktop') {
      this.sendDesktopDisplay(current);
    }
  }

  private emitInAppQueue(): void {
    this.callbacks?.onInAppQueueChanged(this.getInAppQueueState());
  }

  private clearAll(): void {
    this.queue.clear();
    this.hideDesktopPresentation();
    this.emitInAppQueue();
  }

  private isOwnerValid(notification: AsunaNotification): boolean {
    const authUserId = getAuthContextSnapshot().userId;
    return authUserId !== null && authUserId === notification.ownerUserId;
  }

  private assertOwner(notification: AsunaNotification): void {
    if (!this.isOwnerValid(notification)) {
      throw new Error('Notification ownership mismatch.');
    }
  }

  private startLifecycleTimer(): void {
    this.stopLifecycleTimer();
    this.lifecycleTimer = setInterval(() => {
      const before = this.queue.getCurrent();
      if (this.queue.evaluateExpiration()) {
        if (before !== null) {
          this.logLifecycle('expired', before.id, before.type);
        }
        const promoted = this.queue.getCurrent();
        if (promoted !== null) {
          this.logPromotion(promoted);
        }
      }
    }, 1000);
  }

  private stopLifecycleTimer(): void {
    if (this.lifecycleTimer !== null) {
      clearInterval(this.lifecycleTimer);
      this.lifecycleTimer = null;
    }
  }

  private hideDesktopPresentation(notificationId?: string): void {
    if (notificationId !== undefined) {
      this.logLifecycle('hidden', notificationId);
    } else {
      logDevNotification('hidden');
    }
    this.desktopPresenter.hide();
  }

  private logLifecycle(
    event: string,
    notificationId?: string,
    notificationType?: string,
  ): void {
    const current = this.queue.getCurrent();
    logDevNotification(event, {
      id: shortNotificationId(notificationId),
      type: notificationType ?? null,
      current: current?.type ?? null,
      pending: this.queue.getPendingCount(),
    });
  }

  private logPromotion(notification: AsunaNotification): void {
    logDevNotification('promote', {
      id: shortNotificationId(notification.id),
      type: notification.type,
      current: notification.type,
      pending: this.queue.getPendingCount(),
    });
  }
}

let notificationServiceSingleton: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (notificationServiceSingleton === null) {
    notificationServiceSingleton = new NotificationService();
  }
  return notificationServiceSingleton;
}

export function resetNotificationServiceForTests(service?: NotificationService): NotificationService {
  if (notificationServiceSingleton !== null) {
    notificationServiceSingleton.shutdown();
  }
  notificationServiceSingleton = service ?? new NotificationService();
  return notificationServiceSingleton;
}
