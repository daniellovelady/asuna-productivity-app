import { powerMonitor } from 'electron';
import { IDLE_THRESHOLD_SECONDS } from '../../shared/activity/constants';

export class IdleDetector {
  getIdleSeconds(): number {
    return powerMonitor.getSystemIdleTime();
  }

  isIdle(idleSeconds: number = this.getIdleSeconds()): boolean {
    return idleSeconds >= IDLE_THRESHOLD_SECONDS;
  }
}
