import type { BrowserWindow } from 'electron';
import { applyAuthContextSnapshot, resetAuthContextSnapshotForTests } from '../auth/authContextSnapshot';
import {
  applyPreferencesSnapshot,
  resetPreferencesSnapshotForTests,
} from '../preferences/preferencesSnapshot';
import type { UserPreferences } from '../../shared/preferences/types';
import { DEFAULT_USER_PREFERENCES } from '../../shared/preferences/types';
import { AssistantTriggerEngine } from '../activity/assistantTriggerEngine';
import { createNotificationEnqueueTarget } from './notificationEnqueueTarget';
import { setMainWindow } from './mainWindowRegistry';
import { getNotificationService, resetNotificationServiceForTests } from './notificationService';

export function createMockFocusedMainWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    isFocused: () => true,
    getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  } as BrowserWindow;
}

export function createMockUnfocusedMainWindow(): BrowserWindow {
  return {
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    isFocused: () => false,
    getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  } as BrowserWindow;
}

export function createNotificationTestHarness(
  preferences: UserPreferences = DEFAULT_USER_PREFERENCES,
  userId = 'test-user',
): {
  engine: AssistantTriggerEngine;
  service: ReturnType<typeof getNotificationService>;
} {
  resetAuthContextSnapshotForTests();
  resetPreferencesSnapshotForTests();
  applyAuthContextSnapshot(userId, 1, 1, 'UTC');
  applyPreferencesSnapshot(userId, 1, preferences);
  setMainWindow(createMockFocusedMainWindow());
  const service = resetNotificationServiceForTests();
  const engine = new AssistantTriggerEngine(createNotificationEnqueueTarget());
  engine.applyPreferences(preferences);
  return { engine, service };
}
