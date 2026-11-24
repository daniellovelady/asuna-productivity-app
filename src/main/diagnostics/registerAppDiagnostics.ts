import { app, powerMonitor } from 'electron';
import { diagLog } from './mainDiagnosticsLog';

type ChildProcessDetails = {
  type?: string;
  reason?: string;
  exitCode?: number;
  name?: string;
  serviceName?: string;
};

export function registerAppProcessDiagnostics(): void {
  app.on('child-process-gone', (_event, details: ChildProcessDetails) => {
    diagLog('child-process', 'child-process-gone', {
      type: details.type ?? 'unknown',
      reason: details.reason ?? 'unknown',
      exitCode: details.exitCode ?? -1,
      name: details.name ?? null,
      serviceName: details.serviceName ?? null,
    });
  });
}

export function registerPowerMonitorDiagnostics(): void {
  const bind = (eventName: string, logMessage: string) => {
    powerMonitor.on(eventName as Parameters<typeof powerMonitor.on>[0], () => {
      diagLog('power', logMessage);
    });
  };

  bind('suspend', 'suspend');
  bind('resume', 'resume');
  bind('lock-screen', 'lock-screen');
  bind('unlock-screen', 'unlock-screen');
  bind('on-ac', 'on-ac');
  bind('on-battery', 'on-battery');
}