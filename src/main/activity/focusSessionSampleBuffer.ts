import { FOCUS_BUFFER_MAX_SAMPLES } from '../../shared/activity/constants';
import type { BufferedActivitySample } from '../../shared/activity/types';

export class FocusSessionSampleBuffer {
  private readonly buffers = new Map<string, BufferedActivitySample[]>();

  append(sessionId: string, sample: BufferedActivitySample): void {
    const existing = this.buffers.get(sessionId) ?? [];

    if (existing.length >= FOCUS_BUFFER_MAX_SAMPLES) {
      return;
    }

    existing.push({ ...sample });
    this.buffers.set(sessionId, existing);
  }

  getSnapshot(sessionId: string): BufferedActivitySample[] {
    const existing = this.buffers.get(sessionId) ?? [];
    return existing.map((sample) => ({ ...sample }));
  }

  has(sessionId: string): boolean {
    return (this.buffers.get(sessionId)?.length ?? 0) > 0;
  }

  clear(sessionId: string): void {
    this.buffers.delete(sessionId);
  }
}
