import { describe, expect, it } from 'vitest';
import { ActiveActivityAdapter } from './activeActivityAdapter';
import { MockOsActivityProvider } from './mockOsActivityProvider';

describe('ActiveActivityAdapter', () => {
  it('returns only normalized identity', async () => {
    const provider = new MockOsActivityProvider({
      ownerName: 'Google Chrome',
      title: 'YouTube - Google Chrome',
    });
    const adapter = new ActiveActivityAdapter(provider);

    const result = await adapter.sample();

    expect(result).toEqual({ identity: 'youtube' });
    expect(Object.keys(result ?? {})).toEqual(['identity']);
  });
});
