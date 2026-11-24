import { app } from 'electron';
import type { BrowserWindow } from 'electron';
import { kilobytesToMegabytes } from '../../shared/diagnostics/rendererMemoryDetail';

export type RendererProcessMemorySnapshot = {
  rendererPid: number | null;
  workingSetMB: number | null;
  peakWorkingSetMB: number | null;
  privateBytesMB: number | null;
  cpuPercent: number | null;
  processType: string | null;
};

export function captureRendererProcessMemory(
  mainWindow: BrowserWindow | null | undefined,
): RendererProcessMemorySnapshot {
  const rendererPid = mainWindow?.isDestroyed() ? null : mainWindow?.webContents.getOSProcessId() ?? null;
  const metrics = app.getAppMetrics();

  const match = rendererPid === null
    ? undefined
    : metrics.find((metric) => metric.pid === rendererPid);

  const memory = match?.memory;

  return {
    rendererPid,
    workingSetMB: kilobytesToMegabytes(memory?.workingSetSize),
    peakWorkingSetMB: kilobytesToMegabytes(memory?.peakWorkingSetSize),
    privateBytesMB: kilobytesToMegabytes(memory?.privateBytes),
    cpuPercent: typeof match?.cpu?.percentCPUUsage === 'number'
      ? Math.round(match.cpu.percentCPUUsage * 100) / 100
      : null,
    processType: match?.type ?? null,
  };
}