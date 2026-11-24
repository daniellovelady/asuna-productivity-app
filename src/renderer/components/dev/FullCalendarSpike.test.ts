/**
 * @vitest-environment happy-dom
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { FullCalendarSpike } from './FullCalendarSpike';

describe('FullCalendarSpike', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  it('mounts spike UI and static event titles in happy-dom', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(FullCalendarSpike));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    const text = container.textContent ?? '';
    expect(text).toContain('FullCalendar Phase 0A spike');
    expect(text).toContain('Project Work');
    expect(text).toContain('Networking Lab');
    expect(text).toContain('Study Session');
    expect(container.querySelector('[data-testid="fullcalendar-spike"]')).toBeTruthy();
  });
});