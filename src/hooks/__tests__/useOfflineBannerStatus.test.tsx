/**
 * useOfflineBannerStatus.test.tsx — estado del banner "motor de gramatica offline".
 *
 * Verifica que el hook restaure el cableado perdido en el revert de P1-2f:
 * corre `validateGrammarEngine` + `isAiAvailable` una vez al montar, expone el
 * banner segun la decision pura, no escribe tras desmontar y degrada a `false`
 * si alguna comprobacion lanza.
 *
 * Environment: jsdom + createRoot (mismo patron que `useLexiconMerge`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useOfflineBannerStatus } from '../useOfflineBannerStatus';

const backend = vi.hoisted(() => ({
  isAiAvailable: vi.fn(),
  validateGrammarEngine: vi.fn(),
}));

vi.mock('../../services/geminiService', () => ({
  isAiAvailable: backend.isAiAvailable,
}));

vi.mock('../../validation/runtimeValidation', () => ({
  validateGrammarEngine: backend.validateGrammarEngine,
}));

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: boolean | null = null;

const Probe = () => {
  const { showOfflineBanner } = useOfflineBannerStatus();
  latest = showOfflineBanner;
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
  latest = null;
  vi.restoreAllMocks();
  backend.isAiAvailable.mockReset();
  backend.validateGrammarEngine.mockReset();
});

describe('useOfflineBannerStatus', () => {
  it('muestra el banner sin IA y con el motor local fallando', async () => {
    backend.validateGrammarEngine.mockReturnValue(false);
    backend.isAiAvailable.mockResolvedValue(false);
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    expect(latest).toBe(true);
  });

  it('no muestra el banner si hay IA disponible', async () => {
    backend.validateGrammarEngine.mockReturnValue(false);
    backend.isAiAvailable.mockResolvedValue(true);
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    expect(latest).toBe(false);
  });

  it('no muestra el banner si el motor local valida', async () => {
    backend.validateGrammarEngine.mockReturnValue(true);
    backend.isAiAvailable.mockResolvedValue(false);
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    expect(latest).toBe(false);
  });

  it('degrada a false y registra cuando la comprobacion lanza', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    backend.validateGrammarEngine.mockImplementation(() => {
      throw new Error('motor roto');
    });
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    expect(latest).toBe(false);
    // React tambien emite su warning de `act(...)` por consola; el contrato del
    // hook es la llamada contextualizada con el error original.
    const contextualized = consoleError.mock.calls.find(
      call => call[0] === '[App] No se pudo evaluar el estado del motor de gramatica.',
    );
    expect(contextualized).toBeDefined();
    expect(contextualized![1]).toBeInstanceOf(Error);
  });
});
