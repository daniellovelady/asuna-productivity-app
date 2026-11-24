import type { DatesSetArg } from '@fullcalendar/react';

export type CalendarMemoryCounterPayload = {
  reason: string;
  view?: string;
  visibleStart?: string;
  visibleEnd?: string;
  unifiedItemCount?: number;
  scheduleBlockCount?: number;
  googleEventCount?: number;
  fullCalendarEventCount?: number;
  googleCacheEventCount?: number;
  rangeCoverageCount?: number;
  domNodeCount?: number;
};

export function countDomNodes(): number | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  try {
    return document.querySelectorAll('*').length;
  } catch {
    return undefined;
  }
}

export function logCalendarMemoryCounters(payload: CalendarMemoryCounterPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const domNodeCount = payload.domNodeCount ?? countDomNodes();
  console.info('[calendar-memory]', { ...payload, domNodeCount });

  const api = window.diagnosticsApi;
  if (api?.reportCalendarMemory) {
    void api.reportCalendarMemory({ ...payload, domNodeCount });
  }
}

export function formatDatesSetRange(arg: DatesSetArg): {
  view: string;
  visibleStart: string;
  visibleEnd: string;
} {
  return {
    view: arg.view.type,
    visibleStart: arg.start.toISOString(),
    visibleEnd: arg.end.toISOString(),
  };
}