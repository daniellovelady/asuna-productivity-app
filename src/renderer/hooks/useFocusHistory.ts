import { useFocusHistoryContext } from '../context/FocusHistoryProvider';

export function useFocusHistory() {
  return useFocusHistoryContext();
}
