import { describe, expect, it } from 'vitest';
import {
  collectClusters,
  collectWordForms,
  cleanWordForm,
  extractPhonologyFromLexicon,
  isVowelGrapheme,
  maxRunOf,
  mergePhonology,
  mergeUnique,
  minCountFor,
} from '../phonologyExtraction';
import type { LexiconEntry, PhonologyConfig } from '../../types';

const entry = (id: string, formas: string[], raíz = ''): LexiconEntry => ({
  ID: id,
  Raíz: raíz,
  Léxema: formas,
  Categoría: 'sustantivo',
  Significado: ['x'],
  extraData: {},
});

const lexicon: LexiconEntry[] = [
  entry('1', ['kala'], 'kal'),
  entry('2', ['tini'], 'tin'),
  entry('3', ['soro'], 'sor'),
];

describe('phonologyExtraction: utilidades', () => {
  it('isVowelGrapheme resuelve diacríticos y trata y/w como consonantes', () => {
    expect(isVowelGrapheme('a')).toBe(true);
    expect(isVowelGrapheme('Á')).toBe(true);
    expect(isVowelGrapheme('ü')).toBe(true);
    expect(isVowelGrapheme('y')).toBe(false);
    expect(isVowelGrapheme('w')).toBe(false);
    expect(isVowelGrapheme('k')).toBe(false);
  });

  it('cleanWordForm conserva letras acentuadas y quita no letras', () => {
    expect(cleanWordForm(' Á-guila_1 ')).toBe('águila');
  });

  it('collectWordForms usa Léxema y cae a Raíz cuando está vacío', () => {
    const forms = collectWordForms([
      entry('1', ['kala', 'katas'], 'kal'),
      entry('2', [], 'sor'),
      entry('3', [], ''),
    ]);
    expect(forms).toEqual(['kala', 'katas', 'sor']);
  });

  it('minCountFor filtra grafemas únicos solo con léxicos grandes', () => {
    expect(minCountFor(3)).toBe(1);
    expect(minCountFor(9)).toBe(1);
    expect(minCountFor(10)).toBe(2);
    expect(minCountFor(100)).toBe(2);
    expect(minCountFor(1000)).toBe(20);
  });

  it('collectClusters y maxRunOf detectan clusters consonánticos', () => {
    expect(collectClusters(['k', 'l', 'a'], false)).toEqual(['kl']);
    expect(maxRunOf(['k', 'l', 'a'], false)).toBe(2);
    expect(maxRunOf(['k', 'a', 'l', 'a'], false)).toBe(1);
    expect(collectClusters(['a', 'i'], true)).toEqual(['ai']);
  });

  it('mergeUnique deduplica por minúscula y preserva el orden', () => {
    expect(mergeUnique(['p', 'P', 't'], ['t', 'k'])).toEqual(['p', 't', 'k']);
    expect(mergeUnique([], ['a', ''])).toEqual(['a']);
  });
});

describe('phonologyExtraction: extractPhonologyFromLexicon', () => {
  it('infiere inventario y estructuras de un léxico simple', () => {
    const { phonology, evidence } = extractPhonologyFromLexicon(lexicon);

    expect(phonology.inventory.consonants).toEqual(['k', 'l', 'n', 'r', 's', 't']);
    expect(phonology.inventory.vowels).toEqual(['a', 'i', 'o']);
    expect(phonology.phonotactics.syllableStructures).toEqual(['CV']);
    expect(phonology.phonotactics.maxConsonantClusters).toBe(1);
    expect(evidence.wordCount).toBe(3);
    expect(evidence.syllableStructures).toEqual([{ structure: 'CV', count: 6 }]);
  });

  it('detecta estructuras CCV y clusters consonánticos', () => {
    const { phonology } = extractPhonologyFromLexicon([entry('1', ['kla']), entry('2', ['pla'])]);

    expect(phonology.phonotactics.syllableStructures).toContain('CCV');
    expect(phonology.phonotactics.maxConsonantClusters).toBe(2);
    expect(phonology.phonotactics.consonantClusters).toEqual(['kl', 'pl']);
  });

  it('reintentar NO duplica: la extracción es idempotente', () => {
    const first = extractPhonologyFromLexicon(lexicon);
    const second = extractPhonologyFromLexicon(lexicon, first.phonology);

    expect(second.phonology).toEqual(first.phonology);
  });

  it('fusiona con la fonología manual sin duplicar ni pisar', () => {
    const current: PhonologyConfig = {
      inventory: { consonants: ['x', 'k'], vowels: ['y'] },
      phonotactics: { syllableStructures: ['CVC'], maxConsonantClusters: 3 },
    };

    const { phonology } = extractPhonologyFromLexicon(lexicon, current);

    expect(phonology.inventory.consonants).toEqual(['x', 'k', 'l', 'n', 'r', 's', 't']);
    expect(phonology.inventory.vowels).toEqual(['y', 'a', 'i', 'o']);
    expect(phonology.phonotactics.syllableStructures).toEqual(['CVC', 'CV']);
    expect(phonology.phonotactics.maxConsonantClusters).toBe(3);
  });

  it('conserva la grafía acentuada y la clasifica como vocal', () => {
    const { phonology } = extractPhonologyFromLexicon([entry('1', ['ágila'])]);

    expect(phonology.inventory.vowels).toContain('á');
    expect(phonology.inventory.consonants).toEqual(['g', 'l']);
  });

  it('filtra grafemas que aparecen una sola vez en léxicos grandes', () => {
    const many: LexiconEntry[] = Array.from({ length: 99 }, (_, i) => entry(String(i), ['ana']));
    many.push(entry('rarito', ['qana']));

    const { phonology } = extractPhonologyFromLexicon(many);

    expect(phonology.inventory.consonants).not.toContain('q');
    expect(phonology.inventory.consonants).toContain('n');
  });

  it('con el léxico vacío devuelve la fonología actual sin cambios', () => {
    const current: PhonologyConfig = {
      inventory: { consonants: ['p'], vowels: ['a'] },
      phonotactics: { syllableStructures: ['CV'], maxConsonantClusters: 1 },
    };

    const { phonology, evidence } = extractPhonologyFromLexicon([], current);

    expect(phonology).toEqual(current);
    expect(evidence.wordCount).toBe(0);
  });

  it('mergePhonology une clusters y estructuras de ambos lados', () => {
    const base: PhonologyConfig = {
      inventory: { consonants: ['p'], vowels: ['a'] },
      phonotactics: { syllableStructures: ['CV'], maxConsonantClusters: 1, consonantClusters: ['pr'] },
    };
    const incoming: PhonologyConfig = {
      inventory: { consonants: ['t'], vowels: ['e'] },
      phonotactics: { syllableStructures: ['CVC'], maxConsonantClusters: 2, vowelClusters: ['ae'] },
    };

    const merged = mergePhonology(base, incoming);

    expect(merged.inventory.consonants).toEqual(['p', 't']);
    expect(merged.inventory.vowels).toEqual(['a', 'e']);
    expect(merged.phonotactics.syllableStructures).toEqual(['CV', 'CVC']);
    expect(merged.phonotactics.maxConsonantClusters).toBe(2);
    expect(merged.phonotactics.consonantClusters).toEqual(['pr']);
    expect(merged.phonotactics.vowelClusters).toEqual(['ae']);
  });
});
