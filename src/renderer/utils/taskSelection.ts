export function resolveTaskSelectionToggle(
  currentSelectedId: string | null,
  clickedTaskId: string,
): string | null {
  if (currentSelectedId === clickedTaskId) {
    return null;
  }
  return clickedTaskId;
}
