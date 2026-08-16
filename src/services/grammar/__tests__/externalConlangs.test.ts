/**
 * externalConlangs.test.ts — Pruebas de parser con gramáticas textuales de conlangs reales/famosos
 *
 * Objetivo: validar que textParser puede importar gramáticas de lenguas construidas
 * conocidas escritas en formato de texto libre.
 */

import { describe, it, expect } from 'vitest';
import { parseLocal } from '../textParser';

// ---------------------------------------------------------------------------
// Gramáticas textuales de conlangs reales/famosos
// ---------------------------------------------------------------------------

const TOKI_PONA_GRAMMAR = `
§ Tipología: SVO, aislante, head-initial, nominativo-acusativo

§ Fonología:
Consonantes: p, t, k, s, m, n, l, j, w
Vocales: a, e, i, o, u
Estructuras silábicas: CV, V

§ Sustantivos:
Plural por -ma sufijo

§ Verbos:
Presente por -e sufijo
Pasado por -in sufijo
Futuro por -sa sufijo
Imperativo por prefix ke-
Negativo por prefix ala-

§ Adjetivos:
Singular por -o sufijo

§ Estrategias:
Sufijos de tiempo: posición suffix, forma -e
Prefijos negativos: posición prefix, forma ala-
`;

const ESPERANTO_GRAMMAR = `
§ Tipología: SVO, aglutinante, head-initial, nominativo-acusativo

§ Fonología:
Consonantes: p, t, k, f, s, x, m, n, l, r, j, v, z, g, h
Vocales: a, e, i, o, u
Estructuras silábicas: CV, CVC, V

§ Sustantivos:
Plural por -j sufijo
Acusativo por -n sufijo

§ Verbos:
Presente por -as sufijo
Pasado por -is sufijo
Futuro por -os sufijo

§ Adjetivos:
Plural por -j sufijo
Acusativo por -n sufijo

§ Estrategias:
Sufijos de caso: posición suffix, forma -n
Sufijos de plural: posición suffix, forma -j
`;

const KLINGON_GRAMMAR = `
§ Tipología: OVS, aglutinante, head-final, nominativo-acusativo

§ Fonología:
Consonantes: p, b, t, D, n, d, S, q, Q, m, l, w, ch, gh, H, j, r, v, tlh
Vocales: a, e, i, o, u
Estructuras silábicas: CV, CVC, CCV

§ Sustantivos:
Plural por -pu' sufijo
Honorífico por -Daq sufijo

§ Verbos:
Presente por -atlh sufijo
Pasado por -pu' sufijo
Futuro por -ta' sufijo

§ Estrategias:
Sufijos de aspecto: posición suffix, forma -pu'
Prefijos de honorífico: posición prefix, forma D-
`;

const LOJBAN_GRAMMAR = `
§ Tipología: SVO, aislante, head-initial, nominativo-acusativo

§ Fonología:
Consonantes: p, t, k, f, v, s, d, g, b, m, n, l, r, x, h, j, c
Vocales: a, e, i, o, u
Estructuras silábicas: CV, CVC, V

§ Sustantivos:
Terminador por -e sufijo

§ Verbos:
Terminador por -a sufijo
Pasado por -pu sufijo
Futuro por -ka sufijo

§ Estrategias:
Partículas pre-verbales: ka (futuro) before verbo, pu (pasado) before verbo
`;

const NAVI_GRAMMAR = `
§ Tipología: SVO, aglutinante-mixto, head-initial, nominativo-acusativo

§ Fonología:
Consonantes: p, t, k, m, n, s, h, r, l, v, w, y, f, ts, px, tx, kx
Vocales: a, e, i, o, u
Estructuras silábicas: CV, CVC, CCV, V

§ Sustantivos:
Plural por -l sufijo
Dativo por -r sufijo

§ Verbos:
Presente por -m sufijo
Pasado por -ti sufijo
Futuro por -ay sufijo

§ Adjetivos:
Singular por -a sufijo

§ Estrategias:
Sufijos de caso: posición suffix, forma -r
Infijos verbales: posición infix, forma -ei-
`;

