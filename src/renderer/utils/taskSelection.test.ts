import { describe, expect, it } from 'vitest';
import { resolveTaskSelectionToggle } from './taskSelection';

describe('resolveTaskSelectionToggle', () => {
  it('deselects when clicking the currently selected task', () => {
    expect(resolveTaskSelectionToggle('task-a', 'task-a')).toBeNull();
  });

  it('selects a different task', () => {
    expect(resolveTaskSelectionToggle('task-a', 'task-b')).toBe('task-b');
  });

  it('selects when nothing was selected', () => {
    expect(resolveTaskSelectionToggle(null, 'task-a')).toBe('task-a');
  });
});
