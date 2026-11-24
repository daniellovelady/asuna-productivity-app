import { describe, expect, it } from 'vitest';
import {
  applyNotificationCspToHtml,
  NOTIFICATION_CSP_DEVELOPMENT,
  NOTIFICATION_CSP_PRODUCTION,
  resolveNotificationCsp,
} from './notificationCsp';

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none';"
    />
  </head>
</html>`;

describe('notificationCsp', () => {
  it('keeps production CSP strict without unsafe-inline', () => {
    expect(resolveNotificationCsp(false)).toBe(NOTIFICATION_CSP_PRODUCTION);
    expect(NOTIFICATION_CSP_PRODUCTION).toContain("style-src 'self'");
    expect(NOTIFICATION_CSP_PRODUCTION).not.toContain('unsafe-inline');
  });

  it('allows Vite development inline style injection', () => {
    expect(resolveNotificationCsp(true)).toBe(NOTIFICATION_CSP_DEVELOPMENT);
    expect(NOTIFICATION_CSP_DEVELOPMENT).toContain("'unsafe-inline'");
    expect(NOTIFICATION_CSP_DEVELOPMENT).toContain("connect-src 'self'");
  });

  it('replaces the notification index CSP meta tag', () => {
    const productionHtml = applyNotificationCspToHtml(SAMPLE_HTML, false);
    expect(productionHtml).toContain(`content="${NOTIFICATION_CSP_PRODUCTION}"`);

    const developmentHtml = applyNotificationCspToHtml(SAMPLE_HTML, true);
    expect(developmentHtml).toContain(`content="${NOTIFICATION_CSP_DEVELOPMENT}"`);
  });
});
