import { StrictMode, useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { NotificationAction, NotificationViewModel } from '../shared/notifications/types';
import { NotificationPopup } from './NotificationPopup';
import './notificationApp.css';

declare global {
  interface Window {
    notificationApi: {
      signalReady: () => Promise<{ ok: boolean }>;
      signalRendered: (notificationId: string) => Promise<{ ok: boolean }>;
      dismiss: (notificationId: string) => Promise<void>;
      executeAction: (
        notificationId: string,
        action: NotificationAction,
      ) => Promise<{ ok: boolean; reason?: string }>;
      onDisplay: (callback: (payload: NotificationViewModel) => void) => () => void;
      onClear: (callback: () => void) => () => void;
    };
  }
}

function NotificationApp(): JSX.Element {
  const [notification, setNotification] = useState<NotificationViewModel | null>(null);
  const [pendingAction, setPendingAction] = useState<NotificationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeDisplay = window.notificationApi.onDisplay((payload) => {
      setNotification(payload);
      setPendingAction(null);
      setActionError(null);
    });
    const unsubscribeClear = window.notificationApi.onClear(() => {
      setNotification(null);
      setPendingAction(null);
      setActionError(null);
    });

    void window.notificationApi.signalReady();

    return () => {
      unsubscribeDisplay();
      unsubscribeClear();
    };
  }, []);

  useLayoutEffect(() => {
    if (notification === null) {
      return;
    }

    void window.notificationApi.signalRendered(notification.id);
  }, [notification?.id]);

  const handleAction = (notificationId: string, action: NotificationAction) => {
    setPendingAction(action);
    setActionError(null);

    void window.notificationApi.executeAction(notificationId, action).then((result) => {
      if (!result.ok) {
        setPendingAction(null);
        setActionError(result.reason ?? 'Action could not be completed.');
      }
    }).catch(() => {
      setPendingAction(null);
      setActionError('Action could not be completed.');
    });
  };

  if (notification === null) {
    return <div className="notification-empty" aria-hidden="true" />;
  }

  return (
    <div className="notification-shell">
      <NotificationPopup
        notification={notification}
        pendingAction={pendingAction}
        actionError={actionError}
        onAction={handleAction}
      />
    </div>
  );
}

const rootElement = document.getElementById('notification-root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <StrictMode>
      <NotificationApp />
    </StrictMode>,
  );
}
