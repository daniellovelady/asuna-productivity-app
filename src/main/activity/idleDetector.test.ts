import { describe, expect, it } from 'vitest';
import { IDLE_THRESHOLD_SECONDS } from '../../shared/activity/constants';
import { IdleDetector } from './idleDetector';

describe('IdleDetector', () => {
  it('uses a 180-second default idle threshold', () => {
    expect(IDLE_THRESHOLD_SECONDS).toBe(180);
  });

  it('treats idleSeconds below 180 as active', () => {
    const detector = new IdleDetector();

    expect(detector.isIdle(0)).toBe(false);
    expect(detector.isIdle(179)).toBe(false);
  });

  it('treats idleSeconds at or above 180 as idle', () => {
    const detector = new IdleDetector();

    expect(detector.isIdle(180)).toBe(true);
    expect(detector.isIdle(240)).toBe(true);
  });
});
