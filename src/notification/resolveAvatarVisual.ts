import type { AvatarStyle } from '../shared/preferences/types';
import type { AvatarState } from '../shared/notifications/types';
import { normalizeAvatarStyle } from '../shared/assistant/avatars';

export interface AvatarVisualClasses {
  styleClass: string;
  stateClass: string;
}

export function resolveAvatarVisualClasses(
  avatarStyle: AvatarStyle,
  avatarState: AvatarState,
): AvatarVisualClasses {
  const styleClass = `notification-avatar--${normalizeAvatarStyle(avatarStyle)}`;
  const stateClass = `notification-avatar-state--${avatarState}`;
  return { styleClass, stateClass };
}
