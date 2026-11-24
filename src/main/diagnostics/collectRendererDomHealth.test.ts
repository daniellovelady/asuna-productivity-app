import { describe, expect, it } from 'vitest';
import { RENDERER_DOM_HEALTH_SCRIPT } from './collectRendererDomHealth';

describe('collectRendererDomHealth', () => {
  it('inspects #app boot stage', () => {
    expect(RENDERER_DOM_HEALTH_SCRIPT).toContain("getElementById('app')");
    expect(RENDERER_DOM_HEALTH_SCRIPT).toContain('__ASUNA_RENDERER_BOOT_STAGE__');
  });
});