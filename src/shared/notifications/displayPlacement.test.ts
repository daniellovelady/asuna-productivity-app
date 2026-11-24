import { describe, expect, it } from 'vitest';
import { positionPopupInWorkArea } from './displayPlacement';

describe('displayPlacement', () => {
  it('positions popup within work area with default margin', () => {
    const bounds = positionPopupInWorkArea(
      { x: 100, y: 50, width: 1920, height: 1040 },
      416,
      172,
    );

    expect(bounds.x).toBe(100 + 1920 - 416 - 20);
    expect(bounds.y).toBe(50 + 1040 - 172 - 20);
    expect(bounds.width).toBe(416);
    expect(bounds.height).toBe(172);
  });

  it('accepts custom margin values', () => {
    const bounds = positionPopupInWorkArea(
      { x: 100, y: 50, width: 1920, height: 1040 },
      416,
      172,
      16,
    );

    expect(bounds.x).toBe(100 + 1920 - 416 - 16);
    expect(bounds.y).toBe(50 + 1040 - 172 - 16);
  });
});
