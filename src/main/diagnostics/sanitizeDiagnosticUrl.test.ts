import { describe, expect, it } from 'vitest';
import { sanitizeDiagnosticUrl } from './sanitizeDiagnosticUrl';

describe('sanitizeDiagnosticUrl', () => {
  it('strips sensitive query parameters', () => {
    const sanitized = sanitizeDiagnosticUrl(
      'http://localhost:5174/?access_token=supersecret&view=calendar',
    );
    expect(sanitized).toContain('access_token=%5Bredacted%5D');
    expect(sanitized).not.toContain('supersecret');
  });

  it('returns origin and path without secrets', () => {
    expect(sanitizeDiagnosticUrl('http://127.0.0.1:5180/renderer/index.html')).toBe(
      'http://127.0.0.1:5180/renderer/index.html',
    );
  });
});