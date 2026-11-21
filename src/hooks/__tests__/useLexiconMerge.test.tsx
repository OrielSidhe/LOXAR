/**
 * useLexiconMerge.test.tsx — carga y fusion de lexicos para el modal de comparacion.
 *
 * Verifica el contrato preservado de los dos `useCallback` de `App.tsx`:
 *  - `loadLexiconEntries` devuelve las entradas del lexico guardado;
 *  - degrada a `null` cuando `loadLexicon` no encuentra el lexico;
 *  - degrada a `null` (y registra) cuando el almacen lanza;
 *  - `mergeLexiconEntries` escribe via `updateActiveLexiconEntries` con la cuenta;
 *  - sin lexico activo no escribe y notifica el error.
 *
 * Environment: jsdom + createRoot (mismo patron que `useTabNavigation`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useLexiconMerge, type UseLexiconMergeOptions } from '../useLexiconMerge';
import type { LexiconEntry } from '../../types';

const backend = vi.hoisted(() => ({ loadLexicon: vi.fn() }));

vi.mock('../../services/sqlStorage', () => ({
  loadLexicon: backend.loadLexicon,
}));

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: ReturnType<typeof useLexiconMerge> | null = null;

const Probe = (props: UseLexiconMergeOptions) => {
  latest = useLexiconMerge(props);
  return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (props: UseLexiconMergeOptions): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() => {
    root.render(<Probe {...props} />);
  });
};

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: '1',
  Raíz: 'raiz',
  Léxema: ['lexema'],
  Categoría: 'sustantivo',
  Significado: ['meaning'],
  extraData: {},
  ...overrides,
});

const baseOptions = (overrides: Partial<UseLexiconMergeOptions> = {}): UseLexiconMergeOptions => ({
  activeLexicon: [entry({ ID: '1', Léxema: ['kira'], Significado: ['fuego'] })],
  activeLexiconName: 'Quavanol',
  updateActiveLexiconEntries: vi.fn(),
  showNotification: vi.fn(),
  ...overrides,
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
  vi.restoreAllMocks();
  backend.loadLexicon.mockReset();
});

describe('useLexiconMerge', () => {
  it('carga las entradas de otro lexico guardado', async () => {
    backend.loadLexicon.mockResolvedValue({
      entries: [entry({ ID: 'otro-1', Léxema: ['nova'], Significado: ['nuevo'] })],
    });
    renderProbe(baseOptions());

    let loaded: LexiconEntry[] | null = null;
    await act(async () => {
      loaded = await latest!.loadLexiconEntries('Otro');
    });

    expect(backend.loadLexicon).toHaveBeenCalledWith('Otro');
    expect(loaded).toHaveLength(1);
    expect(loaded![0].Léxema).toEqual(['nova']);
  });

  it('devuelve null cuando el lexico no existe', async () => {
    backend.loadLexicon.mockResolvedValue(null);
    renderProbe(baseOptions());

    let loaded: LexiconEntry[] | null = 'unset' as unknown as LexiconEntry[] | null;
    await act(async () => {
      loaded = await latest!.loadLexiconEntries('Inexistente');
    });

    expect(loaded).toBeNull();
  });

  it('degrada a null y registra cuando el almacen falla', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('sin backend');
    backend.loadLexicon.mockRejectedValue(failure);
    renderProbe(baseOptions());

    let loaded: LexiconEntry[] | null = 'unset' as unknown as LexiconEntry[] | null;
    await act(async () => {
      loaded = await latest!.loadLexiconEntries('Otro');
    });

    expect(loaded).toBeNull();
    // `loadLexicon` registra el fallo en su propio boundary y el hook lo registra
    // de nuevo con el contexto del modal; ambos apuntan al mismo error.
    expect(consoleError.mock.calls.length).toBeGreaterThanOrEqual(1);
    const contextualized = consoleError.mock.calls.find(
      call => call[0] === 'No se pudo cargar el léxico "Otro" para comparar.',
    );
    expect(contextualized).toBeDefined();
    expect(contextualized![1]).toBe(failure);
  });

  it('fusiona las entradas en el lexico activo con la cuenta', () => {
    const updateActiveLexiconEntries = vi.fn();
    renderProbe(baseOptions({ updateActiveLexiconEntries }));

    act(() => {
      latest!.mergeLexiconEntries([entry({ ID: 'otro-2', Léxema: ['nova'] })]);
    });

    expect(updateActiveLexiconEntries).toHaveBeenCalledTimes(1);
    const [entries, makeDirty, newWordsCount] = updateActiveLexiconEntries.mock.calls[0];
    expect(entries).toHaveLength(2);
    expect(entries[1].Léxema).toEqual(['nova']);
    expect(makeDirty).toBe(true);
    expect(newWordsCount).toBe(1);
  });

  it('sin lexico activo no escribe y notifica el error', () => {
    const updateActiveLexiconEntries = vi.fn();
    const showNotification = vi.fn();
    renderProbe(
      baseOptions({ activeLexiconName: null, updateActiveLexiconEntries, showNotification }),
    );

    act(() => {
      latest!.mergeLexiconEntries([entry({ ID: 'otro-2' })]);
    });

    expect(updateActiveLexiconEntries).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(
      'No hay un léxico activo que fusionar.',
      'error',
    );
  });

  it('las acciones quedan memoizadas entre renders', () => {
    renderProbe(baseOptions());
    const first = latest!;
    expect(latest!.loadLexiconEntries).toBe(first.loadLexiconEntries);
    expect(latest!.mergeLexiconEntries).toBe(first.mergeLexiconEntries);
  });
});
