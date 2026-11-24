const SENSITIVE_QUERY_KEY_PATTERN = /(token|secret|password|code|auth|session|refresh|key)/i;

export function sanitizeDiagnosticUrl(url: string): string {
  if (!url || url.trim().length === 0) {
    return '';
  }

  try {
    const parsed = new URL(url);

    for (const [key, value] of [...parsed.searchParams.entries()]) {
      if (SENSITIVE_QUERY_KEY_PATTERN.test(key) || value.length > 80) {
        parsed.searchParams.set(key, '[redacted]');
      }
    }

    const pathname = parsed.pathname || '/';
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return '[invalid-url]';
  }
}