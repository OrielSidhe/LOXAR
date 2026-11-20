import { describe, it, expect } from 'vitest';
import { buildDashboardStats } from '../dashboardStats';
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

const entry = (id: string, categoría: string): LexiconEntry => ({
  ID: id,
  Raíz: `raiz${id}`,
  Léxema: [`${id}a`],
  Categoría: categoría,
  Significado: [`significado ${id}`],
  extraData: {},
});

describe('buildDashboardStats', () => {
  it('sin gramática deja los bloques de gramática indefinidos y no produce NaN', () => {
    const stats = buildDashboardStats({
      grammar: null,
      lexicon: [entry('1', 'sustantivo'), entry('2', 'verbo')],
      incompleteCount: 1,
    });

    expect(stats.grammar).toBeUndefined();
    expect(stats.phonology).toBeUndefined();
    expect(stats.syntax).toBeUndefined();
    expect(stats.lexicon).toEqual({ entries: 2, categories: 2 });
    expect(stats.workbench).toEqual({ pending: 1, completed: 0 });
    expect(stats.semantics).toEqual({ fields: 0, relations: 0 });
    expect(stats.translator).toEqual({ translations: 0 });
    expect(stats.collections).toEqual({ collections: 0 });
    expect(stats.neography).toBeUndefined();

    for (const value of Object.values(stats)) {
      if (value === undefined) continue;
      for (const n of Object.values(value)) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  it('deriva las métricas de gramática desde el manifiesto canónico', () => {
    const stats = buildDashboardStats({
      grammar: {
        ...baseManifest,
        mutationRules: [
          { id: 'm1', name: 'lenición', pattern: 'b', replacement: 'v', scope: 'consonant' },
        ],
        strategies: [{ id: 's1', name: 'plural', type: 'affix', appliesTo: ['sustantivo'] }],
        affixInventory: [
          {
            id: 'a1',
            form: '-s',
            type: 'suffix',
            meaning: 'plural',
            appliesTo: ['sustantivo'],
            source: 'manual',
            enabled: true,
          },
        ],
        paradigms: [{ category: 'verbo', slots: [] }],
        roles: [{ id: 'r1', name: 'Sujeto' }, { id: 'r2', name: 'Objeto' }],
        phonology: {
          inventory: { consonants: ['p', 't', 'k'], vowels: ['a', 'e'] },
          phonotactics: { syllableStructures: ['CV', 'CVC'], maxConsonantClusters: 2 },
        },
        clauseTree: { clauseId: 'c1', root: {} } as GrammarManifest['clauseTree'],
      },
      lexicon: [],
      incompleteCount: 0,
    });

    expect(stats.grammar).toEqual({ rules: 3, categories: 1, strategies: 1, roles: 2 });
    expect(stats.phonology).toEqual({ sounds: 5, rules: 2 });
    expect(stats.syntax).toEqual({ rules: 3, trees: 1 });
  });

  it('cuenta categorías únicas ignorando las vacías', () => {
    const stats = buildDashboardStats({
      grammar: null,
      lexicon: [
        entry('1', 'sustantivo'),
        entry('2', 'sustantivo'),
        entry('3', ''),
        entry('4', 'verbo'),
        entry('5', ''),
      ],
      incompleteCount: 0,
    });

    expect(stats.lexicon).toEqual({ entries: 5, categories: 2 });
  });

  it('maneja léxico vacío de forma segura', () => {
    const stats = buildDashboardStats({ grammar: undefined, lexicon: [], incompleteCount: 0 });

    expect(stats.lexicon).toEqual({ entries: 0, categories: 0 });
    expect(stats.grammar).toBeUndefined();
  });
});
