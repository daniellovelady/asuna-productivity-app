import { describe, expect, it } from 'vitest';

describe('focus start intent after task deselection', () => {
  it('starts with no task context when selection is null', () => {
    const selectedTaskId: string | null = null;
    const selectedTaskTitle: string | null = null;

    const startPayload = selectedTaskId && selectedTaskTitle
      ? { taskId: selectedTaskId, titleSnapshot: selectedTaskTitle }
      : undefined;

    expect(startPayload).toBeUndefined();
  });

  it('starts with task context when a task is selected', () => {
    const selectedTaskId = 'task-1';
    const selectedTaskTitle = 'Finish Lab 4';

    const startPayload = selectedTaskId && selectedTaskTitle
      ? { taskId: selectedTaskId, titleSnapshot: selectedTaskTitle }
      : undefined;

    expect(startPayload).toEqual({
      taskId: 'task-1',
      titleSnapshot: 'Finish Lab 4',
    });
  });
});
