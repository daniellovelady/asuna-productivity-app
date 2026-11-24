import { createContext, useContext, type ReactNode } from 'react';
import type { UnifiedCalendarItem } from '../../../shared/calendar/unifiedCalendarItem';

const UnifiedCalendarItemsContext = createContext<ReadonlyMap<string, UnifiedCalendarItem>>(
  new Map(),
);

export function UnifiedCalendarItemsProvider({
  itemsById,
  children,
}: {
  itemsById: ReadonlyMap<string, UnifiedCalendarItem>;
  children: ReactNode;
}): JSX.Element {
  return (
    <UnifiedCalendarItemsContext.Provider value={itemsById}>
      {children}
    </UnifiedCalendarItemsContext.Provider>
  );
}

export function useUnifiedCalendarItem(id: string | undefined): UnifiedCalendarItem | undefined {
  const map = useContext(UnifiedCalendarItemsContext);
  if (!id) {
    return undefined;
  }
  return map.get(id);
}