import { useTaskContext } from '../context/TaskProvider';

export function useTasks() {
  return useTaskContext();
}
