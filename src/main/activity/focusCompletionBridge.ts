import type { CompletedFocusSession } from '../../shared/focus/types';
import type { AssistantTriggerEngine } from './assistantTriggerEngine';

export function isFocusSessionCompleted(completed: CompletedFocusSession): boolean {
  return completed.elapsedFocusMs >= completed.targetDurationMs;
}

export function handleFocusSessionCompleted(
  completed: CompletedFocusSession,
  triggerEngine: AssistantTriggerEngine,
): void {
  if (isFocusSessionCompleted(completed)) {
    triggerEngine.enqueueCelebration();
  }
}
