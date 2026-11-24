import { describe, expect, it, vi } from 'vitest';
import { buildMonthSelectionCommand } from './calendarNavigatorLogic';

describe('main calendar month selection contract', () => {
  it('applying March 2027 uses Month view and gotoDate', () => {
    const command = buildMonthSelectionCommand(2027, 3);
    const api = {
      changeView: vi.fn(),
      gotoDate: vi.fn(),
    };

    api.changeView(command.view);
    api.gotoDate(command.gotoDate);

    expect(api.changeView).toHaveBeenCalledWith('dayGridMonth');
    expect(api.gotoDate).toHaveBeenCalledWith('2027-03-01');
  });
});