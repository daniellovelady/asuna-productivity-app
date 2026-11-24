import type { EncouragementLevel } from '../preferences/types';

const ENCOURAGEMENT_THRESHOLDS_MS: Record<EncouragementLevel, number> = {
  low: 20 * 60 * 1000,
  medium: 10 * 60 * 1000,
  high: 5 * 60 * 1000,
};

export function getEncouragementThresholdMs(level: EncouragementLevel): number {
  return ENCOURAGEMENT_THRESHOLDS_MS[level];
}
