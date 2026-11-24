export type FocusContextType = 'none' | 'task' | 'calendar_event';

/** Documents expected RPC outcomes per context (authoritative logic is in Postgres). */
export function describeAttributionOutcome(contextType: FocusContextType): {
  mayChangeContextType: boolean;
  nextContextType: FocusContextType;
  updatesTaskSnapshots: boolean;
  preservesCalendarFields: boolean;
} {
  if (contextType === 'none') {
    return {
      mayChangeContextType: true,
      nextContextType: 'task',
      updatesTaskSnapshots: true,
      preservesCalendarFields: true,
    };
  }

  if (contextType === 'task') {
    return {
      mayChangeContextType: false,
      nextContextType: 'task',
      updatesTaskSnapshots: true,
      preservesCalendarFields: true,
    };
  }

  return {
    mayChangeContextType: false,
    nextContextType: 'calendar_event',
    updatesTaskSnapshots: true,
    preservesCalendarFields: true,
  };
}
