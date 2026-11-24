import { describe, expect, it, vi } from 'vitest';
import {
  calendarToolbarChangeView,
  calendarToolbarNext,
  calendarToolbarPrevious,
  calendarToolbarToday,
} from './calendarWorkspaceToolbar';

describe('calendarToolbar', () => {
  it('Today switches to month then navigates to current date', () => {
    const api = {
      prev: vi.fn(),
      next: vi.fn(),
      today: vi.fn(),
      changeView: vi.fn(),
      gotoDate: vi.fn(),
      view: { type: 'timeGridWeek', title: '', currentStart: new Date('2026-01-01') },
    };

    calendarToolbarToday(api);
    expect(api.changeView).toHaveBeenCalledWith('dayGridMonth');
    expect(api.today).toHaveBeenCalled();
  });

  it('prev/next delegate to FullCalendar api', () => {
    const api = {
      prev: vi.fn(),
      next: vi.fn(),
      today: vi.fn(),
      changeView: vi.fn(),
      gotoDate: vi.fn(),
      view: { type: 'dayGridMonth', title: '', currentStart: new Date('2026-01-01') },
    };

    calendarToolbarPrevious(api);
    calendarToolbarNext(api);
    expect(api.prev).toHaveBeenCalled();
    expect(api.next).toHaveBeenCalled();
  });

  it('changeView delegates to api', () => {
    const api = {
      prev: vi.fn(),
      next: vi.fn(),
      today: vi.fn(),
      changeView: vi.fn(),
      gotoDate: vi.fn(),
      view: { type: 'dayGridMonth', title: '', currentStart: new Date('2026-01-01') },
    };

    calendarToolbarChangeView(api, 'multiMonthYear');
    expect(api.changeView).toHaveBeenCalledWith('multiMonthYear');
  });
});