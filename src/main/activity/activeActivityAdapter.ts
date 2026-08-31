import type { NormalizedActivity } from '../../shared/activity/types';
import { classifyFromRawWindow } from './activityClassifier';
import type { OsActivityProvider } from './osActivityProviderTypes';

export class ActiveActivityAdapter {
  constructor(private readonly provider: OsActivityProvider) {}

  async sample(): Promise<NormalizedActivity | null> {
    const raw = await this.provider.getActiveWindow();

    if (!raw) {
      return { identity: 'unknown' };
    }

    const { identity } = classifyFromRawWindow(raw.ownerName, raw.title);
    return { identity };
  }

  async sampleWithClassification(): Promise<{
    identity: string;
    classification: ReturnType<typeof classifyFromRawWindow>['classification'];
  } | null> {
    const raw = await this.provider.getActiveWindow();

    if (!raw) {
      return { identity: 'unknown', classification: 'neutral' };
    }

    return classifyFromRawWindow(raw.ownerName, raw.title);
  }
}
