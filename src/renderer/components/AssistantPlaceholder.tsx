import type { AssistantMessage } from '../../shared/activity/types';

type AssistantPlaceholderProps = {
  currentMessage: AssistantMessage | null;
  onDismiss: (messageId: string) => void;
};

export function AssistantPlaceholder({
  currentMessage,
  onDismiss,
}: AssistantPlaceholderProps): JSX.Element {
  const assistantType = currentMessage?.type ?? 'idle';

  return (
    <section
      className={`assistant-placeholder assistant--${assistantType}`}
      aria-label="Assistant"
    >
      <div className="assistant-avatar" aria-hidden="true" />
      {currentMessage ? (
        <div className="assistant-speech-bubble">
          <p className="assistant-speech-text">{currentMessage.text}</p>
          <button
            type="button"
            className="assistant-dismiss-button"
            onClick={() => onDismiss(currentMessage.id)}
          >
            Dismiss
          </button>
        </div>
      ) : (
        <p className="assistant-label">Assistant</p>
      )}
    </section>
  );
}
