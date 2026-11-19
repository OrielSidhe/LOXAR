import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TYPOLOGY,
  buildPreviewSentence,
  getDefaultPreviewEntries,
  getEntryForm,
  getEntryLabel,
  isMeaningfulTypology,
  normalizeCategory,
} from '../grammarPreview';
import { getDefaultGrammarManifest } from '../../services/normalize';
import type { GrammarAffix, GrammarManifest, LexiconEntry } from '../../types';

const lexicon: LexiconEntry[] = [
  { ID: '1', Raíz: 'kal', Léxema: ['kala'], Categoría: 'sustantivo', Significado: ['perro'], extraData: {} },
  { ID: '2', Raíz: 'tin', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'], extraData: {} },
  { ID: '3', Raíz: 'sor', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'], extraData: {} },
];

const withPronoun: LexiconEntry[] = [
  { ID: '9', Raíz: 'mi', Léxema: ['mi'], Categoría: 'pronombre', Significado: ['yo'], extraData: {} },
  ...lexicon,
];

const suffixAffix = (overrides: Partial<GrammarAffix> = {}): GrammarAffix => ({
  id: 'a1',
  form: '-s',
  type: 'suffix',
  meaning: 'plural',
  appliesTo: ['sustantivo'],
  source: 'manual',
  enabled: true,
  ...overrides,
});

describe('grammarPreview: normalizeCategory', () => {
  it('minusculiza y quita diacríticos', () => {
    expect(normalizeCategory('Sustantivo')).toBe('sustantivo');
    expect(normalizeCategory('Árbol')).toBe('arbol');
    expect(normalizeCategory()).toBe('');
  });
});

describe('grammarPreview: labels y formas', () => {
  it('getEntryLabel usa léxema con significado y tiene fallback', () => {
    expect(getEntryLabel(lexicon[0])).toBe('kala - perro');
    expect(getEntryLabel(undefined)).toBe('[sin entrada]');
  });

  it('getEntryForm recorta guiones de afijo y cae a la raíz', () => {
    expect(getEntryForm({ ...lexicon[0], Léxema: ['-ka'] })).toBe('ka');
    expect(getEntryForm({ ...lexicon[0], Léxema: [] })).toBe('kal');
    expect(getEntryForm(undefined)).toBe('...');
  });
});

describe('grammarPreview: getDefaultPreviewEntries', () => {
  it('el objeto no repite al sujeto cuando el preview no fija entradas', () => {
    const entries = getDefaultPreviewEntries(lexicon, { useLexiconAffixes: false });

    expect(entries.subject?.ID).toBe('1');
    expect(entries.verb?.ID).toBe('2');
    expect(entries.object?.ID).toBe('3');
  });

  it('sujeto, verbo y objeto siempre son entradas distintas', () => {
    const entries = getDefaultPreviewEntries(lexicon);
    const ids = [entries.subject?.ID, entries.verb?.ID, entries.object?.ID];

    expect(new Set(ids).size).toBe(3);
  });

  it('respeta las entradas fijadas por el preview', () => {
    const entries = getDefaultPreviewEntries(lexicon, {
      useLexiconAffixes: false,
      subjectEntryId: '3',
      verbEntryId: '2',
      objectEntryId: '1',
    });

    expect(entries.subject?.ID).toBe('3');
    expect(entries.verb?.ID).toBe('2');
    expect(entries.object?.ID).toBe('1');
  });

  it('prioriza el pronombre como sujeto y busca un sustantivo libre para el objeto', () => {
    const entries = getDefaultPreviewEntries(withPronoun);

    expect(entries.subject?.ID).toBe('9');
    expect(entries.object?.ID).toBe('1');
  });

  it('cae a la primera entrada libre cuando no queda ningún sustantivo disponible', () => {
    const mixed: LexiconEntry[] = [
      lexicon[0],
      lexicon[1],
      { ID: '4', Raíz: 'bel', Léxema: ['bela'], Categoría: 'adjetivo', Significado: ['bonito'], extraData: {} },
    ];

    const entries = getDefaultPreviewEntries(mixed);

    expect(entries.object?.ID).toBe('4');
  });

  it('devuelve entradas indefinidas con el léxico vacío', () => {
    const entries = getDefaultPreviewEntries([], { useLexiconAffixes: false });

    expect(entries.subject).toBeUndefined();
    expect(entries.verb).toBeUndefined();
    expect(entries.object).toBeUndefined();
  });
});

describe('grammarPreview: buildPreviewSentence', () => {
  it('arma la oración en orden SVO con las formas de superficie', () => {
    const result = buildPreviewSentence(getDefaultGrammarManifest(), lexicon);

    expect(result.sentence).toBe('kala tini soro');
    expect(result.gloss).toBe('S-V-O');
    expect(result.entries.object?.ID).toBe('3');
  });

  it('respeta el orden de palabras tipológico', () => {
    const base = getDefaultGrammarManifest();
    const manifest: GrammarManifest = {
      ...base,
      typology: { ...base.typology, wordOrder: 'VSO' },
    };

    const result = buildPreviewSentence(manifest, lexicon);

    expect(result.sentence).toBe('tini kala soro');
    expect(result.gloss).toBe('V-S-O');
  });

  it('normaliza un orden libre a SVO', () => {
    const base = getDefaultGrammarManifest();
    const manifest: GrammarManifest = {
      ...base,
      typology: { ...base.typology, wordOrder: 'LIBRE' },
    };

    expect(buildPreviewSentence(manifest, lexicon).gloss).toBe('S-V-O');
  });

  it('aplica los afijos habilitados que corresponden a la categoría', () => {
    const manifest: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      affixInventory: [suffixAffix(), suffixAffix({ id: 'a2', form: 'dis-', type: 'prefix', appliesTo: ['verbo'], enabled: false })],
    };

    const result = buildPreviewSentence(manifest, lexicon);

    expect(result.sentence).toBe('kalas tini soros');
  });

  it('no aplica afijos deshabilitados', () => {
    const manifest: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      affixInventory: [suffixAffix({ enabled: false })],
    };

    expect(buildPreviewSentence(manifest, lexicon).sentence).toBe('kala tini soro');
  });
});

describe('grammarPreview: tipología', () => {
  it('isMeaningfulTypology detecta desvíos del default', () => {
    expect(isMeaningfulTypology(DEFAULT_TYPOLOGY)).toBe(false);
    expect(isMeaningfulTypology(undefined)).toBe(false);
    expect(isMeaningfulTypology({ ...DEFAULT_TYPOLOGY, wordOrder: 'OVS' })).toBe(true);
  });
});
