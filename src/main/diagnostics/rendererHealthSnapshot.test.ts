import { describe, expect, it } from 'vitest';
import { captureRendererHealthSnapshot } from './rendererHealthSnapshot';

describe('captureRendererHealthSnapshot', () => {
  it('reports destroyed state for null window', () => {
    expect(captureRendererHealthSnapshot(null)).toEqual({
      windowDestroyed: true,
      windowVisible: null,
      windowMinimized: null,
      webContentsDestroyed: true,
      webContentsCrashed: null,
      url: null,
    });
  });

  it('captures visible window state', () => {
    const window = {
      isDestroyed: () => false,
      isVisible: () => true,
      isMinimized: () => false,
      webContents: {
        isDestroyed: () => false,
        isCrashed: () => false,
        getURL: () => 'http://localhost:5174/',
      },
    };

    expect(captureRendererHealthSnapshot(window as never)).toMatchObject({
      windowDestroyed: false,
      windowVisible: true,
      webContentsCrashed: false,
      url: 'http://localhost:5174/',
    });
  });

  it('returns null isCrashed when unsupported', () => {
    const window = {
      isDestroyed: () => false,
      isVisible: () => true,
      isMinimized: () => false,
      webContents: {
        isDestroyed: () => false,
        getURL: () => 'http://localhost:5174/',
      },
    };

    expect(captureRendererHealthSnapshot(window as never).webContentsCrashed).toBeNull();
  });
});