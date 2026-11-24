import type { AsunaNotification, NotificationActionDescriptor } from './types';

function buildStartBreakLabel(breakMinutes: number): string {
  return `Start ${breakMinutes}m Break`;
}

export function buildActionDescriptors(notification: AsunaNotification): NotificationActionDescriptor[] {
  return notification.supportedActions.map((action) => {
    switch (action) {
      case 'start_break': {
        const breakMinutes = notification.facts.breakMinutes ?? 5;
        return {
          type: action,
          label: buildStartBreakLabel(breakMinutes),
          variant: 'primary',
        };
      }
      case 'start_focus':
        return {
          type: action,
          label: 'Start Focus',
          variant: 'primary',
        };
      case 'dismiss':
        return {
          type: action,
          label: 'Dismiss',
          variant: 'secondary',
        };
      default:
        return {
          type: action,
          label: action,
          variant: 'secondary',
        };
    }
  });
}
