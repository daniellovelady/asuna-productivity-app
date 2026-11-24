import {
  buildRendererMemoryDetailSnapshot,
  isRendererMemoryDetailEnabled,
  type RendererMemoryDetailSnapshot,
} from '../../shared/diagnostics/rendererMemoryDetail';

export async function captureRendererMemoryDetail(
  reason: string,
): Promise<RendererMemoryDetailSnapshot | null> {
  if (!isRendererMemoryDetailEnabled()) {
    return null;
  }

  const heap = process.getHeapStatistics();

  const blink = typeof process.getBlinkMemoryInfo === 'function'
    ? process.getBlinkMemoryInfo()
    : null;

  let processMemory: { residentSet: number; private: number; shared: number } | null = null;
  if (typeof process.getProcessMemoryInfo === 'function') {
    const info = await process.getProcessMemoryInfo();
    processMemory = {
      residentSet: info.residentSet,
      private: info.private,
      shared: info.shared,
    };
  }

  return buildRendererMemoryDetailSnapshot(reason, heap, blink, processMemory);
}