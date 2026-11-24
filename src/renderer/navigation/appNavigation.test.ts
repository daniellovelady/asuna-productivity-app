import { describe, expect, it } from 'vitest';
import {
  NAV_ITEMS,
  type AppView,
  isNavItemSelected,
  showsDashboardOverview,
} from './appNavigation';

const APP_VIEWS: AppView[] = ['dashboard', 'tasks', 'agenda', 'history', 'insights', 'settings'];

describe('appNavigation', () => {
  it('maps Dashboard to the dashboard view', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'Dashboard')?.view).toBe('dashboard');
  });

  it('maps Tasks to the tasks view', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'Tasks')?.view).toBe('tasks');
  });

  it('maps Calendar to the agenda route id', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'Calendar')?.view).toBe('agenda');
  });

  it('maps History to the history view', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'History')?.view).toBe('history');
  });

  it('maps Insights to the insights view', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'Insights')?.view).toBe('insights');
  });

  it('maps Settings to the settings view', () => {
    expect(NAV_ITEMS.find((item) => item.label === 'Settings')?.view).toBe('settings');
  });

  it('selects exactly one sidebar item per view', () => {
    for (const view of APP_VIEWS) {
      const selected = NAV_ITEMS.filter((item) => isNavItemSelected(view, item));
      expect(selected).toHaveLength(1);
    }
  });

  it('shows dashboard overview only on the dashboard view', () => {
    expect(showsDashboardOverview('dashboard')).toBe(true);
    expect(showsDashboardOverview('tasks')).toBe(false);
    expect(showsDashboardOverview('history')).toBe(false);
    expect(showsDashboardOverview('insights')).toBe(false);
    expect(showsDashboardOverview('settings')).toBe(false);
  });

  it('does not show dashboard overview cards on the tasks page', () => {
    expect(showsDashboardOverview('tasks')).toBe(false);
  });

  it('does not show dashboard overview cards on the history page', () => {
    expect(showsDashboardOverview('history')).toBe(false);
  });
});
