export type RendererMemoryDetailSnapshot = {
  reason: string;
  usedHeapMB: number | null;
  totalHeapMB: number | null;
  heapLimitMB: number | null;
  mallocedMB: number | null;
  blinkAllocatedMB: number | null;
  blinkTotalMB: number | null;
  residentSetMB: number | null;
  privateMB: number | null;
  sharedMB: number | null;
};

export type ElectronHeapStatisticsKb = {
  usedHeapSize: number;
  totalHeapSize: number;
  heapSizeLimit: number;
  mallocedMemory?: number;
};

export type ElectronBlinkMemoryKb = {
  allocated: number;
  total: number;
};

export type ElectronProcessMemoryKb = {
  residentSet: number;
  private: number;
  shared: number;
};

/** Electron renderer process memory APIs report kilobytes. */
export function kilobytesToMegabytes(kilobytes: number | undefined): number | null {
  if (typeof kilobytes !== 'number' || !Number.isFinite(kilobytes)) {
    return null;
  }
  return Math.round((kilobytes / 1024) * 100) / 100;
}

export const RENDERER_MEMORY_DETAIL_IPC_CHANNEL = 'diagnostics:request-renderer-memory-detail';

function parseTriStateEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'on') {
    return true;
  }
  return defaultValue;
}

export function isMainMemoryDiagEnabled(): boolean {
  return parseTriStateEnvFlag(process.env.ASUNA_MEMORY_DIAG, true);
}

export function isRendererMemoryDetailEnabled(): boolean {
  if (!isMainMemoryDiagEnabled()) {
    return false;
  }
  return parseTriStateEnvFlag(process.env.ASUNA_RENDERER_MEMORY_DETAIL, false);
}

export function buildRendererMemoryDetailSnapshot(
  reason: string,
  heap: ElectronHeapStatisticsKb,
  blink: ElectronBlinkMemoryKb | null,
  processMemory: ElectronProcessMemoryKb | null,
): RendererMemoryDetailSnapshot {
  return {
    reason,
    usedHeapMB: kilobytesToMegabytes(heap.usedHeapSize),
    totalHeapMB: kilobytesToMegabytes(heap.totalHeapSize),
    heapLimitMB: kilobytesToMegabytes(heap.heapSizeLimit),
    mallocedMB: kilobytesToMegabytes(heap.mallocedMemory),
    blinkAllocatedMB: blink ? kilobytesToMegabytes(blink.allocated) : null,
    blinkTotalMB: blink ? kilobytesToMegabytes(blink.total) : null,
    residentSetMB: processMemory ? kilobytesToMegabytes(processMemory.residentSet) : null,
    privateMB: processMemory ? kilobytesToMegabytes(processMemory.private) : null,
    sharedMB: processMemory ? kilobytesToMegabytes(processMemory.shared) : null,
  };
}