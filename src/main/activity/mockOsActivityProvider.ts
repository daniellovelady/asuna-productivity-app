import type { OsActivityProvider, RawWindowInput } from './osActivityProviderTypes';

export class MockOsActivityProvider implements OsActivityProvider {
  constructor(private readonly window: RawWindowInput | null = null) {}

  setActiveWindow(window: RawWindowInput | null): void {
    this.window = window;
  }

  async getActiveWindow(): Promise<RawWindowInput | null> {
    return this.window;
  }
}
