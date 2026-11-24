import { describe, expect, it, vi } from 'vitest';
import {
  logDevPopupGeometry,
  NOTIFICATION_CARD_WIDTH,
  NOTIFICATION_POPUP_HEIGHT,
  NOTIFICATION_POPUP_WIDTH,
  NOTIFICATION_SHADOW_PADDING,
} from './desktopNotificationWindow';
import { positionPopupInWorkArea } from '../../shared/notifications/displayPlacement';

describe('desktop notification window sizing', () => {
  it('uses window dimensions that include card width and shadow padding', () => {
    expect(NOTIFICATION_CARD_WIDTH).toBe(400);
    expect(NOTIFICATION_SHADOW_PADDING).toBe(8);
    expect(NOTIFICATION_POPUP_WIDTH).toBe(416);
    expect(NOTIFICATION_POPUP_HEIGHT).toBe(172);
  });

  it('positions popup bottom-right within work area using actual window bounds', () => {
    const workArea = { x: 100, y: 50, width: 1920, height: 1040 };
    const bounds = positionPopupInWorkArea(
      workArea,
      NOTIFICATION_POPUP_WIDTH,
      NOTIFICATION_POPUP_HEIGHT,
      20,
    );

    expect(bounds.x).toBe(workArea.x + workArea.width - NOTIFICATION_POPUP_WIDTH - 20);
    expect(bounds.y).toBe(workArea.y + workArea.height - NOTIFICATION_POPUP_HEIGHT - 20);
    expect(bounds.width).toBe(NOTIFICATION_POPUP_WIDTH);
    expect(bounds.height).toBe(NOTIFICATION_POPUP_HEIGHT);
  });
});

describe('logDevPopupGeometry', () => {
  it('logs only when dev harness env is enabled', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    delete process.env.ASUNA_DEV_NOTIFICATION_HARNESS;

    logDevPopupGeometry({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      bounds: { x: 1484, y: 888, width: 416, height: 172 },
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    process.env.ASUNA_DEV_NOTIFICATION_HARNESS = '1';
    logDevPopupGeometry({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      bounds: { x: 1484, y: 888, width: 416, height: 172 },
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    delete process.env.ASUNA_DEV_NOTIFICATION_HARNESS;
  });
});
