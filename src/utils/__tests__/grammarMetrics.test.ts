import { describe, it, expect } from 'vitest';
import { getGrammarMetrics } from '../grammarMetrics';
import type { GrammarManifest } from '../../types';

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

describe('getGrammarMetrics', () => {
  it('devuelve ceros finitos para un manifiesto vacío (nunca NaN)', () => {
    const m = getGrammarMetrics(baseManifest);
    expect(m.rules).toBe(0);
    expect(m.categories).toBe(0);
    expect(m.strategies).toBe(0);
    expect(m.roles).toBe(0);
    expect(m.phonologySounds).toBe(0);
    expect(m.phonologyRules).toBe(0);
    expect(m.syntaxTrees).toBe(0);
    for (const value of Object.values(m)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('deriva los conteos desde la forma canónica del manifiesto', () => {
    const m = getGrammarMetrics({
      ...baseManifest,
      mutationRules: [
        { id: 'm1', name: 'lenición', pattern: 'b', replacement: 'v', scope: 'consonant' },
        { id: 'm2', name: 'nasalización', pattern: 'a', replacement: 'ã', scope: 'vowel' },
      ],
      strategies: [
        { id: 's1', name: 'plural', type: 'affix', appliesTo: ['sustantivo'] },
      ],
      affixInventory: [
        { id: 'a1', form: '-s', type: 'suffix', meaning: 'plural', appliesTo: ['sustantivo'], source: 'manual', enabled: true },
        { id: 'a2', form: 'ma-', type: 'prefix', meaning: 'futuro', appliesTo: ['verbo'], source: 'manual', enabled: true },
        { id: 'a3', form: '-la', type: 'suffix', meaning: 'diminutivo', appliesTo: ['sustantivo'], source: 'manual', enabled: false },
      ],
      paradigms: [{ category: 'verbo', slots: [] }],
      roles: [{ id: 'r1', name: 'Sujeto' }, { id: 'r2', name: 'Objeto' }],
      phonology: {
        inventory: { consonants: ['p', 't', 'k'], vowels: ['a', 'e'] },
        phonotactics: { syllableStructures: ['CV', 'CVC'], maxConsonantClusters: 2 },
      },
      clauseTree: { clauseId: 'c1', root: {} } as GrammarManifest['clauseTree'],
    });

    expect(m.rules).toBe(6); // 2 mutation + 1 strategy + 3 affixes
    expect(m.categories).toBe(1);
    expect(m.strategies).toBe(1);
    expect(m.roles).toBe(2);
    expect(m.phonologySounds).toBe(5);
    expect(m.phonologyRules).toBe(2);
    expect(m.syntaxTrees).toBe(1);
  });

  it('ignora campos legacy que no sobreviven la normalización y no produce NaN', () => {
    const legacy = {
      ...baseManifest,
      morphology: { rules: [{}, {}] },
      syntax: { rules: [{}], roles: [{}] },
      categories: [{}, {}],
      phonology: { consonants: ['p'], rules: [{}] },
    } as unknown as GrammarManifest;

    const m = getGrammarMetrics(legacy);

    expect(m.rules).toBe(0);
    expect(m.categories).toBe(0);
    expect(m.roles).toBe(0);
    expect(m.phonologySounds).toBe(0);
    expect(m.phonologyRules).toBe(0);
    for (const value of Object.values(m)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('maneja manifiesto nulo de forma segura', () => {
    const m = getGrammarMetrics(null);
    expect(m.rules).toBe(0);
    expect(m.phonologySounds).toBe(0);
    expect(Number.isFinite(m.rules)).toBe(true);
  });
});
