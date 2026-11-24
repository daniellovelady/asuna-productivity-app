export const NOTIFICATION_CSP_PRODUCTION =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none';";

export const NOTIFICATION_CSP_DEVELOPMENT =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';";

export function resolveNotificationCsp(isDevelopment: boolean): string {
  return isDevelopment ? NOTIFICATION_CSP_DEVELOPMENT : NOTIFICATION_CSP_PRODUCTION;
}

export function applyNotificationCspToHtml(html: string, isDevelopment: boolean): string {
  const csp = resolveNotificationCsp(isDevelopment);
  return html.replace(
    /content="default-src 'none';[^"]*"/,
    `content="${csp}"`,
  );
}
