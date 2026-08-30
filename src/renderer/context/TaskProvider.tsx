import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  taskService,
  TaskConflictError,
  TaskServiceError,
} from '../services/taskService';
import type { CreateTaskInput, Task, UpdateTaskInput } from '../types/task';
import {
  filterActiveTasks,
  filterCompletedTasks,
  isActiveTask,
  pickDefaultActiveTaskId,
  resolveActiveSelection,
} from '../utils/taskFilters';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

type TaskContextValue = {
  tasks: Task[];
  activeTasks: Task[];
  completedTasks: Task[];
  selectedTask: Task | null;
  selectedTaskId: string | null;
  loadStatus: LoadStatus;
  loadError: string | null;
  mutationError: string | null;
  isMutating: boolean;
  selectTask: (id: string | null) => void;
  reloadTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, patch: UpdateTaskInput, expectedUpdatedAt: string) => Promise<void>;
  completeTask: (id: string, expectedUpdatedAt: string) => Promise<void>;
  deleteTask: (id: string, expectedUpdatedAt: string) => Promise<void>;
  clearMutationError: () => void;
};

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }): JSX.Element {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const activeTasks = useMemo(() => filterActiveTasks(tasks), [tasks]);
  const completedTasks = useMemo(() => filterCompletedTasks(tasks), [tasks]);

  const selectTask = useCallback((id: string | null) => {
    if (id === null) {
      setSelectedTaskId(null);
      return;
    }

    const task = tasks.find((entry) => entry.id === id);

    if (task && isActiveTask(task.status)) {
      setSelectedTaskId(id);
    }
  }, [tasks]);

  const reloadTasks = useCallback(async () => {
    if (!session) {
      setTasks([]);
      setSelectedTaskId(null);
      setLoadStatus('idle');
      setLoadError(null);
      return;
    }

    setLoadStatus('loading');
    setLoadError(null);

    try {
      const nextTasks = await taskService.listTasks();
      setTasks(nextTasks);
      setSelectedTaskId((current) => resolveActiveSelection(nextTasks, current));
      setLoadStatus('success');
    } catch (reloadError) {
      const message = reloadError instanceof TaskServiceError
        ? reloadError.message
        : 'Failed to load tasks.';
      setLoadError(message);
      setLoadStatus('error');
    }
  }, [session]);

  useEffect(() => {
    void reloadTasks();
  }, [reloadTasks]);

  const handleConflict = useCallback(async () => {
    setMutationError('This task was updated elsewhere. Reloading…');
    await reloadTasks();
  }, [reloadTasks]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    setIsMutating(true);
    setMutationError(null);

    try {
      const created = await taskService.createTask(input);
      setTasks((current) => [created, ...current]);
      setSelectedTaskId((current) => current ?? created.id);
    } catch (createError) {
      const message = createError instanceof TaskServiceError
        ? createError.message
        : 'Failed to create task.';
      setMutationError(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const updateTask = useCallback(async (
    id: string,
    patch: UpdateTaskInput,
    expectedUpdatedAt: string,
  ) => {
    setIsMutating(true);
    setMutationError(null);

    try {
      const updated = await taskService.updateTask(id, patch, expectedUpdatedAt);
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    } catch (updateError) {
      if (updateError instanceof TaskConflictError) {
        await handleConflict();
      } else {
        const message = updateError instanceof TaskServiceError
          ? updateError.message
          : 'Failed to update task.';
        setMutationError(message);
      }
    } finally {
      setIsMutating(false);
    }
  }, [handleConflict]);

  const completeTask = useCallback(async (id: string, expectedUpdatedAt: string) => {
    setIsMutating(true);
    setMutationError(null);

    try {
      const completed = await taskService.completeTask(id, expectedUpdatedAt);
      setTasks((current) => {
        const nextTasks = current.map((task) => (task.id === id ? completed : task));
        setSelectedTaskId((selected) => (
          selected === id ? pickDefaultActiveTaskId(nextTasks) : selected
        ));
        return nextTasks;
      });
    } catch (completeError) {
      if (completeError instanceof TaskConflictError) {
        await handleConflict();
      } else {
        const message = completeError instanceof TaskServiceError
          ? completeError.message
          : 'Failed to complete task.';
        setMutationError(message);
      }
    } finally {
      setIsMutating(false);
    }
  }, [handleConflict]);

  const deleteTask = useCallback(async (id: string, expectedUpdatedAt: string) => {
    setIsMutating(true);
    setMutationError(null);

    try {
      await taskService.deleteTask(id, expectedUpdatedAt);
      setTasks((current) => {
        const nextTasks = current.filter((task) => task.id !== id);
        setSelectedTaskId((selected) => (
          selected !== id ? selected : pickDefaultActiveTaskId(nextTasks)
        ));
        return nextTasks;
      });
    } catch (deleteError) {
      if (deleteError instanceof TaskConflictError) {
        await handleConflict();
      } else {
        const message = deleteError instanceof TaskServiceError
          ? deleteError.message
          : 'Failed to delete task.';
        setMutationError(message);
      }
    } finally {
      setIsMutating(false);
    }
  }, [handleConflict]);

  const selectedTask = useMemo(() => {
    const task = tasks.find((entry) => entry.id === selectedTaskId);
    return task && isActiveTask(task.status) ? task : null;
  }, [tasks, selectedTaskId]);

  const value = useMemo<TaskContextValue>(
    () => ({
      tasks,
      activeTasks,
      completedTasks,
      selectedTask,
      selectedTaskId,
      loadStatus,
      loadError,
      mutationError,
      isMutating,
      selectTask,
      reloadTasks,
      createTask,
      updateTask,
      completeTask,
      deleteTask,
      clearMutationError: () => setMutationError(null),
    }),
    [
      tasks,
      activeTasks,
      completedTasks,
      selectedTask,
      selectedTaskId,
      loadStatus,
      loadError,
      mutationError,
      isMutating,
      selectTask,
      reloadTasks,
      createTask,
      updateTask,
      completeTask,
      deleteTask,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext(): TaskContextValue {
  const context = useContext(TaskContext);

  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider.');
  }

  return context;
}
