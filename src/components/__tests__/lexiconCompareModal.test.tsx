/**
 * LexiconCompareModal.test.tsx — FASE CMP del gauntlet v3.14.
 *
 * Verifica que el modal:
 *  - Compara el léxico activo contra un léxico guardado cargado por callback.
 *  - Informa faltantes y diferencias campo a campo.
 *  - Fusiona todas las faltantes o solo las seleccionadas.
 *  - Cierra sin fusionar.
 *
 * Environment: jsdom manual (patrón de los tests de componentes del repo).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import LexiconCompareModal from '../LexiconCompareModal';
import type { LexiconEntry } from '../../types';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

let containers: HTMLDivElement[] = [];
let roots: Root[] = [];

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: '1',
  Raíz: 'kira',
  Léxema: ['kira'],
  Categoría: 'sustantivo',
  Significado: ['fuego'],
  extraData: {},
  ...overrides,
});

interface MountOptions {
  onLoadLexicon?: (name: string) => Promise<LexiconEntry[] | null>;
  onMergeEntries?: (entries: LexiconEntry[]) => void;
  onClose?: () => void;
  showNotification?: (message: string, type: 'success' | 'error') => void;
}

const mount = async (options: MountOptions = {}): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  containers.push(container);
  roots.push(root);
  await act(async () => {
    root.render(
      <LexiconCompareModal
        open={true}
        onClose={options.onClose ?? (() => {})}
        baseEntries={[entry({ ID: 'base-1' }), entry({ ID: 'base-2', Léxema: ['telo'], Raíz: 'telo', Significado: ['ver'], Categoría: 'verbo' })]}
        baseName="Quavanol"
        comparisonNames={['Otro']}
        onLoadLexicon={options.onLoadLexicon ?? (async () => [])}
        onMergeEntries={options.onMergeEntries ?? (() => {})}
        showNotification={options.showNotification ?? (() => {})}
      />,
    );
    await flush();
  });
  return container;
};

const click = async (el: Element | null) => {
  if (!el) throw new Error('element not found');
  await act(async () => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await flush();
  });
};

const buttonByText = (container: HTMLElement, text: string): HTMLButtonElement | null =>
  Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.includes(text) || button.getAttribute('aria-label') === text,
  ) ?? null;

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) act(() => root.unmount());
  }
  while (containers.length > 0) {
    const container = containers.pop();
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('LexiconCompareModal (FASE CMP)', () => {
  it('renderiza el título y la base activa', async () => {
    const container = await mount();
    expect(container.textContent).toContain('Comparar y fusionar léxicos');
    expect(container.textContent).toContain('Quavanol');
  });

  it('compara contra un léxico guardado e informa faltantes y diferencias', async () => {
    const onLoadLexicon = vi.fn(async () => [
      entry({ ID: 'otro-1', Léxema: ['KIRA'], Significado: ['luz'] }),
      entry({ ID: 'otro-2', Léxema: ['nova'], Raíz: 'nova', Categoría: 'adjetivo', Significado: ['nuevo'] }),
    ]);
    const container = await mount({ onLoadLexicon });

    await act(async () => {
      const select = container.querySelector('select');
      if (!select) throw new Error('select not found');
      select.value = 'Otro';
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await flush();
    });
    await click(buttonByText(container, 'Comparar'));
    await act(async () => { await flush(); });

    expect(onLoadLexicon).toHaveBeenCalledWith('Otro');
    expect(container.textContent).toContain('Faltantes en la base: 1');
    expect(container.textContent).toContain('Con diferencias: 1');
    expect(container.textContent).toContain('Solo en la base: 1');
    expect(container.textContent).toContain('Diferencias campo a campo (1)');
  });

  it('fusiona todas las faltantes', async () => {
    const onMergeEntries = vi.fn();
    const notification = vi.fn();
    const container = await mount({
      onLoadLexicon: async () => [entry({ ID: 'otro-2', Léxema: ['nova'], Raíz: 'nova', Categoría: 'adjetivo', Significado: ['nuevo'] })],
      onMergeEntries,
      showNotification: notification,
    });

    await act(async () => {
      const select = container.querySelector('select');
      if (!select) throw new Error('select not found');
      select.value = 'Otro';
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await flush();
    });
    await click(buttonByText(container, 'Comparar'));
    await act(async () => { await flush(); });

    await click(buttonByText(container, 'Añadir todas las faltantes'));
    await act(async () => { await flush(); });

    expect(onMergeEntries).toHaveBeenCalledTimes(1);
    expect(onMergeEntries.mock.calls[0][0]).toHaveLength(1);
    expect(onMergeEntries.mock.calls[0][0][0].Léxema).toEqual(['nova']);
    expect(notification).toHaveBeenCalledWith('1 entrada(s) añadidas al léxico activo.', 'success');
  });

  it('fusiona solo las faltantes seleccionadas', async () => {
    const onMergeEntries = vi.fn();
    const container = await mount({
      onLoadLexicon: async () => [
        entry({ ID: 'otro-2', Léxema: ['nova'], Raíz: 'nova', Categoría: 'adjetivo', Significado: ['nuevo'] }),
        entry({ ID: 'otro-3', Léxema: ['sula'], Raíz: 'sula', Categoría: 'sustantivo', Significado: ['agua'] }),
      ],
      onMergeEntries,
    });

    await act(async () => {
      const select = container.querySelector('select');
      if (!select) throw new Error('select not found');
      select.value = 'Otro';
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      await flush();
    });
    await click(buttonByText(container, 'Comparar'));
    await act(async () => { await flush(); });

    const firstCheckbox = container.querySelector('input[type="checkbox"]');
    await act(async () => {
      firstCheckbox?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await flush();
    });

    await click(buttonByText(container, 'Añadir seleccionadas'));
    await act(async () => { await flush(); });

    expect(onMergeEntries).toHaveBeenCalledTimes(1);
    expect(onMergeEntries.mock.calls[0][0]).toHaveLength(1);
  });

  it('cierra sin fusionar', async () => {
    const onClose = vi.fn();
    const onMergeEntries = vi.fn();
    const container = await mount({ onClose, onMergeEntries });
    await click(buttonByText(container, 'Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMergeEntries).not.toHaveBeenCalled();
  });
});
