import type { RendererMemoryDetailSnapshot } from '../../shared/diagnostics/rendererMemoryDetail';

export {};

declare global {
  interface Window {
    diagnosticsApi?: {
      requestMemorySnapshot: (reason: string) => Promise<boolean>;
      reportCalendarMemory: (payload: Record<string, unknown>) => Promise<boolean>;
      reportCalendarLifecycle: (stage: string) => Promise<boolean>;
      readRendererMemoryDetail: (reason: string) => Promise<RendererMemoryDetailSnapshot | null>;
      reportRendererMemoryDetail: (reason: string) => Promise<boolean>;
      takeRendererHeapSnapshot: (label: string) => Promise<string | null>;
    };
  }
}