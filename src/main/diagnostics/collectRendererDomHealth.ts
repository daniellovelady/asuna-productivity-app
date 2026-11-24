export type RendererDomHealth = {
  readyState: string;
  title: string;
  rootExists: boolean;
  rootId: string | null;
  rootChildElementCount: number;
  bodyChildElementCount: number;
  bodyTextLength: number;
  origin: string;
  pathname: string;
  visibilityState: string;
  bootStage: string | null;
};

export const RENDERER_DOM_HEALTH_SCRIPT = `(() => {
  const root = document.getElementById('app') || document.getElementById('root');
  return {
    readyState: document.readyState,
    title: document.title || '',
    rootExists: Boolean(root),
    rootId: root ? root.id : null,
    rootChildElementCount: root ? root.childElementCount : 0,
    bodyChildElementCount: document.body ? document.body.childElementCount : 0,
    bodyTextLength: document.body && document.body.innerText ? document.body.innerText.length : 0,
    origin: location.origin,
    pathname: location.pathname || '/',
    visibilityState: document.visibilityState || 'unknown',
    bootStage: typeof window.__ASUNA_RENDERER_BOOT_STAGE__ === 'string'
      ? window.__ASUNA_RENDERER_BOOT_STAGE__
      : null,
  };
})()`;