export function logCalendarLifecycle(stage: string): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(`[calendar-lifecycle] ${stage}`);
  void window.diagnosticsApi?.reportCalendarLifecycle?.(stage);
  void window.diagnosticsApi?.reportRendererMemoryDetail?.(`calendar-lifecycle:${stage}`);
}