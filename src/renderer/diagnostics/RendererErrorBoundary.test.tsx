/**
 * @vitest-environment happy-dom
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { RendererErrorBoundary } from './RendererErrorBoundary';

function ThrowingChild(): JSX.Element {
  throw new Error('test boom');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RendererErrorBoundary', () => {
  it('renders fallback when a child throws', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    root.render(
      createElement(RendererErrorBoundary, null, createElement(ThrowingChild)),
    );

    expect(document.body.textContent).toContain('A.S.U.N.A. encountered a renderer error');
  });
});