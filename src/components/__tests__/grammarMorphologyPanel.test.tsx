/**
 * GrammarMorphologyPanel.test.tsx — FASE MY (gauntlet v3.14).
 *
 * Verifica el botón "Extraer del léxico": infiere afijos con evidencia por regla,
 * los fusiona con el inventario actual (reintentar no duplica), muestra la
 * evidencia junto a cada regla y avisa cuando el léxico está vacío.
 *
 * Environment: jsdom montado a mano (mismo patrón que grammarPhonologyPanel).
 */
import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useState } from 'react';
import GrammarMorphologyPanel, { type GrammarMorphologyPanelProps } from '../GrammarMorphologyPanel';
import { getDefaultGrammarManifest } from '../../services/normalize';
import type { GrammarManifest, GrammarAffix, LexiconEntry } from '../../types';

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

const baseProps = (manifest: GrammarManifest) => ({
  lexicon: [] as LexiconEntry[],
  lexiconAffixes: [] as GrammarAffix[],
  onAddAffix: vi.fn(),
  onRemoveAffix: vi.fn(),
  onUpdateAffix: vi.fn(),
  onUpdatePreview: vi.fn(),
  manifest,
});

async function renderPanel(
  initial: GrammarManifest,
  on?: Partial<GrammarMorphologyPanelProps>,
): Promise<{ container: HTMLDivElement; onChange: Mock }> {
  const onChange = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  const props: GrammarMorphologyPanelProps = {
    ...baseProps(initial),
    onChange,
    ...on,
  };
  await act(async () => {
    root.render(<GrammarMorphologyPanel {...props} />);
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

/** Harness con estado: simula al `GrammarTab` real, que re-renderiza con el manifiesto fusionado. */
async function renderHarness(initial: GrammarManifest, lexicon: LexiconEntry[]): Promise<{
  container: HTMLDivElement;
  onChange: Mock;
}> {
  const onChange = vi.fn();
  const Harness = () => {
    const [manifest, setManifest] = useState<GrammarManifest>(initial);
    return (
      <GrammarMorphologyPanel
        {...baseProps(manifest)}
        lexicon={lexicon}
        onChange={(updates) => {
          onChange(updates);
          setManifest((prev) => ({ ...prev, ...updates }));
        }}
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
  return { container, onChange };
}

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('GrammarMorphologyPanel — FASE MY', () => {
  it('infiere afijos del léxico y los entrega como affixInventory', async () => {
    const { container, onChange } = await renderPanel(getDefaultGrammarManifest(), { lexicon });

    await clickExtract(container);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updates = onChange.mock.calls[0][0] as { affixInventory: GrammarAffix[] };
    const forms = updates.affixInventory.map((affix) => affix.form);
    expect(forms).toContain('-a');
    expect(forms).toContain('-i');
    expect(forms).toContain('-o');
    expect(container.querySelector('[data-testid="morphology-extraction-summary"]')?.textContent).toContain(
      'Extraído de 3 entradas',
    );
  });

  it('muestra la evidencia por regla junto a cada afijo extraído', async () => {
    const { container, onChange } = await renderHarness(getDefaultGrammarManifest(), lexicon);

    await clickExtract(container);

    const evidence = container.querySelector('[data-testid="morphology-affix-evidence"]');
    expect(evidence).not.toBeNull();
    expect(evidence!.textContent).toContain('kal → kala');
    expect(evidence!.textContent).toContain('perro');
    // El harness de fusión recibe la evidencia persistida en el afijo.
    const updates = onChange.mock.calls[0][0] as { affixInventory: GrammarAffix[] };
    const suffixA = updates.affixInventory.find((affix) => affix.form === '-a');
    expect(suffixA?.evidence?.pairs[0]).toMatchObject({ base: 'kal', form: 'kala' });
  });

  it('avisa y no emite cambios cuando el léxico está vacío', async () => {
    const { container, onChange } = await renderPanel(getDefaultGrammarManifest(), { lexicon: [] });

    await clickExtract(container);

    expect(onChange).not.toHaveBeenCalled();
    expect(container.textContent).toContain('El léxico está vacío');
  });

  it('reintentar no duplica: el harness fusiona dos extracciones', async () => {
    const Harness = () => {
      const [manifest, setManifest] = useState<GrammarManifest>(getDefaultGrammarManifest());
      return (
        <GrammarMorphologyPanel
          {...baseProps(manifest)}
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

    const formInputs = Array.from(container.querySelectorAll('input')).filter(
      (input) => input.placeholder === '-ka',
    ) as HTMLInputElement[];
    expect(formInputs).toHaveLength(3);
    expect(formInputs.map((input) => input.value)).toEqual(['-a', '-i', '-o']);
  });

  it('conserva los afijos manuales y les adjunta la evidencia inferida', async () => {
    const manifest = getDefaultGrammarManifest();
    manifest.affixInventory = [
      { id: 'manual_1', form: '-a', type: 'suffix', meaning: 'plural', appliesTo: [], source: 'manual', enabled: true },
    ];

    const { container, onChange } = await renderHarness(manifest, lexicon);

    await clickExtract(container);

    const updates = onChange.mock.calls[0][0] as { affixInventory: GrammarAffix[] };
    expect(updates.affixInventory).toHaveLength(3);
    expect(updates.affixInventory[0].id).toBe('manual_1');
    expect(updates.affixInventory[0].meaning).toBe('plural');
    expect(updates.affixInventory[0].evidence?.pairs[0]).toMatchObject({ base: 'kal', form: 'kala' });
    // El manual (-a) recibe la evidencia adjunta; los dos inferidos nuevos también la muestran.
    expect(container.querySelectorAll('[data-testid="morphology-affix-evidence"]').length).toBe(3);
  });
});
