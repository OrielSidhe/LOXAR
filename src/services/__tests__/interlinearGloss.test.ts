import { describe, it, expect } from 'vitest';
import { glossSentence, formatInterlinear } from '../interlinearGlossService';
import type { LexiconEntry } from '../../types';

/**
 * Regression coverage for the runtime finding in the browser: glossing a sentence
 * with lexemes loaded from the lexicon rendered "? ?" instead of the entry
 * category. `glossSentence` only tagged a morpheme with the entry category when
 * the morpheme matched the bare root, so derived lexemes (root "bask" -> lexeme
 * "boskel") fell back to `unknownGloss` for every morpheme even though the token
 * was a known lexeme.
 */

const entry = (overrides: Partial<LexiconEntry>): LexiconEntry => ({
  ID: '1',
  Raíz: 'bask',
  Léxema: ['boskel'],
  Categoría: 'sustantivo',
  Significado: ['caballo'],
  extraData: {},
  ...overrides,
});

describe('glossSentence', () => {
  it('glosses a derived lexeme with the entry category when the root does not segment', () => {
    const result = glossSentence('boskel', [entry({})]);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].gloss).toEqual(['SUSTANTIVO']);
    expect(result.lines[0].notes).toEqual(['caballo']);
  });

  it('glosses a lexeme identical to the root with the entry category', () => {
    const result = glossSentence('rend', [entry({ Raíz: 'rend', Léxema: ['rend'], Categoría: 'verbo', Significado: ['correr'] })]);
    expect(result.lines[0].gloss).toEqual(['VERBO']);
  });

  it('keeps per-morpheme glosses when the root does segment out of the lexeme', () => {
    const result = glossSentence('rendal', [
      entry({ Raíz: 'rend', Léxema: ['rendal'], Categoría: 'verbo', Significado: ['correr'], extraData: { affixes: ['al'] } }),
    ]);
    expect(result.lines[0].morphemes).toEqual(['rend', 'al']);
    expect(result.lines[0].gloss).toEqual(['VERBO', '?']);
  });

  it('falls back to the default category for unknown tokens', () => {
    const result = glossSentence('krypto', [entry({})]);
    expect(result.lines[0].gloss).toEqual(['STEM']);
  });

  it('formats the interlinear block with original, gloss and free translation', () => {
    const result = glossSentence('boskel rendal', [
      entry({}),
      entry({ ID: '2', Raíz: 'rend', Léxema: ['rendal'], Categoría: 'verbo', Significado: ['correr'] }),
    ]);
    const formatted = formatInterlinear(result);
    const lines = formatted.split('\n');
    expect(lines[0]).toBe('boskel rendal');
    expect(lines[1]).toBe('SUSTANTIVO VERBO');
    expect(lines[2]).toBe('caballo correr');
  });
});
