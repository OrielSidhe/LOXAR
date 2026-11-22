/**
 * usePragmaticDbInit.test.tsx — arranque de la base pragmática.
 *
 * Verifica el contrato del `useEffect` inline original de `App.tsx`: corre una sola
 * vez al montar y, si la inicialización falla, degrada en silencio registrando el
 * error (no propaga ni rompe el render).
 *
 * Environment: jsdom manual (mismo patrón que `useOfflineBannerStatus`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { usePragmaticDbInit } from '../usePragmaticDbInit';

const backend = vi.hoisted(() => ({ initPragmaticDb: vi.fn() }));

vi.mock('../../services/grammarDb', () => ({ initPragmaticDb: backend.initPragmaticDb }));

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const Probe = () => {
  usePragmaticDbInit();
  return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() => {
    root.render(<Probe />);
  });
};

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
  vi.restoreAllMocks();
  backend.initPragmaticDb.mockReset();
});

describe('usePragmaticDbInit', () => {
  it('inicializa la base una sola vez al montar', () => {
    backend.initPragmaticDb.mockResolvedValue(undefined);
    renderProbe();
    expect(backend.initPragmaticDb).toHaveBeenCalledTimes(1);
  });

  it('degrada en silencio y registra cuando la inicialización falla', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    backend.initPragmaticDb.mockRejectedValue(new Error('db rota'));
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    // React tambien emite su warning de `act(...)` por consola; el contrato del
    // hook es la llamada contextualizada con el error original.
    const contextualized = consoleError.mock.calls.find(
      call => call[0] === '[App] Failed to init pragmatic DB:',
    );
    expect(contextualized).toBeDefined();
    expect(contextualized![1]).toBeInstanceOf(Error);
  });
});
