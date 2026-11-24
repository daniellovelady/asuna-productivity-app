import { describe, expect, it } from 'vitest';
import { isMainWindowForeground, resolvePresentation } from './presentationRouter';
import type { AsunaNotification } from '../../shared/notifications/types';

function notification(overrides: Partial<AsunaNotification>): AsunaNotification {
  return {
    id: 'n-1',
    type: 'focus_encouragement',
    title: 'A.S.U.N.A.',
    message: 'msg',
    baseTemplate: 'msg',
    triggerKey: 'encouragement',
    facts: {},
    avatarState: 'encouraging',
    priority: 'low',
    priorityScore: 10,
    supportedActions: ['dismiss'],
    desktopEligible: true,
    createdAt: 0,
    shownAt: null,
    ttlMs: 12_000,
    expiresAt: null,
    ownerUserId: 'user-1',
    presentation: null,
    variationGeneration: 0,
    legacyMessageType: 'encouragement',
    ...overrides,
  };
}

describe('presentationRouter', () => {
  it('routes desktop-eligible notifications to desktop when main is unfocused', () => {
    const mainWindow = {
      isDestroyed: () => false,
      isVisible: () => true,
      isMinimized: () => false,
      isFocused: () => false,
    } as Electron.BrowserWindow;

    expect(resolvePresentation(notification({}), mainWindow)).toBe('desktop');
  });

  it('routes desktop-eligible notifications to in-app when main is focused', () => {
    const mainWindow = {
      isDestroyed: () => false,
      isVisible: () => true,
      isMinimized: () => false,
      isFocused: () => true,
    } as Electron.BrowserWindow;

    expect(resolvePresentation(notification({}), mainWindow)).toBe('in_app');
  });

  it('always routes distraction_warning in-app', () => {
    expect(resolvePresentation(
      notification({ type: 'distraction_warning', desktopEligible: false, triggerKey: 'distraction-15' }),
      null,
    )).toBe('in_app');
  });

  it('detects foreground main window', () => {
    const focused = {
      isDestroyed: () => false,
      isVisible: () => true,
      isMinimized: () => false,
      isFocused: () => true,
    } as Electron.BrowserWindow;

    expect(isMainWindowForeground(focused)).toBe(true);
  });
});
