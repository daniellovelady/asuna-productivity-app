type FocusSessionFlushHandler = () => Promise<void>;

let flushHandler: FocusSessionFlushHandler | null = null;

export function registerFocusSessionFlushHandler(
  handler: FocusSessionFlushHandler | null,
): void {
  flushHandler = handler;
}

export async function finalizeFocusSessionsBeforeAuthChange(): Promise<void> {
  if (flushHandler === null) {
    return;
  }

  await flushHandler();
}
