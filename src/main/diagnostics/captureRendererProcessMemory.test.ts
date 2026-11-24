import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('captureRendererProcessMemory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps renderer pid to ProcessMetric memory fields', async () => {
    const getAppMetrics = vi.fn(() => [
      {
        pid: 42,
        type: 'Tab',
        memory: {
          workingSetSize: 2048,
          peakWorkingSetSize: 4096,
          privateBytes: 50 * 1024,
        },
        cpu: { percentCPUUsage: 1.25 },
      },
    ]);

    vi.doMock('electron', () => ({
      app: { getAppMetrics },
    }));

    const { captureRendererProcessMemory } = await import('./captureRendererProcessMemory');
    const snapshot = captureRendererProcessMemory({
      isDestroyed: () => false,
      webContents: { getOSProcessId: () => 42 },
    } as never);

    expect(snapshot.rendererPid).toBe(42);
    expect(snapshot.workingSetMB).toBe(2);
    expect(snapshot.peakWorkingSetMB).toBe(4);
    expect(snapshot.privateBytesMB).toBe(50);
    expect(snapshot.cpuPercent).toBe(1.25);
    expect(snapshot.processType).toBe('Tab');
  });
});