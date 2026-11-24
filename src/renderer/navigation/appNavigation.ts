export type AppView = 'dashboard' | 'tasks' | 'agenda' | 'history' | 'insights' | 'settings';

export const NAV_ITEMS: Array<{ label: string; view: AppView }> = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Tasks', view: 'tasks' },
  { label: 'Calendar', view: 'agenda' },
  { label: 'History', view: 'history' },
  { label: 'Insights', view: 'insights' },
  { label: 'Settings', view: 'settings' },
];

export function isNavItemSelected(
  activeView: AppView,
  item: { label: string; view: AppView },
): boolean {
  return activeView === item.view;
}

export function showsDashboardOverview(activeView: AppView): boolean {
  return activeView === 'dashboard';
}
