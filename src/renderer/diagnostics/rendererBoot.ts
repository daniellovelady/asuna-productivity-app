declare global {
  interface Window {
    __ASUNA_RENDERER_BOOT_STAGE__?: string;
    __ASUNA_RENDERER_BOOT_LOGGED__?: Record<string, boolean>;
  }
}

const SENSITIVE_PATTERN = /(token|secret|password|bearer|supabase|api[_-]?key|refresh)/i;

export function setRendererBootStage(stage: string): void {
  if (typeof window !== 'undefined') {
    window.__ASUNA_RENDERER_BOOT_STAGE__ = stage;
  }
}

export function rendererBootLog(stage: string): void {
  if (!import.meta.env.DEV) {
    setRendererBootStage(stage);
    return;
  }

  setRendererBootStage(stage);
  const logged = window.__ASUNA_RENDERER_BOOT_LOGGED__ ?? {};
  if (logged[stage]) {
    return;
  }
  window.__ASUNA_RENDERER_BOOT_LOGGED__ = { ...logged, [stage]: true };
  console.info(`[renderer-boot] ${stage}`);
}

export function sanitizeDiagnosticFilename(filename: string | undefined): string {
  if (!filename) {
    return '';
  }

  try {
    const url = new URL(filename, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return filename.split('?')[0] ?? '';
  }
}

export function sanitizeDiagnosticMessage(message: string): string {
  if (SENSITIVE_PATTERN.test(message)) {
    return '[redacted]';
  }
  return message.slice(0, 500);
}

export function sanitizeDiagnosticStack(stack: string | undefined): string | null {
  if (!stack) {
    return null;
  }

  const lines = stack
    .split('\n')
    .slice(0, 12)
    .map((line) => sanitizeDiagnosticFilename(line) || line);

  return lines.join('\n');
}

export function installRendererGlobalErrorHandlers(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  window.addEventListener('error', (event) => {
    console.error(
      '[renderer-error] window-error',
      sanitizeDiagnosticMessage(event.message),
      sanitizeDiagnosticFilename(event.filename),
      event.lineno,
      event.colno,
      event.error?.name ?? 'Error',
      sanitizeDiagnosticStack(event.error?.stack),
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const name = reason instanceof Error ? reason.name : 'UnhandledRejection';
    const stack = reason instanceof Error ? reason.stack : undefined;

    console.error(
      '[renderer-error] unhandled-rejection',
      name,
      sanitizeDiagnosticMessage(message),
      sanitizeDiagnosticStack(stack),
    );
  });
}