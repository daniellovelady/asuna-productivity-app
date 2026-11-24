import { describe, expect, it } from 'vitest';
import { sanitizeDiagnosticMessage, sanitizeDiagnosticFilename } from './rendererBoot';

describe('rendererBoot sanitization', () => {
  it('redacts sensitive messages', () => {
    expect(sanitizeDiagnosticMessage('access_token=abc123')).toBe('[redacted]');
  });

  it('strips query strings from filenames', () => {
    expect(
      sanitizeDiagnosticFilename('http://localhost:5173/src/App.tsx?import'),
    ).toContain('/src/App.tsx');
    expect(
      sanitizeDiagnosticFilename('http://localhost:5173/src/App.tsx?import'),
    ).not.toContain('import');
  });
});