import type { Task, TaskStatus } from '../types/task';

export function isActiveTask(status: TaskStatus): boolean {
  return status === 'pending' || status === 'in_progress';
}

export function isCompletedTask(status: TaskStatus): boolean {
  return status === 'completed';
}

export function compareCompletedAtDesc(
  leftCompletedAt: string | null,
  rightCompletedAt: string | null,
): number {
  if (leftCompletedAt === null && rightCompletedAt === null) {
    return 0;
  }

  if (leftCompletedAt === null) {
    return 1;
  }

  if (rightCompletedAt === null) {
    return -1;
  }

  return new Date(rightCompletedAt).getTime() - new Date(leftCompletedAt).getTime();
}

export function filterActiveTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => isActiveTask(task.status))
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function filterCompletedTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => isCompletedTask(task.status))
    .slice()
    .sort((left, right) => compareCompletedAtDesc(left.completedAt, right.completedAt));
}

export function pickDefaultActiveTaskId(tasks: Task[]): string | null {
  const activeTask = filterActiveTasks(tasks)[0];
  return activeTask?.id ?? null;
}

export function resolveActiveSelection(tasks: Task[], selectedId: string | null): string | null {
  if (selectedId) {
    const selectedTask = tasks.find((task) => task.id === selectedId);

    if (selectedTask && isActiveTask(selectedTask.status)) {
      return selectedId;
    }
  }

  return pickDefaultActiveTaskId(tasks);
}
