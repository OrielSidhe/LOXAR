/**
 * GrammarPhonologyPanel.test.tsx — FASE FX (gauntlet v3.14).
 *
 * Verifica el botón "Extraer del léxico": infiere fonología del léxico activo,
 *fusiona con la actual (reintentar no duplica) y avisa cuando el léxico está vacío.
 *
 * Environment: jsdom montado a mano (mismo patrón que appProjectBootstrapLayer).
 */
import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useState } from 'react';
import GrammarPhonologyPanel, { type GrammarPhonologyPanelProps } from '../GrammarPhonologyPanel';
import { getDefaultGrammarManifest } from '../../services/normalize';
import type { GrammarManifest, LexiconEntry } from '../../types';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const lexicon: LexiconEntry[] = [
  { ID: '1', Raíz: 'kal', Léxema: ['kala'], Categoría: 'sustantivo', Significado: ['perro'], extraData: {} },
  { ID: '2', Raíz: 'tin', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'], extraData: {} },
  { ID: '3', Raíz: 'sor', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'], extraData: {} },
];

const mounts: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

async function renderPanel(
  initial: GrammarManifest,
  on?: Partial<GrammarPhonologyPanelProps>,
): Promise<{ container: HTMLDivElement; onChange: Mock }> {
  const onChange = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  const props: GrammarPhonologyPanelProps = {
    manifest: initial,
    onChange,
    lexicon: [],
    ...on,
  };
  await act(async () => {
    root.render(<GrammarPhonologyPanel {...props} />);
    await flush();
  });
  return { container, onChange };
}

const clickExtract = async (container: HTMLDivElement) => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent === 'Extraer del léxico',
  ) as HTMLButtonElement | undefined;
  expect(button).toBeDefined();
  await act(async () => {
    button!.click();
    await flush();
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
});

describe('GrammarPhonologyPanel — FASE FX', () => {
  it('infiere fonología del léxico al pulsar "Extraer del léxico"', async () => {
    const { container, onChange } = await renderPanel(getDefaultGrammarManifest(), { lexicon });

    await clickExtract(container);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updates = onChange.mock.calls[0][0] as { phonology: NonNullable<GrammarManifest['phonology']> };
    expect(updates.phonology.inventory.consonants.length).toBeGreaterThan(0);
    expect(updates.phonology.inventory.vowels).toContain('a');
    expect(container.querySelector('[data-testid="phonology-extraction-summary"]')?.textContent).toContain('Extraído de 3 formas');
  });

  it('avisa y no emite cambios cuando el léxico está vacío', async () => {
    const { container, onChange } = await renderPanel(getDefaultGrammarManifest(), { lexicon: [] });

    const button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Extraer del léxico',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flush();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(container.textContent).toContain('El léxico está vacío');
  });

  it('reintentar no duplica: el harness fusiona dos extracciones', async () => {
    const Harness = () => {
      const [manifest, setManifest] = useState<GrammarManifest>(getDefaultGrammarManifest());
      return (
        <GrammarPhonologyPanel
          manifest={manifest}
          lexicon={lexicon}
          onChange={(updates) => setManifest((prev) => ({ ...prev, ...updates }))}
        />
      );
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounts.push({ root, container });
    await act(async () => {
      root.render(<Harness />);
      await flush();
    });

    await clickExtract(container);
    await clickExtract(container);

    const consonantsInput = container.querySelectorAll('input')[0] as HTMLInputElement;
    expect(consonantsInput.value).toBe('k, l, n, r, s, t');
    const vowelsInput = container.querySelectorAll('input')[1] as HTMLInputElement;
    expect(vowelsInput.value).toBe('a, i, o');
  });
});
