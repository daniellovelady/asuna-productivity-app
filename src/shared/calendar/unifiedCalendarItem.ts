import { scheduleBlockIntersectsRange } from '../scheduling/rangeQuery';
import type { ScheduleBlock } from '../scheduling/types';
import type { CalendarEvent } from './types';

export type UnifiedCalendarSource = 'asuna_schedule_block' | 'google_calendar';

export interface UnifiedCalendarCapabilities {
  canEdit: boolean;
  canDrag: boolean;
  canResize: boolean;
}

export const READ_ONLY_CALENDAR_CAPABILITIES: UnifiedCalendarCapabilities = {
  canEdit: false,
  canDrag: false,
  canResize: false,
};

export interface UnifiedCalendarItemBase {
  id: string;
  source: UnifiedCalendarSource;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  capabilities: UnifiedCalendarCapabilities;
}

export interface AsunaScheduleBlockItem extends UnifiedCalendarItemBase {
  source: 'asuna_schedule_block';
  scheduleBlockId: string;
  taskId: string | null;
  taskTitleSnapshot: string;
  timezone: string;
}

export interface GoogleEventItem extends UnifiedCalendarItemBase {
  source: 'google_calendar';
  calendarId: string;
  externalEventId: string;
  calendarName: string;
  location: string | null;
  linkedTaskId: string | null;
  mirrorScheduleBlockId: string | null;
}

export type UnifiedCalendarItem = AsunaScheduleBlockItem | GoogleEventItem;

export type SourceVisibilityState = {
  showAsunaBlocks: boolean;
  showGoogleCalendars: boolean;
  hiddenGoogleCalendarIds: ReadonlySet<string>;
};

export function mapScheduleBlockToUnifiedItem(block: ScheduleBlock): AsunaScheduleBlockItem {
  return {
    id: `asuna:block:${block.id}`,
    source: 'asuna_schedule_block',
    title: block.taskTitleSnapshot,
    start: block.scheduledStartAt,
    end: block.scheduledEndAt,
    allDay: false,
    capabilities: { ...READ_ONLY_CALENDAR_CAPABILITIES },
    scheduleBlockId: block.id,
    taskId: block.taskId,
    taskTitleSnapshot: block.taskTitleSnapshot,
    timezone: block.timezone,
  };
}

export function mapGoogleEventToUnifiedItem(event: CalendarEvent): GoogleEventItem {
  return {
    id: `google:${event.calendarId}:${event.externalEventId}`,
    source: 'google_calendar',
    title: event.title,
    start: event.allDay ? event.startAt : event.startAt,
    end: event.allDay ? event.endAt : event.endAt,
    allDay: event.allDay,
    capabilities: { ...READ_ONLY_CALENDAR_CAPABILITIES },
    calendarId: event.calendarId,
    externalEventId: event.externalEventId,
    calendarName: event.calendarName,
    location: event.location,
    linkedTaskId: event.linkedTaskId,
    mirrorScheduleBlockId: event.mirrorScheduleBlockId,
  };
}

export function buildUnifiedCalendarFeed(input: {
  scheduleBlocks: readonly ScheduleBlock[];
  googleEvents: readonly CalendarEvent[];
  visibility: SourceVisibilityState;
  rangeStart: string;
  rangeEnd: string;
}): UnifiedCalendarItem[] {
  const scheduledBlocks = input.scheduleBlocks.filter((block) => block.status === 'scheduled');
  const blockIds = new Set(scheduledBlocks.map((block) => block.id));

  const items: UnifiedCalendarItem[] = [];

  if (input.visibility.showAsunaBlocks) {
    for (const block of scheduledBlocks) {
      if (!scheduleBlockIntersectsRange(block, input.rangeStart, input.rangeEnd)) {
        continue;
      }
      items.push(mapScheduleBlockToUnifiedItem(block));
    }
  }

  if (input.visibility.showGoogleCalendars) {
    for (const event of input.googleEvents) {
      if (event.status === 'cancelled') {
        continue;
      }

      if (input.visibility.hiddenGoogleCalendarIds.has(event.calendarId)) {
        continue;
      }

      const mirrorId = event.mirrorScheduleBlockId;
      if (mirrorId && blockIds.has(mirrorId)) {
        continue;
      }

      if (
        !scheduleBlockIntersectsRange(
          { scheduledStartAt: event.startAt, scheduledEndAt: event.endAt },
          input.rangeStart,
          input.rangeEnd,
        )
      ) {
        continue;
      }

      items.push(mapGoogleEventToUnifiedItem(event));
    }
  }

  return items.sort((a, b) => a.start.localeCompare(b.start));
}