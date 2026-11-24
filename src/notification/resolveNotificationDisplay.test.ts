import { describe, expect, it } from 'vitest';
import { resolveNotificationDisplay } from './resolveNotificationDisplay';

describe('resolveNotificationDisplay', () => {
  it('maps encouragement notifications to focus layout', () => {
    const display = resolveNotificationDisplay(
      'A.S.U.N.A.',
      'Keep going.',
      'encouraging',
    );

    expect(display.appName).toBe('A.S.U.N.A.');
    expect(display.categoryLabel).toBe('Focus');
    expect(display.headline).toBeNull();
    expect(display.message).toBe('Keep going.');
    expect(display.variantClass).toBe('notification-card--encouraging');
  });

  it('maps celebration notifications to completion layout', () => {
    const display = resolveNotificationDisplay(
      'Focus session complete',
      'You focused for 25 minutes.',
      'celebrating',
    );

    expect(display.appName).toBe('A.S.U.N.A.');
    expect(display.categoryLabel).toBe('Complete');
    expect(display.headline).toBe('Focus session complete');
    expect(display.message).toBe('You focused for 25 minutes.');
    expect(display.variantClass).toBe('notification-card--celebrating');
  });
});
