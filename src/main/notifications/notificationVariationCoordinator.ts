import type { WebContents } from 'electron';
import type { VariationRequestPayload } from '../../shared/notifications/types';

export type VariationRequestListener = (payload: VariationRequestPayload) => void;

export class NotificationVariationCoordinator {
  private mainWebContents: WebContents | null = null;

  private listener: VariationRequestListener | null = null;

  setMainWebContents(contents: WebContents | null): void {
    this.mainWebContents = contents;
  }

  setListener(listener: VariationRequestListener | null): void {
    this.listener = listener;
  }

  requestVariation(payload: VariationRequestPayload): void {
    if (this.mainWebContents === null || this.mainWebContents.isDestroyed()) {
      return;
    }

    this.mainWebContents.send('notification:variationRequest', payload);
    this.listener?.(payload);
  }

  invalidate(): void {
    // Variation requests are guarded by generation on the service side.
  }
}
