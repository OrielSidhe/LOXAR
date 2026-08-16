/**
 * textParser.test.ts — Fase 1: Parser Local TDD (10 tests)
 *
 * El parser local convierte texto libre de gramática → DeclarativeManifest
 * SIN usar LLM. Es determinista y produce un ParseReport.
 *
 * TDD estricto: estos tests se escriben ANTES de textParser.ts.
 * Al inicio, todos fallan porque textParser no existe.
 */

import { describe, it, expect } from 'vitest';

// Import que NO existe todavía (Fase 1 lo crea)
import { parseLocal } from '../textParser';
import type { DeclarativeManifest, ParseReport } from '../declarativeFormat';

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

function assertScore(manifest: DeclarativeManifest, report: ParseReport, expectedMin: number) {
  const score = computeScore(manifest, report);
  expect(
    score >= expectedMin,
    `Score esperado >= ${expectedMin}, obtenido ${score}. Report: ${JSON.stringify(report)}`
  ).toBeTruthy();
}

function computeScore(manifest: DeclarativeManifest, report: ParseReport): number {
  let points = 0;
  const maxPoints = 100;

  // Tipología: 20 pts
  if (manifest.typology.wordOrder && manifest.typology.morphology && manifest.typology.headDirection) {
    points += 20;
  } else if (manifest.typology.wordOrder || manifest.typology.morphology) {
    points += 10;
  }

  // Fonología: 15 pts
  if (manifest.phonology.consonants.length > 0 || manifest.phonology.vowels.length > 0) {
    points += 15;
  }

  // Paradigmas: 40 pts
  if (manifest.paradigms.length > 0) {
    points += 20;
    const slotsWithForm = manifest.paradigms.reduce(
      (acc, p) => acc + p.slots.filter(s => s.realization.form).length,
      0
    );
    if (slotsWithForm > 0) points += 20;
  }

  // Estrategias: 10 pts
  if (manifest.strategies.length > 0) points += 10;

  // Excepciones: 5 pts
  if (manifest.exceptions.length > 0) points += 5;

  // Roles: 5 pts
  if (manifest.roles.length > 0) points += 5;

  // Penalización por secciones no parseadas
  points -= report.sectionsUnparsed.length * 5;

  // Penalización por warnings graves
  points -= report.warnings.filter(w => w.includes('no pudo')).length * 3;

  return Math.max(0, Math.min(maxPoints, points));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('textParser (Fase 1)', () => {
  // -------------------------------------------------------------------------
  // 1.1 — Extrae tipología de prosa
  // -------------------------------------------------------------------------
  it('1.1: parseLocal extrae tipología de prosa', () => {
    const text = `§ Tipología: SOV, aglutinante, head-final`;
    const result = parseLocal(text);
    expect(result.manifest.typology.wordOrder).toBe('SOV');
    expect(result.manifest.typology.morphology).toBe('agglutinative');
    expect(result.manifest.typology.headDirection).toBe('head-final');
    expect(result.report.sectionsFound.includes('typology')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 1.2 — Extrae fonología
  // -------------------------------------------------------------------------
  it('1.2: parseLocal extrae fonología de formato IPA entre barras', () => {
    const text = `§ Fonología: consonantes /p t k s m n/, vocales /a e i o u/`;
    const result = parseLocal(text);
    expect(result.manifest.phonology.consonants).toEqual(['p', 't', 'k', 's', 'm', 'n']);
    expect(result.manifest.phonology.vowels).toEqual(['a', 'e', 'i', 'o', 'u']);
    expect(result.report.sectionsFound.includes('phonology')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 1.3 — Extrae sustantivo con sufijo
  // -------------------------------------------------------------------------
  it('1.3: parseLocal extrae sustantivo con sufijo', () => {
    const text = `§ Sustantivos: plural por -k sufijo`;
    const result = parseLocal(text);
    const paradigm = result.manifest.paradigms.find(p => p.category === 'noun');
    expect(paradigm).toBeTruthy();
    const slot = paradigm!.slots.find(s => s.feature === 'plural');
    expect(slot).toBeTruthy();
    expect(slot!.realization.kind).toBe('affix');
    expect(slot!.realization.form).toBe('-k');
    expect(slot!.realization.position).toBe('suffix');
  });

  // -------------------------------------------------------------------------
  // 1.4 — Extrae verbo con múltiples tiempos
  // -------------------------------------------------------------------------
  it('1.4: parseLocal extrae verbo con múltiples tiempos', () => {
    const text = `§ Verbos: pasado -ed, presente -s, futuro -will`;
    const result = parseLocal(text);
    const paradigm = result.manifest.paradigms.find(p => p.category === 'verb');
    expect(paradigm).toBeTruthy();
    expect(paradigm!.slots.length).toBe(3);
    expect(paradigm!.slots.some(s => s.feature === 'past' && s.realization.form === '-ed')).toBeTruthy();
    expect(paradigm!.slots.some(s => s.feature === 'present' && s.realization.form === '-s')).toBeTruthy();
    expect(paradigm!.slots.some(s => s.feature === 'future' && s.realization.form === '-will')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 1.5 — Extrae excepción supletiva
  // -------------------------------------------------------------------------
  it('1.5: parseLocal extrae excepción supletiva', () => {
    const text = `§ Excepciones: ir → fue (supletiva)`;
    const result = parseLocal(text);
    const ex = result.manifest.exceptions.find(e => e.exceptionPattern === 'ir → fue');
    expect(ex).toBeTruthy();
    expect(ex!.context).toBe('supletiva');
  });

  // -------------------------------------------------------------------------
  // 1.6 — Extrae estrategia de partícula
  // -------------------------------------------------------------------------
  it('1.6: parseLocal extrae estrategia de partícula', () => {
    const text = `§ Estrategias: partícula 'ka' para acusativo`;
    const result = parseLocal(text);
    const strategy = result.manifest.strategies.find(s => s.type === 'particle');
    expect(strategy).toBeTruthy();
    expect(strategy!.particleRule?.marker).toBe('ka');
  });

  // -------------------------------------------------------------------------
  // 1.7 — Genera ParseReport correcto
  // -------------------------------------------------------------------------
  it('1.7: parseLocal genera ParseReport correcto', () => {
    const text = `§ Tipología: SVO`;
    const result = parseLocal(text);
    expect(result.report.sectionsFound.includes('typology')).toBeTruthy();
    expect(Array.isArray(result.report.sectionsUnparsed)).toBeTruthy();
    expect(Array.isArray(result.report.warnings)).toBeTruthy();
    expect(typeof result.report.paradigmsExtracted === 'number').toBeTruthy();
    expect(typeof result.report.exceptionsExtracted === 'number').toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 1.8 — Es determinista
  // -------------------------------------------------------------------------
  it('1.8: parseLocal es determinista (misma entrada → misma salida)', () => {
    const text = `§ Tipología: SOV, aglutinante
§ Sustantivos: plural por -k sufijo
§ Verbos: pasado -ed`;
    const r1 = parseLocal(text);
    const r2 = parseLocal(text);
    expect(JSON.stringify(r1.manifest)).toEqual(JSON.stringify(r2.manifest));
    expect(JSON.stringify(r1.report)).toEqual(JSON.stringify(r2.report));
  });

  // -------------------------------------------------------------------------
  // 1.9 — No falla con texto basura
  // -------------------------------------------------------------------------
  it('1.9: parseLocal no falla con texto basura', () => {
    const text = `asdf qwerty ñandú`;
    const result = parseLocal(text);
    expect(result.manifest).toBeTruthy();
    expect(Array.isArray(result.manifest.paradigms)).toBeTruthy();
    expect(Array.isArray(result.report.warnings)).toBeTruthy();
    expect(result.report.warnings.length > 0 || result.report.sectionsFound.length === 0).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 1.11 — Maneja encabezados y fonemas con ñ y vocales acentuadas
  // -------------------------------------------------------------------------
  it('1.11: parseLocal maneja secciones y fonemas con ñ y vocales acentuadas', () => {
    const text = `§ Ñandú: inventario extendido
§ Fonología: consonantes /p t k ñ/, vocales /a e i o u á é í ó ú/`;
    const result = parseLocal(text);
    expect(result.report.sectionsFound.includes('phonology')).toBeTruthy();
    expect(result.manifest.phonology.consonants).toContain('ñ');
    expect(result.manifest.phonology.vowels).toEqual(
      expect.arrayContaining(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú'])
    );
  });

  // -------------------------------------------------------------------------
  // 1.12 — Maneja formas de afijos con caracteres Unicode
  // -------------------------------------------------------------------------
  it('1.12: parseLocal maneja formas de afijos con caracteres Unicode', () => {
    const text = `§ Sustantivos: número por -ña sufijo`;
    const result = parseLocal(text);
    const paradigm = result.manifest.paradigms.find(p => p.category === 'noun');
    expect(paradigm).toBeTruthy();
    const slot = paradigm!.slots.find(s => s.feature === 'number');
    expect(slot).toBeTruthy();
    expect(slot!.realization.form).toBe('-ña');
  });

  // -------------------------------------------------------------------------
  // 1.10 — Maneja texto parcialmente parseable
  // -------------------------------------------------------------------------
  it('1.10: parseLocal maneja texto parcialmente parseable', () => {
    const text = `§ Tipología: SOV
§ Fonología: /p t k/, /a e i/
§ Sustantivos: plural por -k sufijo
§ Sección desconocida: esta sección no tiene alias reconocible`;
    const result = parseLocal(text);
    // Debe parsear tipología, fonología y sustantivos
    expect(result.report.sectionsFound.includes('typology')).toBeTruthy();
    expect(result.report.sectionsFound.includes('phonology')).toBeTruthy();
    const paradigm = result.manifest.paradigms.find(p => p.category === 'noun');
    expect(paradigm).toBeTruthy();
    // La sección desconocida debe estar en sectionsUnparsed
    expect(
      result.report.sectionsUnparsed.length > 0,
      'Debe reportar secciones no parseadas'
    ).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Test de score mínimo (sanity check del computo)
  // -------------------------------------------------------------------------
  it('score helper: manifiesto completo produce score >= 80', () => {
    const manifest: DeclarativeManifest = {
      name: 'TestLang',
      typology: { wordOrder: 'SOV', morphology: 'agglutinative', headDirection: 'head-final', alignment: 'ergative' },
      phonology: { consonants: ['p', 't', 'k'], vowels: ['a', 'e'], syllableStructures: ['CV', 'CVC'] },
      paradigms: [
        {
          category: 'noun',
          slots: [{ id: 'plural', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }],
        },
      ],
      strategies: [{ id: 's1', name: 'Sufijo plural', type: 'affix', affixRule: { position: 'suffix', form: '-k' } }],
      mutationRules: [],
      exceptions: [{ id: 'e1', ruleDescription: 'ir → fue', exceptionPattern: 'ir → fue', context: 'supletiva' }],
      roles: [{ id: 'subject', name: 'Sujeto' }],
    };
    const report: ParseReport = {
      sectionsFound: ['typology', 'phonology', 'nouns', 'verbs', 'exceptions', 'strategies', 'roles'],
      sectionsUnparsed: [],
      paradigmsExtracted: 1,
      exceptionsExtracted: 1,
      warnings: [],
    };
    assertScore(manifest, report, 80);
  });
});

console.log('Fase 1 tests cargados (deberían fallar porque textParser.ts no existe todavía)');
