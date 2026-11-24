import { useEffect, useState } from 'react';
import {
  buildMonthSelectionCommand,
  resolveNavigatorYear,
} from './calendarNavigatorLogic';
import { MiniMonthNavigator } from './MiniMonthNavigator';
import { YearMonthGridNavigator } from './YearMonthGridNavigator';

export type CalendarNavigatorMode = 'mini-month' | 'year-month-grid';

type CalendarNavigatorProps = {
  timeZone: string;
  focusDateIso: string;
  onSelectDate: (dateIso: string) => void;
  onSelectMonth: (command: ReturnType<typeof buildMonthSelectionCommand>) => void;
};

export function CalendarNavigator({
  timeZone,
  focusDateIso,
  onSelectDate,
  onSelectMonth,
}: CalendarNavigatorProps): JSX.Element {
  const [mode, setMode] = useState<CalendarNavigatorMode>('mini-month');
  const [displayYear, setDisplayYear] = useState(() =>
    resolveNavigatorYear(focusDateIso, new Date().getFullYear()),
  );

  useEffect(() => {
    if (mode === 'year-month-grid') {
      setDisplayYear(resolveNavigatorYear(focusDateIso, new Date().getFullYear()));
    }
  }, [focusDateIso, mode]);

  const openYearMonthGrid = () => {
    setDisplayYear(resolveNavigatorYear(focusDateIso, displayYear));
    setMode('year-month-grid');
  };

  if (mode === 'year-month-grid') {
    return (
      <YearMonthGridNavigator
        displayYear={displayYear}
        focusDateIso={focusDateIso}
        onYearChange={setDisplayYear}
        onSelectMonth={(command) => {
          onSelectMonth(command);
          setMode('mini-month');
        }}
        onBackToMiniMonth={() => setMode('mini-month')}
      />
    );
  }

  return (
    <MiniMonthNavigator
      timeZone={timeZone}
      focusDateIso={focusDateIso}
      selectedDate={focusDateIso}
      onSelectDate={onSelectDate}
      onOpenYearMonthGrid={openYearMonthGrid}
    />
  );
}