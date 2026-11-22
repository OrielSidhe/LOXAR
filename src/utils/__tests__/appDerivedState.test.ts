/**
 * appDerivedState.test.ts — derivación de estado presentacional de `App.tsx`.
 *
 * Contratos preservados desde los cuatro `useMemo` originales:
 *  - `pragmaticEngine` es `undefined` sin `typology` en el manifiesto;
 *  - `typologyLabel` se deriva de `morphology` (nunca hardcodeado);
 *  - `rulesCount` reutiliza `getGrammarMetrics` (una sola fuente de conteo);
 *  - los campos de tipología caen a fallback explícito, nunca `undefined`;
 *  - `entryBeingEdited` solo existe en modo `'complete'`.
 */
import { describe, it, expect } from 'vitest';
import {
  buildPragmaticEngineSummary,
  deriveAppState,
  type AppDerivedStateInput,
} from '../appDerivedState';
import type { GrammarManifest, LexiconEntry } from '../../types';

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

describe('buildPragmaticEngineSummary', () => {
  it('devuelve undefined si el manifiesto no tiene tipologia', () => {
    const noTypology = { ...baseManifest, typology: undefined } as GrammarManifest;
    expect(buildPragmaticEngineSummary(noTypology)).toBeUndefined();
    expect(buildPragmaticEngineSummary(null)).toBeUndefined();
    expect(buildPragmaticEngineSummary(undefined)).toBeUndefined();
  });

  it('deriva el label desde la morfologia del manifiesto', () => {
    expect(buildPragmaticEngineSummary({ ...baseManifest, typology: { ...baseManifest.typology, morphology: 'Agglutinative' } })?.typologyLabel)
      .toBe('agglutinative');
    expect(buildPragmaticEngineSummary({ ...baseManifest, typology: { ...baseManifest.typology, morphology: 'Fusional' } })?.typologyLabel)
      .toBe('flexive');
  });

  it('propaga los campos de tipologia guardados', () => {
    const summary = buildPragmaticEngineSummary(baseManifest);
    expect(summary?.alignment).toBe('Nominative-Accusative');
    expect(summary?.wordOrder).toBe('SVO');
    expect(summary?.headDirection).toBe('Head-Initial');
  });

  it('aplica fallback explicito cuando faltan campos de tipologia', () => {
    const sparse = {
      ...baseManifest,
      typology: { wordOrder: '', alignment: '', morphology: '', headDirection: '' },
    } as GrammarManifest;
    const summary = buildPragmaticEngineSummary(sparse);
    expect(summary?.alignment).toBe('nominative');
    expect(summary?.wordOrder).toBe('');
    expect(summary?.headDirection).toBe('');
    expect(summary?.typologyLabel).toBe('isolating');
  });

  it('reutiliza el contador de reglas recibido y clausura activeClauseType en null', () => {
    const withClause = {
      ...baseManifest,
      pragmaticEngine: { activeClauseType: 'declarativa' },
    } as GrammarManifest;
    expect(buildPragmaticEngineSummary(baseManifest, 7)?.rulesCount).toBe(7);
    expect(buildPragmaticEngineSummary(baseManifest)?.activeClauseType).toBeNull();
    expect(buildPragmaticEngineSummary(withClause, 7)?.activeClauseType).toBe('declarativa');
  });
});

describe('deriveAppState', () => {
  it('deriva metricas y resumen pragmatico del manifiesto canónico', () => {
    const state = deriveAppState({
      ...baseInput,
      activeGrammar: {
        ...baseManifest,
        mutationRules: [{ id: 'm1', name: 'lenición', pattern: 'b', replacement: 'v', scope: 'consonant' }],
        strategies: [{ id: 's1', name: 'plural', type: 'affix', appliesTo: ['sustantivo'] }],
      },
    });

    expect(state.grammarMetrics.rules).toBe(2);
    expect(state.pragmaticEngine?.rulesCount).toBe(2);
    expect(state.pragmaticEngine?.typologyLabel).toBe('isolating');
  });

  it('devuelve metricas en cero y sin resumen si no hay gramatica activa', () => {
    const state = deriveAppState({ ...baseInput, activeGrammar: null });

    expect(state.grammarMetrics.rules).toBe(0);
    expect(state.grammarMetrics.categories).toBe(0);
    expect(state.pragmaticEngine).toBeUndefined();
  });

  it('calcula las estadisticas de completitud sobre el lexico y el lote pendiente', () => {
    const complete = entry();
    const pendingMeaning = entry({ ID: 'e2', Significado: [] });
    const pendingCategory = entry({ ID: 'e3', Categoría: 'desconocida', Significado: [] });

    const state = deriveAppState({
      ...baseInput,
      activeLexicon: [complete, pendingMeaning, pendingCategory],
      incompleteEntries: [pendingMeaning, pendingCategory],
    });

    expect(state.completionStats.total).toBe(3);
    expect(state.completionStats.totalIncomplete).toBe(2);
    expect(state.completionStats.needsFunction).toBe(1);
  });

  it('solo expone la entrada en edicion en modo completar', () => {
    const target = entry({ ID: 'target' });
    expect(deriveAppState({ ...baseInput, editorMode: 'add', entryToComplete: target }).entryBeingEdited)
      .toBeNull();
    expect(deriveAppState({ ...baseInput, editorMode: 'complete', entryToComplete: target }).entryBeingEdited)
      .toBe(target);
    expect(deriveAppState({ ...baseInput, editorMode: 'complete', entryToComplete: null }).entryBeingEdited)
      .toBeNull();
  });

  it('no produce NaN en ninguna métrica con entradas vacías', () => {
    const state = deriveAppState({
      activeGrammar: null,
      activeLexicon: [],
      incompleteEntries: [],
      editorMode: 'add',
      entryToComplete: null,
    });
    for (const value of Object.values(state.grammarMetrics)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(state.completionStats.total).toBe(0);
  });
});
