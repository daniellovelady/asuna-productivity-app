import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { logCalendarMemoryCounters } from '../diagnostics/calendarMemoryDiag';
import { shouldReplaceVisibleRange, visibleRangeKey } from './calendarVisibleRange';
import { buildUnifiedCalendarFeed, type SourceVisibilityState } from '../../shared/calendar/unifiedCalendarItem';
import type { CalendarEvent, CalendarListEntry } from '../../shared/calendar/types';
import type { ScheduleBlock } from '../../shared/scheduling/types';
import { calendarBridgeService } from '../services/calendarBridgeService';
import { resolveAuthContextTimeZone } from '../services/authContextTimeZone';
import { createScheduleBlockService } from '../services/scheduleBlockService';
import { supabase } from '../services/supabaseClient';
import { useAgenda } from './useAgenda';
import { useAuth } from './useAuth';

const scheduleBlockService = createScheduleBlockService(supabase);

export type VisibleRange = {
  rangeStart: string;
  rangeEnd: string;
};

export function useCalendarWorkspace() {
  const agenda = useAgenda();
  const { user, authContextReady } = useAuth();
  const [timeZone, setTimeZone] = useState('UTC');
  const [timeZoneReady, setTimeZoneReady] = useState(false);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [calendarList, setCalendarList] = useState<CalendarListEntry[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const lastRangeKey = useRef<string | null>(null);

  const [visibility, setVisibility] = useState<SourceVisibilityState>({
    showAsunaBlocks: true,
    showGoogleCalendars: true,
    hiddenGoogleCalendarIds: new Set<string>(),
  });

  useEffect(() => {
    if (!authContextReady) {
      setTimeZoneReady(false);
      return;
    }

    setTimeZoneReady(false);
    void resolveAuthContextTimeZone(user?.id ?? null).then((resolved) => {
      setTimeZone(resolved);
      setTimeZoneReady(true);
      if (import.meta.env.DEV) {
        console.info('[calendar-timezone]', {
          boundary: 'useCalendarWorkspace',
          profileTimeZone: resolved,
          userId: user?.id ?? null,
        });
      }
    });
  }, [authContextReady, user?.id]);

  const loadRange = useCallback(async (range: VisibleRange) => {
    const key = visibleRangeKey(range);
    if (lastRangeKey.current === key) {
      return;
    }
    lastRangeKey.current = key;

    setGoogleLoading(true);
    setBlocksLoading(true);

    void window.diagnosticsApi?.reportRendererMemoryDetail?.('range-fetch-before');

    try {
      const [feed, blocks] = await Promise.all([
        calendarBridgeService.getWorkspaceFeed(range.rangeStart, range.rangeEnd),
        scheduleBlockService.listScheduleBlocks({
          rangeStart: range.rangeStart,
          rangeEnd: range.rangeEnd,
          includeCancelled: false,
        }),
      ]);

      setGoogleEvents(feed.events);
      setCalendarList(feed.calendarList);
      setScheduleBlocks(blocks);

      logCalendarMemoryCounters({
        reason: 'schedule-block-range-fetch-complete',
        visibleStart: range.rangeStart,
        visibleEnd: range.rangeEnd,
        scheduleBlockCount: blocks.length,
        googleEventCount: feed.events.length,
      });
      void window.diagnosticsApi?.reportRendererMemoryDetail?.('range-fetch-after');
    } finally {
      setGoogleLoading(false);
      setBlocksLoading(false);
    }
  }, []);

  const setVisibleRangeStable = useCallback((update: SetStateAction<VisibleRange | null>) => {
    setVisibleRange((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      if (next === null) {
        return null;
      }
      if (!shouldReplaceVisibleRange(current, next)) {
        return current;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    void loadRange(visibleRange);
  }, [loadRange, visibleRange]);

  const unifiedItems = useMemo(() => {
    if (!visibleRange) {
      return [];
    }

    return buildUnifiedCalendarFeed({
      scheduleBlocks,
      googleEvents,
      visibility,
      rangeStart: visibleRange.rangeStart,
      rangeEnd: visibleRange.rangeEnd,
    });
  }, [googleEvents, scheduleBlocks, visibility, visibleRange]);

  return {
    agenda,
    timeZone,
    timeZoneReady,
    setVisibleRange: setVisibleRangeStable,
    unifiedItems,
    scheduleBlocks,
    googleEvents,
    calendarList,
    visibility,
    setVisibility,
    blocksLoading,
    googleLoading,
    reloadRange: () => {
      lastRangeKey.current = null;
      if (visibleRange) {
        void loadRange(visibleRange);
      }
    },
  };
}