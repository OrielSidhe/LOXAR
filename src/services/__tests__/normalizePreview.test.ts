import { describe, expect, it } from 'vitest';
import {
  getDefaultGrammarManifest,
  normalizeGrammarManifest,
  normalizeLexiconData,
} from '../normalize';
import { getDefaultPreviewEntries } from '../../utils/grammarPreview';
import type { LexiconEntry } from '../../types';

const lexicon: LexiconEntry[] = [
  { ID: '1', Raíz: 'kal', Léxema: ['kala'], Categoría: 'sustantivo', Significado: ['perro'], extraData: {} },
  { ID: '2', Raíz: 'tin', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'], extraData: {} },
  { ID: '3', Raíz: 'sor', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'], extraData: {} },
];

describe('normalize: preview config', () => {
  it('normalizeGrammarManifest conserva las entradas fijadas del preview', () => {
    const normalized = normalizeGrammarManifest({
      preview: {
        useLexiconAffixes: true,
        subjectEntryId: '3',
        verbEntryId: '2',
        objectEntryId: '1',
      },
    });

    expect(normalized.preview).toEqual({
      useLexiconAffixes: true,
      subjectEntryId: '3',
      verbEntryId: '2',
      objectEntryId: '1',
    });
  });

  it('preview ausente queda con el default y sin ids', () => {
    expect(normalizeGrammarManifest({}).preview).toEqual({ useLexiconAffixes: false });
    expect(getDefaultGrammarManifest().preview).toEqual({ useLexiconAffixes: false });
  });

  it('sigue descartando claves ajenas al schema (legado seguro)', () => {
    const normalized = normalizeGrammarManifest({
      preview: { useLexiconAffixes: true, bogus: 'x' },
    });

    expect(normalized.preview).toEqual({ useLexiconAffixes: true });
    expect(normalized.preview && 'bogus' in normalized.preview).toBe(false);
  });

  it('las entradas fijadas sobreviven la recarga del lexicón (normalizeLexiconData)', () => {
    const data = normalizeLexiconData(
      {
        entries: lexicon,
        grammar: {
          preview: {
            useLexiconAffixes: false,
            subjectEntryId: '3',
            verbEntryId: '2',
            objectEntryId: '1',
          },
        },
      },
      'Loxar',
      'es',
    );

    expect(data.grammar.preview).toMatchObject({
      useLexiconAffixes: false,
      subjectEntryId: '3',
      verbEntryId: '2',
      objectEntryId: '1',
    });

    // El preview resuelve contra las entradas fijadas, no contra el auto-fallback.
    const entries = getDefaultPreviewEntries(data.entries, data.grammar.preview);
    expect(entries.subject?.ID).toBe('3');
    expect(entries.verb?.ID).toBe('2');
    expect(entries.object?.ID).toBe('1');
  });
});
