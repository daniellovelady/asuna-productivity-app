import type { NotificationAction, NotificationViewModel } from '../shared/notifications/types';
import { resolveAvatarVisualClasses } from './resolveAvatarVisual';
import { resolveNotificationDisplay } from './resolveNotificationDisplay';

type NotificationPopupProps = {
  notification: NotificationViewModel;
  pendingAction: NotificationAction | null;
  actionError: string | null;
  onAction: (notificationId: string, action: NotificationAction) => void;
};

export function NotificationPopup({
  notification,
  pendingAction,
  actionError,
  onAction,
}: NotificationPopupProps): JSX.Element {
  const { styleClass, stateClass } = resolveAvatarVisualClasses(
    notification.avatarStyle,
    notification.avatarState,
  );
  const display = resolveNotificationDisplay(
    notification.title,
    notification.message,
    notification.avatarState,
  );
  const actionsDisabled = pendingAction !== null;

  return (
    <article
      key={notification.id}
      className={`notification-card ${display.variantClass}`}
      aria-label={`${display.appName} ${display.categoryLabel}`}
    >
      <div className="notification-avatar-area" aria-hidden="true">
        <div className={`notification-avatar ${styleClass} ${stateClass}`}>
          <span className="notification-avatar-face" />
        </div>
      </div>
      <div className="notification-content">
        <header className="notification-header">
          <span className="notification-app-name">{display.appName}</span>
          <h2 className="notification-category">{display.categoryLabel}</h2>
        </header>
        {display.headline !== null ? (
          <p className="notification-headline">{display.headline}</p>
        ) : null}
        <p className="notification-message">{display.message}</p>
        {notification.actions.length > 0 ? (
          <div className="notification-actions">
            {notification.actions.map((action) => (
              <button
                key={action.type}
                type="button"
                className={
                  action.variant === 'primary'
                    ? 'notification-action-button notification-action-button-primary'
                    : 'notification-action-button notification-action-button-secondary'
                }
                disabled={actionsDisabled}
                onClick={() => onAction(notification.id, action.type)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        {actionError !== null ? (
          <p className="notification-action-error" role="alert">{actionError}</p>
        ) : null}
      </div>
    </article>
  );
}
