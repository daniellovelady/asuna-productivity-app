import { powerMonitor } from 'electron';

export type SystemSuspendCallbacks = {
  onSuspend: () => void;
  onResume: () => void;
};

export class SystemSuspendHandler {
  private registered = false;

  register(callbacks: SystemSuspendCallbacks): void {
    if (this.registered || typeof powerMonitor?.on !== 'function') {
      return;
    }

    powerMonitor.on('suspend', callbacks.onSuspend);
    powerMonitor.on('lock-screen', callbacks.onSuspend);
    powerMonitor.on('resume', callbacks.onResume);
    powerMonitor.on('unlock-screen', callbacks.onResume);
    this.registered = true;
  }
}

export const systemSuspendHandler = new SystemSuspendHandler();
