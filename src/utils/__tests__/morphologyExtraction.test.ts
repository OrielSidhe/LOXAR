/**
 * morphologyExtraction.test.ts — FASE MY (gauntlet v3.14).
 *
 * Verifica la inferencia de afijos desde pares base → forma del léxico, el
 * umbral de respaldo, el dedupe de pares y la idempotencia de la fusión.
 */
import { describe, it, expect } from 'vitest';
import {
  collectMorphologyPairs,
  dedupePairs,
  extractMorphologyFromLexicon,
  isPlausibleAffix,
  mergeAffixes,
  minAffixCountFor,
} from '../morphologyExtraction';
import type { GrammarAffix, LexiconEntry } from '../../types';

const entry = (over: Partial<LexiconEntry>): LexiconEntry => ({
  ID: over.ID ?? '1',
  Raíz: over.Raíz ?? '',
  Léxema: over.Léxema ?? [],
  Categoría: over.Categoría ?? '',
  Significado: over.Significado ?? [],
  extraData: {},
});

const dogLexicon: LexiconEntry[] = [
  entry({ ID: '1', Raíz: 'kal', Léxema: ['kala'], Categoría: 'sustantivo', Significado: ['perro'] }),
  entry({ ID: '2', Raíz: 'tin', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'] }),
  entry({ ID: '3', Raíz: 'sor', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'] }),
];

describe('morphologyExtraction — FASE MY', () => {
  it('detecta sufijos: forma = raíz + segmento', () => {
    const pairs = collectMorphologyPairs(dogLexicon);
    const suffix = pairs.find((pair) => pair.base === 'kal');
    expect(suffix).toBeDefined();
    expect(suffix!.affix).toBe('a');
    expect(suffix!.type).toBe('suffix');
    expect(suffix!.form).toBe('kala');
  });

  it('detecta prefijos: forma = segmento + raíz', () => {
    const pairs = collectMorphologyPairs([
      entry({ ID: 'p1', Raíz: 'sol', Léxema: ['oksol'], Categoría: 'sustantivo' }),
      entry({ ID: 'p2', Raíz: 'mar', Léxema: ['okmar'], Categoría: 'sustantivo' }),
    ]);
    const prefixes = pairs.filter((pair) => pair.type === 'prefix');
    expect(prefixes).toHaveLength(2);
    expect(prefixes.every((pair) => pair.affix === 'ok')).toBe(true);
  });

  it('exige una raíz registrada de al menos 2 letras: sin ella no hay evidencia', () => {
    expect(collectMorphologyPairs([entry({ Raíz: 'k', Léxema: ['ka'] })])).toHaveLength(0);
    expect(collectMorphologyPairs([entry({ Raíz: '', Léxema: ['ka'] })])).toHaveLength(0);
    expect(collectMorphologyPairs([entry({ Raíz: 'kal', Léxema: [] })])).toHaveLength(0);
  });

  it('una forma idéntica a la raíz no propone afijo', () => {
    expect(collectMorphologyPairs([entry({ Raíz: 'kal', Léxema: ['kal'] })])).toHaveLength(0);
  });

  it('deduplica pares repetidos por base → forma', () => {
    const pairs = collectMorphologyPairs([
      entry({ ID: '1', Raíz: 'kal', Léxema: ['kala'] }),
      entry({ ID: '2', Raíz: 'kal', Léxema: ['kala'] }),
    ]);
    expect(pairs).toHaveLength(2);
    expect(dedupePairs(pairs)).toHaveLength(1);
  });

  it('descarta afijos implausibles (vacío o demasiado largos)', () => {
    expect(isPlausibleAffix('')).toBe(false);
    expect(isPlausibleAffix('a')).toBe(true);
    expect(isPlausibleAffix('abcdef')).toBe(false);
  });

  it('el umbral de respaldo crece con el número de pares observados', () => {
    expect(minAffixCountFor(5)).toBe(1);
    expect(minAffixCountFor(6)).toBe(2);
  });

  it('extrae afijos con evidencia por regla y forma legible', () => {
    const result = extractMorphologyFromLexicon(dogLexicon);
    const suffixA = result.affixes.find((affix) => affix.form === '-a');
    expect(suffixA).toBeDefined();
    expect(suffixA!.type).toBe('suffix');
    expect(suffixA!.source).toBe('lexicon');
    expect(suffixA!.enabled).toBe(true);
    expect(suffixA!.meaning).toBe('sustantivo');
    expect(suffixA!.appliesTo).toContain('sustantivo');
    expect(suffixA!.evidence?.count).toBe(1);
    expect(suffixA!.evidence?.pairs[0]).toMatchObject({ base: 'kal', form: 'kala', category: 'sustantivo' });
    expect(result.evidence.pairCount).toBe(3);
    expect(result.evidence.wordCount).toBe(3);
  });

  it('con 6+ pares exige al menos 2 respaldos y descarta el de una sola ocurrencia', () => {
    const entries: LexiconEntry[] = [
      entry({ ID: '1', Raíz: 'kal', Léxema: ['kala'] }),
      entry({ ID: '2', Raíz: 'mar', Léxema: ['mara'] }),
      entry({ ID: '3', Raíz: 'sor', Léxema: ['soro'] }),
      entry({ ID: '4', Raíz: 'tin', Léxema: ['tini'] }),
      entry({ ID: '5', Raíz: 'lun', Léxema: ['lunu'] }),
      entry({ ID: '6', Raíz: 'vez', Léxema: ['vezo'] }),
      entry({ ID: '7', Raíz: 'nil', Léxema: ['nilka'] }),
    ];
    const result = extractMorphologyFromLexicon(entries);
    const forms = result.affixes.map((affix) => affix.form);
    expect(forms).not.toContain('-ka');
    expect(result.evidence.pairCount).toBe(7);
  });

  it('fusiona con el inventario actual sin duplicar (idempotente)', () => {
    const once = mergeAffixes([], extractMorphologyFromLexicon(dogLexicon).affixes);
    const twice = mergeAffixes(once, extractMorphologyFromLexicon(dogLexicon).affixes);
    expect(twice).toHaveLength(once.length);
    expect(twice.map((affix) => affix.id)).toEqual(once.map((affix) => affix.id));
  });

  it('la extracción reentrante es un punto fijo sobre el inventario ya fusionado', () => {
    const first = extractMorphologyFromLexicon(dogLexicon);
    const second = extractMorphologyFromLexicon(dogLexicon, first.affixes);
    expect(second.affixes).toHaveLength(first.affixes.length);
    expect(second.affixes.map((affix) => affix.id)).toEqual(first.affixes.map((affix) => affix.id));
  });

  it('preserva un afijo manual y le adjunta evidencia cuando el inferido la tiene', () => {
    const manual: GrammarAffix = {
      id: 'manual_1',
      form: '-a',
      type: 'suffix',
      meaning: 'plural',
      appliesTo: ['sustantivo'],
      source: 'manual',
      enabled: true,
    };
    const merged = mergeAffixes([manual], extractMorphologyFromLexicon(dogLexicon).affixes);
    expect(merged).toHaveLength(3);
    expect(merged[0].id).toBe('manual_1');
    expect(merged[0].meaning).toBe('plural');
    expect(merged[0].evidence?.pairs[0]).toMatchObject({ base: 'kal', form: 'kala' });
  });

  it('dedupea por grafía limpiada: un sufijo manual "a" y el inferido "-a" son el mismo', () => {
    const manual: GrammarAffix = {
      id: 'manual_1',
      form: 'a',
      type: 'suffix',
      meaning: 'plural',
      appliesTo: [],
      source: 'manual',
      enabled: true,
    };
    const merged = mergeAffixes([manual], extractMorphologyFromLexicon(dogLexicon).affixes);
    expect(merged).toHaveLength(3);
  });

  it('sin pares devuelve el inventario actual y evidencia vacía', () => {
    const current: GrammarAffix[] = [
      { id: 'm', form: '-ka', type: 'suffix', meaning: 'pasado', appliesTo: [], source: 'manual', enabled: true },
    ];
    const result = extractMorphologyFromLexicon([entry({ Raíz: 'kal', Léxema: ['kal'] })], current);
    expect(result.affixes).toBe(current);
    expect(result.evidence.pairCount).toBe(0);
  });
});
