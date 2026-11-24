import { useState } from 'react';
import type { AssistantMessage } from '../../shared/activity/types';
import type { NotificationAction } from '../../shared/notifications/types';
import type { AvatarStyle } from '../../shared/preferences/types';
import { normalizeAvatarStyle } from '../../shared/assistant/avatars';

type AssistantPlaceholderProps = {
  currentMessage: AssistantMessage | null;
  avatarStyle: AvatarStyle;
  onAction: (messageId: string, action: NotificationAction) => Promise<void>;
};

export function AssistantPlaceholder({
  currentMessage,
  avatarStyle,
  onAction,
}: AssistantPlaceholderProps): JSX.Element {
  const assistantType = currentMessage?.type ?? 'idle';
  const resolvedAvatar = normalizeAvatarStyle(avatarStyle);
  const [pendingAction, setPendingAction] = useState<NotificationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (messageId: string, action: NotificationAction) => {
    setPendingAction(action);
    setActionError(null);

    try {
      await onAction(messageId, action);
    } catch {
      setActionError('Action could not be completed.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section
      className={`assistant-placeholder assistant--${assistantType}`}
      aria-label="Assistant"
    >
      <div
        className={`assistant-avatar assistant-avatar--${resolvedAvatar}`}
        aria-hidden="true"
      />
      {currentMessage ? (
        <div className="assistant-speech-bubble">
          <p className="assistant-speech-text">{currentMessage.text}</p>
          {currentMessage.actions && currentMessage.actions.length > 0 ? (
            <div className="assistant-actions">
              {currentMessage.actions.map((action) => (
                <button
                  key={action.type}
                  type="button"
                  className={
                    action.variant === 'primary'
                      ? 'assistant-action-button assistant-action-button-primary'
                      : 'assistant-action-button assistant-action-button-secondary'
                  }
                  disabled={pendingAction !== null}
                  onClick={() => {
                    void handleAction(currentMessage.id, action.type as NotificationAction);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          {actionError !== null ? (
            <p className="assistant-action-error" role="alert">{actionError}</p>
          ) : null}
        </div>
      ) : (
        <p className="assistant-label">Assistant</p>
      )}
    </section>
  );
}
