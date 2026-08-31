import { classifyActivity } from '../../shared/activity/classification';
import type { ActivityClassification } from '../../shared/activity/types';
import { normalizeActivity } from './activityNormalizer';

export function classifyNormalizedIdentity(identity: string): ActivityClassification {
  return classifyActivity(identity);
}

export function classifyFromRawWindow(ownerName: string, title: string): {
  identity: string;
  classification: ActivityClassification;
} {
  const identity = normalizeActivity(ownerName, title);
  return {
    identity,
    classification: classifyNormalizedIdentity(identity),
  };
}
