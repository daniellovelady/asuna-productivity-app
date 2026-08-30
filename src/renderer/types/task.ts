export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

export type TaskPriority = 'low' | 'medium' | 'high';

export const TASK_PRIORITY_OPTIONS: readonly TaskPriority[] = ['low', 'medium', 'high'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
}
