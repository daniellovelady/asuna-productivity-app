import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatDiagnosticFields, shouldLogMainDiagnostics } from './mainDiagnosticsLog';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}));

describe('mainDiagnosticsLog', () => {
  afterEach(() => {
    delete process.env.ASUNA_MAIN_DIAGNOSTICS;
  });

  it('enables diagnostics logging in development', () => {
    expect(shouldLogMainDiagnostics()).toBe(true);
  });

  it('formats diagnostic fields for structured logs', () => {
    expect(formatDiagnosticFields({ reason: 'crashed', exitCode: 1 })).toBe(
      'reason="crashed" exitCode=1',
    );
  });
});