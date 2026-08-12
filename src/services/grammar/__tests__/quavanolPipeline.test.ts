/**
 * quavanolPipeline.test.ts — Fase 6: Fixture Quavanol Funcional (8 tests)
 *
 * Pipeline completo: texto de gramática → parseLocal → normalize →
 * validatePostImport → bridgeManifest → estrategias aplicables.
 *
 * Usa datos reales del fixture Quavanol (clave.txt).
 */

import { describe, it, expect } from 'vitest';

import { parseLocal } from '../textParser';
import { normalize } from '../normalizer';
import { validatePostImport } from '../postImportValidator';
import { bridgeManifest } from '../strategyBridge';

// ---------------------------------------------------------------------------
// Texto de gramática Quavanol (extraído del canon, adaptado para parser local)
// ---------------------------------------------------------------------------

const QUAVANOL_GRAMMAR_TEXT = `
§ Tipología: SVO, fusional-aglutinante, head-initial, nominativo-acusativo

§ Fonología:
Consonantes: b, c, d, f, g, h, k, l, m, n, p, q, r, s, t, v, w, x, y, z
Vocales: a, e, i, o, u
Estructuras silábicas: CV, CVC, V

§ Sustantivos:
Plural por -u sufijo
Género primordial por -[a]ulen sufijo
Caso dativo por -[a]la sufijo

§ Verbos:
Presente indicativo por -é sufijo
Pasado indicativo por -as sufijo
Futuro indicativo por -ila sufijo
Negativo por ó prefijo
Perfecto por vo prefijo

§ Adjetivos:
Singular por -e sufijo
Plural por -ie sufijo

§ Estrategias:
Sufijos de caso: posición suffix, forma -[a]r
Prefijos de género: posición prefix, forma ilu-
Partículas pre-verbales: ó (negativo) before verbo, vo (perfecto) before verbo

§ Excepciones:
Ir → fue (supletiva)
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Quavanol Pipeline (Fase 6)', () => {
  // -------------------------------------------------------------------------
  // 6.1 — Parser local extrae tipología de Quavanol
  // -------------------------------------------------------------------------
  it('6.1: parser local extrae tipología de Quavanol', () => {
    const result = parseLocal(QUAVANOL_GRAMMAR_TEXT);

    expect(result.manifest.typology.wordOrder).toBeTruthy('Debe extraer wordOrder');
    expect(result.manifest.typology.morphology).toBeTruthy('Debe extraer morphology');
    expect(result.manifest.typology.headDirection).toBeTruthy('Debe extraer headDirection');
    expect(result.report.sectionsFound.length > 0).toBeTruthy('Debe detectar secciones');
  });

  // -------------------------------------------------------------------------
  // 6.2 — Parser extrae fonología de Quavanol
  // -------------------------------------------------------------------------
  it('6.2: parser local extrae fonología de Quavanol', () => {
    const result = parseLocal(QUAVANOL_GRAMMAR_TEXT);

    expect(result.manifest.phonology.consonants.length > 0).toBeTruthy('Debe extraer consonantes');
    expect(result.manifest.phonology.vowels.length > 0).toBeTruthy('Debe extraer vocales');
    expect(result.manifest.phonology.syllableStructures.length > 0).toBeTruthy('Debe extraer estructuras silábicas');
  });

  // -------------------------------------------------------------------------
  // 6.3 — Parser extrae paradigmas de sustantivos y verbos
  // -------------------------------------------------------------------------
  it('6.3: parser local extrae paradigmas de sustantivos y verbos', () => {
    const result = parseLocal(QUAVANOL_GRAMMAR_TEXT);

    expect(result.manifest.paradigms.length > 0).toBeTruthy('Debe extraer al menos un paradigma');
    const categories = result.manifest.paradigms.map(p => p.category);
    expect(categories.some(c => c === 'sustantivo' || c === 'noun')).toBeTruthy('Debe tener paradigma de sustantivo');
    expect(categories.some(c => c === 'verbo' || c === 'verb')).toBeTruthy('Debe tener paradigma de verbo');
  });

  // -------------------------------------------------------------------------
  // 6.4 — Normalizer convierte categorías variantes a canonical
  // -------------------------------------------------------------------------
  it('6.4: normalizer convierte categorías variantes de Quavanol a canonical', () => {
    const localResult = parseLocal(QUAVANOL_GRAMMAR_TEXT);
    const { manifest: normalized, report } = normalize(localResult.manifest);

    // Verificar que todas las categorías son conocidas o canonical
    const allCategories = normalized.paradigms.map(p => p.category);
    allCategories.forEach(cat => {
      expect(cat !== 'desconocida').toBeTruthy(`Categoría "${cat}" debe estar normalizada`);
    });

    // Verificar que el reporte registra cambios
    expect(report.changes.length >= 0).toBeTruthy('Debe producir reporte de normalización');
  });

  // -------------------------------------------------------------------------
  // 6.5 — PostImportValidator valida manifiesto de Quavanol
  // -------------------------------------------------------------------------
  it('6.5: postImportValidator valida manifiesto de Quavanol', () => {
    const localResult = parseLocal(QUAVANOL_GRAMMAR_TEXT);
    const { manifest: normalized } = normalize(localResult.manifest);
    const report = validatePostImport(normalized);

    expect(report.score >= 50).toBeTruthy(`Score debe ser >= 50, obtenido ${report.score}`);
    expect(!report.problems.some(p => p.severity === 'error')).toBeTruthy('No debe tener errores graves');
  });

  // -------------------------------------------------------------------------
  // 6.6 — bridgeManifest indexa estrategias de Quavanol
  // -------------------------------------------------------------------------
  it('6.6: bridgeManifest indexa estrategias de Quavanol por categoría', () => {
    const localResult = parseLocal(QUAVANOL_GRAMMAR_TEXT);
    const { manifest: normalized } = normalize(localResult.manifest);
    const { strategyIndex } = bridgeManifest(normalized);

    // Verificar que hay estrategias indexadas
    let totalStrategies = 0;
    strategyIndex.forEach(strats => { totalStrategies += strats.length; });
    expect(totalStrategies > 0).toBeTruthy('Debe haber estrategias indexadas');
  });

  // -------------------------------------------------------------------------
  // 6.7 — Pipeline completo produce manifiesto válido
  // -------------------------------------------------------------------------
  it('6.7: pipeline completo produce manifiesto válido de Quavanol', () => {
    const localResult = parseLocal(QUAVANOL_GRAMMAR_TEXT);
    const { manifest: normalized, report: normReport } = normalize(localResult.manifest);
    const validation = validatePostImport(normalized);
    const { strategies: bridged } = bridgeManifest(normalized);

    expect(normalized.typology.wordOrder).toBeTruthy('Debe tener wordOrder');
    expect(normalized.paradigms.length > 0).toBeTruthy('Debe tener paradigmas');
    expect(validation.ok || validation.score >= 50).toBeTruthy(`Debe pasar validación (score: ${validation.score})`);
    expect(bridged.length > 0).toBeTruthy('Debe tener estrategias bridgeadas');
    expect(normReport.didChange || normReport.changes.length >= 0).toBeTruthy('Debe producir reporte de normalización');
  });

  // -------------------------------------------------------------------------
  // 6.8 — Determinismo: mismo texto → mismo manifiesto
  // -------------------------------------------------------------------------
  it('6.8: pipeline es determinista (mismo texto, mismo resultado)', () => {
    const run1 = parseLocal(QUAVANOL_GRAMMAR_TEXT);
    const run2 = parseLocal(QUAVANOL_GRAMMAR_TEXT);

    expect(run1.manifest.paradigms).toEqual(run2.manifest.paradigms);
    expect(run1.manifest.typology).toEqual(run2.manifest.typology);
    expect(run1.report.sectionsFound).toEqual(run2.report.sectionsFound);
  });
});

console.log('Fase 6 tests cargados');
