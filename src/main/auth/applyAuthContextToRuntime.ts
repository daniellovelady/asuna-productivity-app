import { getActivityTracker } from '../activity/activityTracker';
import { getCalendarService } from '../calendar/calendarService';
import { getBreakEngine } from '../focus/breakEngine';
import { getFocusEngine } from '../focus/focusEngine';
import { getNotificationService } from '../notifications/notificationService';

export function applyAuthContextToRuntime(userId: string | null): void {
  getNotificationService().handleAuthContextChange(userId);
  getFocusEngine().setAuthContext(userId);
  getBreakEngine().setAuthContext(userId);
  getActivityTracker().applyAuthContext(userId);
  getCalendarService().handleAuthContextChange(userId);
}
