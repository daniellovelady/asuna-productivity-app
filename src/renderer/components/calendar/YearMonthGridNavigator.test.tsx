/**
 * @vitest-environment happy-dom
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YearMonthGridNavigator } from './YearMonthGridNavigator';
import { MONTH_LABELS } from './calendarNavigatorLogic';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('YearMonthGridNavigator', () => {
  it('renders all twelve months and year controls', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(createElement(YearMonthGridNavigator, {
      displayYear: 2026,
      focusDateIso: '2026-10-12',
      onYearChange: vi.fn(),
      onSelectMonth: vi.fn(),
      onBackToMiniMonth: vi.fn(),
    }));

    const buttons = container.querySelectorAll('.calendar-year-month-grid__months button');
    expect(buttons).toHaveLength(12);
    expect(buttons[9]?.textContent).toContain(MONTH_LABELS[9]);
    expect(container.textContent).toContain('2026');
  });
});