import { describe, expect, it, vi } from 'vitest';
import {
  calendarToolbarChangeViewFromYear,
  resolveYearViewChangeTargetDate,
} from './yearViewNavigation';

const REFERENCE_NOW_MS = Date.parse('2026-11-23T18:00:00.000Z');
const TIME_ZONE = 'America/Chicago';

function makeApi(currentStart: Date) {
  return {
    prev: vi.fn(),
    next: vi.fn(),
    today: vi.fn(),
    changeView: vi.fn(),
    gotoDate: vi.fn(),
    view: { type: 'multiMonthYear', title: '2026', currentStart },
  };
}

describe('resolveYearViewChangeTargetDate', () => {
  it('uses today when viewed year is current year', () => {
    expect(resolveYearViewChangeTargetDate(2026, 2026, '2026-11-23')).toBe('2026-11-23');
  });

  it('uses January 1 for non-current years', () => {
    expect(resolveYearViewChangeTargetDate(2025, 2026, '2026-11-23')).toBe('2025-01-01');
    expect(resolveYearViewChangeTargetDate(2027, 2026, '2026-11-23')).toBe('2027-01-01');
  });
});

describe('calendarToolbarChangeViewFromYear', () => {
  it('Year 2026 → Month opens current month', () => {
    const api = makeApi(new Date('2026-06-01T12:00:00.000Z'));
    calendarToolbarChangeViewFromYear(api, 'dayGridMonth', TIME_ZONE, REFERENCE_NOW_MS);
    expect(api.changeView).toHaveBeenCalledWith('dayGridMonth', '2026-11-23');
  });

  it('Year 2026 → Week opens current week', () => {
    const api = makeApi(new Date('2026-06-01T12:00:00.000Z'));
    calendarToolbarChangeViewFromYear(api, 'timeGridWeek', TIME_ZONE, REFERENCE_NOW_MS);
    expect(api.changeView).toHaveBeenCalledWith('timeGridWeek', '2026-11-23');
  });

  it('Year 2026 → Day opens today', () => {
    const api = makeApi(new Date('2026-06-01T12:00:00.000Z'));
    calendarToolbarChangeViewFromYear(api, 'timeGridDay', TIME_ZONE, REFERENCE_NOW_MS);
    expect(api.changeView).toHaveBeenCalledWith('timeGridDay', '2026-11-23');
  });

  it('Year 2025 → Month opens January 2025', () => {
    const api = makeApi(new Date('2025-06-01T12:00:00.000Z'));
    calendarToolbarChangeViewFromYear(api, 'dayGridMonth', TIME_ZONE, REFERENCE_NOW_MS);
    expect(api.changeView).toHaveBeenCalledWith('dayGridMonth', '2025-01-01');
  });

  it('returning to current year → Week lands on current week, not January', () => {
    const api2026 = makeApi(new Date('2026-03-01T12:00:00.000Z'));
    calendarToolbarChangeViewFromYear(api2026, 'timeGridWeek', TIME_ZONE, REFERENCE_NOW_MS);
    expect(api2026.changeView).toHaveBeenCalledWith('timeGridWeek', '2026-11-23');
  });
});