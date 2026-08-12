import { describe, it, expect } from 'vitest';
import { realizeLexeme } from '../morphology';
import type { GrammarManifest, LexiconEntry } from '../../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [], ...over,
});
const ser = (over: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: 'ser', Raíz: 'ser', Léxema: ['ser'], Categoría: 'verbo', Significado: ['be'], extraData: {}, ...over,
});

describe('exceptions', () => {
  it('returns base form when no exception matches', () => {
    const base = ser();
    const present = realizeLexeme(base, { tense: 'present', person: '1', number: 'sg' }, mk());
    expect(present.form).toBe('ser');
  });

  it('applies matching exception', () => {
    const irregular = ser({ exceptions: [
      { id: 'e1', featureKey: 'tense=present&person=1&number=sg', surfaceForm: 'soy' },
      { id: 'e2', featureKey: 'tense=past', surfaceForm: 'fui' },
    ]});
    expect(realizeLexeme(irregular, { tense: 'present', person: '1', number: 'sg' }, mk()).form).toBe('soy');
    expect(realizeLexeme(irregular, { tense: 'past' }, mk()).form).toBe('fui');
  });
});
