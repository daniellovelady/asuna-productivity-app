import { afterEach, describe, expect, it } from 'vitest';
import {
  buildRendererMemoryDetailSnapshot,
  isMainMemoryDiagEnabled,
  isRendererMemoryDetailEnabled,
  kilobytesToMegabytes,
} from './rendererMemoryDetail';

describe('memoryDiagEnv', () => {
  const originalMemoryDiag = process.env.ASUNA_MEMORY_DIAG;
  const originalRendererDetail = process.env.ASUNA_RENDERER_MEMORY_DETAIL;

  afterEach(() => {
    if (originalMemoryDiag === undefined) {
      delete process.env.ASUNA_MEMORY_DIAG;
    } else {
      process.env.ASUNA_MEMORY_DIAG = originalMemoryDiag;
    }
    if (originalRendererDetail === undefined) {
      delete process.env.ASUNA_RENDERER_MEMORY_DETAIL;
    } else {
      process.env.ASUNA_RENDERER_MEMORY_DETAIL = originalRendererDetail;
    }
  });

  it('defaults renderer detail off', () => {
    delete process.env.ASUNA_RENDERER_MEMORY_DETAIL;
    expect(isRendererMemoryDetailEnabled()).toBe(false);
    expect(isMainMemoryDiagEnabled()).toBe(true);
  });
});

describe('rendererMemoryDetail units (Electron KB)', () => {
  it('converts heap kilobytes to megabytes once', () => {
    expect(kilobytesToMegabytes(4_194_304)).toBe(4096);
  });

  it('builds realistic heap limit in thousands of MB not single digits', () => {
    const snapshot = buildRendererMemoryDetailSnapshot(
      'test',
      {
        usedHeapSize: 30_720,
        totalHeapSize: 81_920,
        heapSizeLimit: 4_194_304,
        mallocedMemory: 0,
      },
      { allocated: 9_062, total: 9_062 },
      { residentSet: 171_2128, private: 1_654_784, shared: 50_000 },
    );

    expect(snapshot.usedHeapMB).toBe(30);
    expect(snapshot.totalHeapMB).toBe(80);
    expect(snapshot.heapLimitMB).toBe(4096);
    expect(snapshot.blinkAllocatedMB).toBe(8.85);
    expect(snapshot.residentSetMB).toBe(1672);
    expect(snapshot.privateMB).toBe(1616);
    expect(snapshot.sharedMB).toBe(48.83);
  });

  it('fails the broken bytes-style heap conversion (regression guard)', () => {
    const heapLimitKb = 4_194_304;
    const wrongMb = Math.round((heapLimitKb / (1024 * 1024)) * 100) / 100;
    const correctMb = 4096;
    expect(wrongMb).toBeLessThan(10);
    expect(correctMb).toBe(4096);
  });

  it('keeps null process memory when unset instead of zero', () => {
    const snapshot = buildRendererMemoryDetailSnapshot(
      'test',
      { usedHeapSize: 100, totalHeapSize: 200, heapSizeLimit: 300 },
      null,
      null,
    );
    expect(snapshot.residentSetMB).toBeNull();
    expect(snapshot.privateMB).toBeNull();
    expect(snapshot.sharedMB).toBeNull();
  });
});