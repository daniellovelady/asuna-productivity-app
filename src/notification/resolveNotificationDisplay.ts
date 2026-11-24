import type { AvatarState } from '../shared/notifications/types';

export type NotificationDisplayContent = {
  appName: string;
  categoryLabel: string;
  headline: string | null;
  message: string;
  variantClass: 'notification-card--encouraging' | 'notification-card--celebrating';
};

export function resolveNotificationDisplay(
  title: string,
  message: string,
  avatarState: AvatarState,
): NotificationDisplayContent {
  if (avatarState === 'celebrating') {
    return {
      appName: 'A.S.U.N.A.',
      categoryLabel: 'Complete',
      headline: title,
      message,
      variantClass: 'notification-card--celebrating',
    };
  }

  return {
    appName: 'A.S.U.N.A.',
    categoryLabel: 'Focus',
    headline: null,
    message,
    variantClass: 'notification-card--encouraging',
  };
}
