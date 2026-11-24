import { describe, expect, it, vi } from 'vitest';
import {
  spikeToolbarChangeView,
  spikeToolbarNext,
  spikeToolbarPrevious,
  spikeToolbarToday,
} from './fullCalendarSpikeToolbar';

function createMockApi() {
  return {
    prev: vi.fn(),
    next: vi.fn(),
    today: vi.fn(),
    changeView: vi.fn(),
  };
}

describe('fullCalendarSpikeToolbar', () => {
  it('previous calls api.prev() for view-aware navigation', () => {
    const api = createMockApi();
    spikeToolbarPrevious(api);
    expect(api.prev).toHaveBeenCalledOnce();
    expect(api.next).not.toHaveBeenCalled();
  });

  it('next calls api.next() for view-aware navigation', () => {
    const api = createMockApi();
    spikeToolbarNext(api);
    expect(api.next).toHaveBeenCalledOnce();
    expect(api.prev).not.toHaveBeenCalled();
  });

  it('today switches to dayGridMonth then api.today()', () => {
    const api = createMockApi();
    spikeToolbarToday(api);
    expect(api.changeView).toHaveBeenCalledWith('dayGridMonth');
    expect(api.today).toHaveBeenCalledOnce();
    expect(api.changeView.mock.invocationCallOrder[0]).toBeLessThan(
      api.today.mock.invocationCallOrder[0],
    );
  });

  it('changeView delegates to the calendar API', () => {
    const api = createMockApi();
    spikeToolbarChangeView(api, 'timeGridWeek');
    expect(api.changeView).toHaveBeenCalledWith('timeGridWeek');
  });
});