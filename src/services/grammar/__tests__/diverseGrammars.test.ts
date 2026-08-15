import { describe, it, expect } from 'vitest';
import { parseLocal } from '../textParser';
import { normalize } from '../normalizer';
import { validatePostImport } from '../postImportValidator';
import type { GrammarManifest } from '../../types';

const cases = [
  {
    name: 'Klingon-like (OVS, suffixes)',
    text: `Klingon grammar:
Nouns: noun, verb, adjective, pronoun, numeral
Word order: OVS
Morphology: agglutinative
Head direction: head-final
Alignment: ergative-absolutive
Plural suffix: -pu' for beings
Past tense: -pu'`,
  },
  {
    name: 'Esperanto-like (SVO, agglutinative)',
    text: `Esperanto grammar:
Partos de parolo: substantivo, verbo, adjektivo, adverbo, numeralo, pronomo, prepozicio
Vortoordo: SVO
Morfologio: agglutinative
Kapdirekto: head-initial
Pluralo: -j
Akkuzativo: -n
Verbo tempo: -is past, -as present, -os future`,
  },
  {
    name: 'Spanish natural description',
    text: `Gramática del español:
Categorías: sustantivo, verbo, adjetivo, adverbio, pronombre, preposición, conjunción, artículo
Orden de palabras: SVO
Morfología: fusional
Dirección del núcleo: head-initial
Género: masculino, femenino
Número: singular, plural
Artículos: el, la, los, las
Sufijo plural: -s, -es`,
  },
  {
    name: 'English minimal',
    text: `English:
Nouns: noun, verb, adjective, adverb, preposition, pronoun, determiner, conjunction
Order: SVO
Morphology: isolating
Head: head-initial
Plural: -s, -es, irregular
Past tense: -ed, irregular`,
  },
  {
    name: 'Japanese-like (SOV, postpositions)',
    text: `Japanese grammar:
品詞: noun, verb, adjective, particle, adverb, pronoun
語順: SOV
形態論: agglutinative
頭部方向: head-final
助詞: は topic, が subject, を object, に dative, で instrumental, の genitive
動詞活用: た past, て te-form, ない negative`,
  },
];

describe('Diverse conlang/natural-language import (local-first pipeline)', () => {
  for (const c of cases) {
    it(`${c.name}: parses and normalizes without crashing`, () => {
      const parsed = parseLocal(c.text);
      const normalized = normalize(parsed.manifest);
      const report = validatePostImport(normalized.manifest as GrammarManifest);

      expect(normalized.manifest).toBeDefined();
      expect(report).toBeDefined();
      expect(typeof report.score).toBe('number');
      console.log(`[${c.name}] score=${report.score} ok=${report.ok} problems=${report.problems.length}`);
    });
  }
});
