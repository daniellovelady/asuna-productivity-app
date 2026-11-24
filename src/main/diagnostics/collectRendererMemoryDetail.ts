/**
 * @deprecated Periodic sampling uses requestRendererMemoryDetail (IPC send), not executeJavaScript.
 * Kept for tests/documentation of the removed path.
 */
export const RENDERER_MEMORY_DETAIL_READ_SCRIPT = `(reason) => {
  if (typeof window.diagnosticsApi?.readRendererMemoryDetail !== 'function') {
    return null;
  }
  return window.diagnosticsApi.readRendererMemoryDetail(reason);
}`;