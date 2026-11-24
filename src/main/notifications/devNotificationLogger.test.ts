import { describe, expect, it, vi } from 'vitest';
import { logDevNotification, shortNotificationId } from './devNotificationLogger';

describe('devNotificationLogger', () => {
  it('logs only when dev harness env is enabled', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    delete process.env.ASUNA_DEV_NOTIFICATION_HARNESS;

    logDevNotification('enqueue', { id: 'abcd1234', type: 'focus_encouragement', pending: 0 });
    expect(consoleSpy).not.toHaveBeenCalled();

    process.env.ASUNA_DEV_NOTIFICATION_HARNESS = '1';
    logDevNotification('enqueue', { id: 'abcd1234', type: 'focus_encouragement', pending: 0 });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[dev-notification] enqueue id=abcd1234 type=focus_encouragement pending=0',
    );

    consoleSpy.mockRestore();
    delete process.env.ASUNA_DEV_NOTIFICATION_HARNESS;
  });

  it('shortens notification ids for safe logging', () => {
    expect(shortNotificationId('12345678-abcd-efgh')).toBe('12345678');
    expect(shortNotificationId(null)).toBe('none');
  });
});