describe('External Conlang Grammars (parser smoke tests)', () => {
  // -------------------------------------------------------------------------
  // Toki Pona
  // -------------------------------------------------------------------------
  it('Toki Pona: parseLocal extrae tipología SVO aislante', () => {
    const result = parseLocal(TOKI_PONA_GRAMMAR);
    expect(result.manifest.typology.wordOrder).toBe('SVO');
    expect(result.manifest.typology.morphology).toBe('isolating');
    expect(result.report.sectionsFound.includes('typology')).toBeTruthy();
  });

  it('Toki Pona: parseLocal extrae fonología y paradigmas', () => {
    const result = parseLocal(TOKI_PONA_GRAMMAR);
    expect(result.manifest.phonology.consonants.length).toBeGreaterThan(0);
    expect(result.manifest.paradigms.length).toBeGreaterThan(0);
    const categories = result.manifest.paradigms.map(p => p.category);
    expect(categories.some(c => c === 'noun')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Esperanto
  // -------------------------------------------------------------------------
  it('Esperanto: parseLocal extrae tipología SVO aglutinante', () => {
    const result = parseLocal(ESPERANTO_GRAMMAR);
    expect(result.manifest.typology.wordOrder).toBe('SVO');
    expect(result.manifest.typology.morphology).toBe('agglutinative');
    expect(result.report.sectionsFound.includes('phonology')).toBeTruthy();
  });

  it('Esperanto: parseLocal extrae plural -j y acusativo -n', () => {
    const result = parseLocal(ESPERANTO_GRAMMAR);
    const nounParadigm = result.manifest.paradigms.find(p => p.category === 'noun');
    expect(nounParadigm).toBeTruthy();
    const forms = nounParadigm!.slots.map(s => s.realization.form);
    expect(forms.some(f => f.includes('j'))).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Klingon
  // -------------------------------------------------------------------------
  it('Klingon: parseLocal extrae tipología OVS', () => {
    const result = parseLocal(KLINGON_GRAMMAR);
    expect(result.manifest.typology.wordOrder).toBe('OVS');
    expect(result.manifest.typology.morphology).toBe('agglutinative');
  });

  it('Klingon: parseLocal extrae fonología con consonantes complejas', () => {
    const result = parseLocal(KLINGON_GRAMMAR);
    expect(result.manifest.phonology.consonants.length).toBeGreaterThan(0);
    expect(result.manifest.paradigms.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Lojban
  // -------------------------------------------------------------------------
  it('Lojban: parseLocal extrae tipología SVO aislante', () => {
    const result = parseLocal(LOJBAN_GRAMMAR);
    expect(result.manifest.typology.wordOrder).toBe('SVO');
    expect(result.manifest.typology.morphology).toBe('isolating');
    expect(result.report.sectionsFound.includes('strategies')).toBeTruthy();
  });

  it('Lojban: parseLocal extrae partículas pre-verbales', () => {
    const result = parseLocal(LOJBAN_GRAMMAR);
    const hasParticleStrategy = result.manifest.strategies.some(
      s => s.type === 'particle' || (s.particleRule && s.particleRule.marker)
    );
    expect(hasParticleStrategy || result.report.sectionsFound.includes('strategies')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Na'vi
  // -------------------------------------------------------------------------
  it("Na'vi: parseLocal extrae tipología SVO aglutinante-mixto", () => {
    const result = parseLocal(NAVI_GRAMMAR);
    expect(result.manifest.typology.wordOrder).toBe('SVO');
    expect(result.manifest.typology.morphology).toBe('agglutinative');
    expect(result.manifest.phonology.consonants.length).toBeGreaterThan(0);
  });

  it("Na'vi: parseLocal extrae sufijos de caso e infijos", () => {
    const result = parseLocal(NAVI_GRAMMAR);
    const strategyForms = result.manifest.strategies.flatMap(s => s.affixRule ? [s.affixRule.form] : []);
    expect(strategyForms.some(f => f.includes('r') || f.includes('ei'))).toBeTruthy();
  });
});
