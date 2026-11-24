export function logDashboardNavigation(activeView: string): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info('[dashboard-lifecycle] view=', activeView);
  void window.diagnosticsApi?.reportRendererMemoryDetail?.(`dashboard-view:${activeView}`);
}