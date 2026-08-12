import { describe, it, expect } from 'vitest';
import { realizeLexeme } from '../morphology';
import type { GrammarManifest, LexiconEntry } from '../../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  ...over,
});

const verb = (over: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: 'v1', Raíz: 'tens', Léxema: ['tens'], Categoría: 'verbo', Significado: ['say'], extraData: {}, ...over,
});

describe('morphology', () => {
  it('applies suffix affix rules', () => {
    const aggManifest = mk({ paradigms: [{ category: 'verbo', slots: [
      { feature: 'tense', order: 1, realization: { kind: 'affix', position: 'suffix', form: '-t' } },
      { feature: 'number', order: 2, realization: { kind: 'affix', position: 'suffix', form: '-il' } },
    ] }] });

    const r1 = realizeLexeme(verb(), { tense: 'past', number: 'pl' }, aggManifest);
    expect(r1.form).toBe('tens-t-il');
    expect(r1.source).toBe('rule');
  });

  it('applies allomorphs based on preceding context', () => {
    const fusManifest = mk({ paradigms: [{ category: 'verbo', slots: [
      { feature: 'tense', order: 1, realization: { kind: 'affix', position: 'suffix', form: '-t' },
        allomorphs: [{ when: 'prevVowel', realization: { kind: 'affix', position: 'suffix', form: '-d' } }] },
    ] }] });

    const r2 = realizeLexeme(verb({ Raíz: 'ka', Léxema: ['ka'] }), { tense: 'past' }, fusManifest);
    expect(r2.form).toBe('ka-d');
  });

  it('handles suppletion over rules', () => {
    const aggManifest = mk({ paradigms: [{ category: 'verbo', slots: [
      { feature: 'tense', order: 1, realization: { kind: 'affix', position: 'suffix', form: '-t' } },
      { feature: 'number', order: 2, realization: { kind: 'affix', position: 'suffix', form: '-il' } },
    ] }] });

    const suppLexeme = verb({ exceptions: [{ id: 'e1', featureKey: 'tense=past', surfaceForm: 'fui' }] });
    const r3 = realizeLexeme(suppLexeme, { tense: 'past' }, aggManifest);
    expect(r3.form).toBe('fui');
    expect(r3.source).toBe('suppletion');
  });
});
