import type { OsActivityProvider, RawWindowInput } from './osActivityProviderTypes';

export async function createGetWindowsProvider(): Promise<OsActivityProvider> {
  const { activeWindow } = await import('get-windows');

  return {
    async getActiveWindow(): Promise<RawWindowInput | null> {
      const result = await activeWindow();

      if (!result) {
        return null;
      }

      const ownerName = result.owner.name ?? 'unknown';
      const title = result.title ?? '';

      return { ownerName, title };
    },
  };
}
