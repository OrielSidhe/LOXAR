/**
 * useAppSessionHydration.test.tsx — hidratacion de sesion de `App.tsx`.
 *
 * Verifica el contrato preservado de los dos `useEffect` originales:
 *  - estado inicial (bienvenida visible, `isAppLoaded` en false);
 *  - aplica el plan del cache (projectPath/exportPath/formatos/descarte) y eleva
 *    `isAppLoaded`;
 *  - respeta el opt-out `showWelcomeOnStart`;
 *  - `listLexiconNames` cae a `hasLocalData: false` si el backend no existe;
 *  - `loadSessionCache` que falla igualmente eleva `isAppLoaded`;
 *  - los setters expuestos actualizan el estado.
 *
 * Environment: jsdom + createRoot (sin RTL, el patrón de `useModalCoordination`).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import {
  useAppSessionHydration,
  type UseAppSessionHydrationResult,
} from '../useAppSessionHydration';
import { DEFAULT_EXPORT_FORMATS } from '../../utils/lexiconExport';

const backend = vi.hoisted(() => ({
  loadSessionCache: vi.fn(),
  listLexiconNames: vi.fn(),
}));

vi.mock('../../services/sessionCache', () => ({
  loadSessionCache: backend.loadSessionCache,
  saveSessionCache: vi.fn(),
}));

vi.mock('../../services/sqlStorage', () => ({
  listLexiconNames: backend.listLexiconNames,
  loadLexicon: vi.fn(),
}));

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: UseAppSessionHydrationResult | null = null;

const Probe = () => {
  latest = useAppSessionHydration();
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

/** Deja resolver los efectos asíncronos del hook. */
const flush = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  backend.loadSessionCache.mockReset();
  backend.listLexiconNames.mockReset();
  backend.loadSessionCache.mockResolvedValue({});
  backend.listLexiconNames.mockResolvedValue([]);
});

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
  latest = null;
});

describe('useAppSessionHydration', () => {
  it('arranca con bienvenida visible y sin marcar la app como cargada', () => {
    renderProbe();
    expect(latest!.showWelcome).toBe(true);
    expect(latest!.hasSeenWelcome).toBe(false);
    expect(latest!.isAppLoaded).toBe(false);
    expect(latest!.hasLocalData).toBe(false);
    expect(latest!.exportFormats).toEqual([...DEFAULT_EXPORT_FORMATS]);
  });

  it('hidrata la sesion desde el cache y eleva isAppLoaded', async () => {
    backend.loadSessionCache.mockResolvedValue({
      projectPath: 'C:/loxar/proyecto',
      exportPath: 'C:/loxar/export',
      exportFormats: ['md', 'txt'],
      bootstrapDismissed: true,
      tourCompleted: true,
    });
    backend.listLexiconNames.mockResolvedValue(['Mi lexico']);
    renderProbe();
    await flush();

    expect(latest!.projectPath).toBe('C:/loxar/proyecto');
    expect(latest!.exportPath).toBe('C:/loxar/export');
    expect(latest!.exportFormats).toEqual(['md', 'txt']);
    expect(latest!.bootstrapDismissed).toBe(true);
    expect(latest!.hasLocalData).toBe(true);
    expect(latest!.hasSeenWelcome).toBe(true);
    expect(latest!.isAppLoaded).toBe(true);
  });

  it('ofrece el bootstrap cuando no hay proyecto ni descarte previo', async () => {
    backend.loadSessionCache.mockResolvedValue({ tourCompleted: false });
    backend.listLexiconNames.mockResolvedValue([]);
    renderProbe();
    await flush();

    expect(latest!.projectPath).toBeNull();
    expect(latest!.showProjectBootstrap).toBe(true);
    expect(latest!.hasLocalData).toBe(false);
    expect(latest!.isAppLoaded).toBe(true);
  });

  it('no ofrece el bootstrap si el proyecto ya esta configurado', async () => {
    backend.loadSessionCache.mockResolvedValue({ projectPath: 'C:/loxar/proyecto' });
    backend.listLexiconNames.mockResolvedValue([]);
    renderProbe();
    await flush();

    expect(latest!.showProjectBootstrap).toBe(false);
  });

  it('respeta el opt-out showWelcomeOnStart', async () => {
    backend.loadSessionCache.mockResolvedValue({ showWelcomeOnStart: false });
    backend.listLexiconNames.mockResolvedValue([]);
    renderProbe();
    await flush();

    expect(latest!.showWelcome).toBe(false);
    expect(latest!.hasSeenWelcome).toBe(true);
  });

  it('hasLocalData queda en false si no hay backend SQL (modo no-Tauri)', async () => {
    backend.loadSessionCache.mockResolvedValue({});
    backend.listLexiconNames.mockRejectedValue(new Error('no backend'));
    renderProbe();
    await flush();

    expect(latest!.hasLocalData).toBe(false);
    expect(latest!.isAppLoaded).toBe(true);
  });

  it('eleva isAppLoaded aun cuando loadSessionCache falla', async () => {
    backend.loadSessionCache.mockRejectedValue(new Error('sin cache'));
    backend.listLexiconNames.mockResolvedValue([]);
    renderProbe();
    await flush();

    expect(latest!.isAppLoaded).toBe(true);
    expect(latest!.showWelcome).toBe(true);
    expect(latest!.hasSeenWelcome).toBe(true);
  });

  it('los setters expuestos actualizan el estado', async () => {
    backend.loadSessionCache.mockResolvedValue({});
    backend.listLexiconNames.mockResolvedValue([]);
    renderProbe();
    await flush();

    act(() => {
      latest!.setProjectPath('C:/nuevo');
      latest!.setExportPath('C:/export');
      latest!.setExportFormats(['csv']);
      latest!.setBootstrapDismissed(true);
      latest!.setHasLocalData(true);
      latest!.setShowProjectBootstrap(true);
      latest!.setShowWelcome(false);
    });

    expect(latest!.projectPath).toBe('C:/nuevo');
    expect(latest!.exportPath).toBe('C:/export');
    expect(latest!.exportFormats).toEqual(['csv']);
    expect(latest!.bootstrapDismissed).toBe(true);
    expect(latest!.hasLocalData).toBe(true);
    expect(latest!.showProjectBootstrap).toBe(true);
    expect(latest!.showWelcome).toBe(false);
  });
});
