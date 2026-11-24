export type DevNotificationLogFields = Record<string, string | number | null | undefined>;

const DEV_LOG_PREFIX = '[dev-notification]';

export function isDevNotificationLoggingEnabled(): boolean {
  return process.env.ASUNA_DEV_NOTIFICATION_HARNESS === '1';
}

export function shortNotificationId(notificationId: string | null | undefined): string {
  if (notificationId === null || notificationId === undefined || notificationId.length === 0) {
    return 'none';
  }

  return notificationId.slice(0, 8);
}

export function logDevNotification(event: string, fields: DevNotificationLogFields = {}): void {
  if (!isDevNotificationLoggingEnabled()) {
    return;
  }

  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value ?? 'none'}`)
    .join(' ');

  console.info(parts.length > 0 ? `${DEV_LOG_PREFIX} ${event} ${parts}` : `${DEV_LOG_PREFIX} ${event}`);
}
