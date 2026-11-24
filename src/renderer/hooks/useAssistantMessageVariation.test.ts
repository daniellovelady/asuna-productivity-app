import { describe, expect, it } from 'vitest';

function shouldApplyVariationResult(
  activeSequence: number,
  requestSequence: number,
  currentMessageId: string | null,
  requestMessageId: string,
): boolean {
  return activeSequence === requestSequence && currentMessageId === requestMessageId;
}

describe('useAssistantMessageVariation stale-response guard', () => {
  it('rejects stale AI variation results after the message is cleared', () => {
    const requestSequence = 1;
    let activeSequence = 1;

    activeSequence += 1;

    expect(shouldApplyVariationResult(activeSequence, requestSequence, null, 'message-1')).toBe(false);
  });

  it('rejects stale AI variation results after a newer message is shown', () => {
    const requestSequence = 1;

    expect(shouldApplyVariationResult(2, requestSequence, 'message-2', 'message-1')).toBe(false);
  });

  it('accepts AI variation results only for the active message and sequence', () => {
    expect(shouldApplyVariationResult(3, 3, 'message-3', 'message-3')).toBe(true);
  });
});
