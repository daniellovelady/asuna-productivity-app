import { describe, expect, it } from 'vitest';
import { kilobytesToMegabytes } from '../../shared/diagnostics/rendererMemoryDetail';

describe('kilobytesToMegabytes main metrics', () => {
  it('converts realistic Electron workingSetSize KB to MB', () => {
    expect(kilobytesToMegabytes(1_712_128)).toBe(1672);
  });

  it('converts realistic privateBytes KB to MB', () => {
    expect(kilobytesToMegabytes(1_654_784)).toBe(1616);
  });
});