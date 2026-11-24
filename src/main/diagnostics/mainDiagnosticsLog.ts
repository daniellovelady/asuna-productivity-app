import { app } from 'electron';

export function shouldLogMainDiagnostics(): boolean {
  return !app.isPackaged || process.env.ASUNA_MAIN_DIAGNOSTICS === '1';
}

export function formatDiagnosticFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${formatDiagnosticValue(value)}`)
    .join(' ');
}

function formatDiagnosticValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function diagLog(tag: string, message: string, fields: Record<string, unknown> = {}): void {
  if (!shouldLogMainDiagnostics()) {
    return;
  }

  const suffix = Object.keys(fields).length > 0 ? ` ${formatDiagnosticFields(fields)}` : '';
  console.info(`[${tag}] ${message}${suffix}`);
}