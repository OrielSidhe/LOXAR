/**
 * useAppDerivedState.test.tsx — memoización del estado presentacional de `App.tsx`.
 *
 * Verifica que el hook derive en el primer render, recalcule cuando cambian las
 * entradas y mantenga la semántica de los cuatro `useMemo` originales.
 *
 * Environment: jsdom + createRoot (mismo patron que `useOfflineBannerStatus`).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useAppDerivedState } from '../useAppDerivedState';
import type { AppDerivedStateInput } from '../../utils/appDerivedState';
import type { GrammarManifest, LexiconEntry } from '../../types';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const baseManifest: GrammarManifest = {
  meta: { author: 'Test', version: '1.0', sourceFormat: 'json', lastUpdated: '' },
  typology: {
    wordOrder: 'SVO',
    alignment: 'Nominative-Accusative',
    morphology: 'Isolating',
    headDirection: 'Head-Initial',
  },
  strategies: [],
  roles: [],
  notes: [],
  paradigms: [],
  mutationRules: [],
  exceptions: [],
  affixInventory: [],
  preview: { useLexiconAffixes: false },
};

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: 'e1',
  Raíz: 'bask',
  Léxema: ['baskel'],
  Categoría: 'sustantivo',
  Significado: ['caballo'],
  extraData: {},
  ...overrides,
});

const baseInput: AppDerivedStateInput = {
  activeGrammar: baseManifest,
  activeLexicon: [entry()],
  incompleteEntries: [],
  editorMode: 'add',
  entryToComplete: null,
};

let latest: ReturnType<typeof useAppDerivedState> | null = null;

const Probe = ({ input }: { input: AppDerivedStateInput }) => {
  latest = useAppDerivedState(input);
  return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (input: AppDerivedStateInput): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() => {
    root.render(<Probe input={input} />);
  });
};

const rerenderProbe = (input: AppDerivedStateInput): void => {
  const { root, container } = mounts[mounts.length - 1];
  act(() => {
    root.render(<Probe input={input} />);
    void container;
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
});

describe('useAppDerivedState', () => {
  it('deriva el estado completo en el primer render', () => {
    renderProbe(baseInput);

    expect(latest).not.toBeNull();
    expect(latest!.grammarMetrics.rules).toBe(0);
    expect(latest!.pragmaticEngine?.typologyLabel).toBe('isolating');
    expect(latest!.completionStats.total).toBe(1);
    expect(latest!.entryBeingEdited).toBeNull();
  });

  it('recalcula cuando cambia el lexico o el modo de edicion', () => {
    renderProbe(baseInput);
    const target = entry({ ID: 'target' });

    rerenderProbe({ ...baseInput, editorMode: 'complete', entryToComplete: target });
    expect(latest!.entryBeingEdited).toBe(target);

    rerenderProbe({ ...baseInput, activeLexicon: [entry(), entry({ ID: 'e2' })] });
    expect(latest!.completionStats.total).toBe(2);
  });

  it('recalcula el resumen pragmatico cuando cambia el manifiesto', () => {
    renderProbe(baseInput);

    rerenderProbe({
      ...baseInput,
      activeGrammar: {
        ...baseManifest,
        typology: { ...baseManifest.typology, morphology: 'Agglutinative' },
        mutationRules: [
          { id: 'm1', name: 'lenición', pattern: 'b', replacement: 'v', scope: 'consonant' },
        ],
      },
    });

    expect(latest!.pragmaticEngine?.typologyLabel).toBe('agglutinative');
    expect(latest!.pragmaticEngine?.rulesCount).toBe(1);
  });

  it('degrada a metricas en cero si la gramatica desaparece', () => {
    renderProbe(baseInput);

    rerenderProbe({ ...baseInput, activeGrammar: null });

    expect(latest!.pragmaticEngine).toBeUndefined();
    expect(latest!.grammarMetrics.rules).toBe(0);
  });
});
