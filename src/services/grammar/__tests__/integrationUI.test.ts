/**
 * integrationUI.test.ts — Fase 7: Integración UI + E2E (6 tests)
 *
 * Verifica que el nuevo pipeline de gramática es consumible desde la UI
 * y que reemplaza correctamente al viejo grammarParser.ts.
 *
 * E2E: texto crudo → parseLocal → normalize → validate → bridge → usable por UI.
 */

import { describe, it, expect } from 'vitest';

import { parseLocal } from '../textParser';
import { normalize } from '../normalizer';
import { validatePostImport } from '../postImportValidator';
import { bridgeManifest, getStrategiesForCategory } from '../strategyBridge';
import { inductFromText, getLlmPrompt } from '../inductFromText';
import { realizeLexeme, realizeClause } from '../index';

// ---------------------------------------------------------------------------
// Texto de ejemplo (similar a lo que un usuario pegaría en la UI)
// ---------------------------------------------------------------------------

const USER_GRAMMAR_TEXT = `
§ Tipología: SOV, aglutinante, head-final, nominativo-acusativo

§ Fonología:
/p t k m n s l r w j h/
/a e i o u/
CV, CVC

§ Sustantivos:
Plural por -k sufijo
Caso dativo por -ra sufijo

§ Verbos:
Pasado por -t sufijo
Futuro por -lu sufijo

§ Adjetivos:
Comparativo por -sh prefijo

§ Estrategias:
Sufijos de caso: posición suffix, forma -ra
Prefijo comparativo: posición prefix, forma -sh

§ Excepciones:
ir → fue (supletiva)
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integración UI + E2E (Fase 7)', () => {
  // -------------------------------------------------------------------------
  // 7.1 — Módulo grammar/index.ts exporta realizeLexeme
  // -------------------------------------------------------------------------
  it('7.1: grammar/index.ts exporta realizeLexeme (contrato del motor)', () => {
    expect(typeof realizeLexeme === 'function').toBeTruthy('realizeLexeme debe estar exportado');
    expect(typeof realizeClause === 'function').toBeTruthy('realizeClause debe estar exportado');
  });

  // -------------------------------------------------------------------------
  // 7.2 — Pipeline E2E: texto crudo → manifiesto validado
  // -------------------------------------------------------------------------
  it('7.2: pipeline E2E produce manifiesto validado desde texto crudo', () => {
    // Paso 1: Parser local
    const localResult = parseLocal(USER_GRAMMAR_TEXT);
    expect(localResult.manifest.typology.wordOrder).toBeTruthy('Parser debe extraer wordOrder');

    // Paso 2: Normalizer
    const { manifest: normalized, report: normReport } = normalize(localResult.manifest);
    expect(normReport.didChange || normReport.changes.length >= 0).toBeTruthy('Normalizer debe producir reporte');

    // Paso 3: Validador post-import
    const validation = validatePostImport(normalized);
    expect(typeof validation.score === 'number').toBeTruthy('Debe tener score');
    expect(Array.isArray(validation.problems)).toBeTruthy('Debe tener problems');
    expect(Array.isArray(validation.suggestions)).toBeTruthy('Debe tener suggestions');
    expect(validation.sections.typology === 'ok').toBeTruthy('Tipología debe ser ok');

    // Paso 4: Bridge
    const { strategies: bridged, strategyIndex } = bridgeManifest(normalized);
    expect(bridged.length > 0).toBeTruthy('Debe tener estrategias bridgeadas');

    // Verificar que se pueden obtener estrategias por categoría
    const nounStrats = getStrategiesForCategory('sustantivo', strategyIndex);
    expect(Array.isArray(nounStrats)).toBeTruthy('Debe poder obtener estrategias por categoría');
  });

  // -------------------------------------------------------------------------
  // 7.3 — inductFromText reemplaza a grammarParser.parseGrammar
  // -------------------------------------------------------------------------
  it('7.3: inductFromText es reemplazo de grammarParser.parseGrammar', async () => {
    const result = await inductFromText(USER_GRAMMAR_TEXT, { llmAvailable: false });

    // Debe producir un manifiesto completo, no solo un GrammarManifest legacy
    expect(result.manifest.typology.wordOrder).toBeTruthy('Debe extraer wordOrder');
    expect(result.manifest.paradigms.length > 0).toBeTruthy('Debe extraer paradigmas');
    expect(result.report).toBeTruthy('Debe incluir reporte de validación');
    expect(result.method === 'local').toBeTruthy('Sin LLM debe usar método local');
    expect(result.confidence >= 50).toBeTruthy(`Confidence debe ser >= 50, obtenido ${result.confidence}`);
  });

  // -------------------------------------------------------------------------
  // 7.4 — getLlmPrompt genera prompt compatible con DeclarativeManifest
  // -------------------------------------------------------------------------
  it('7.4: getLlmPrompt genera prompt en formato DeclarativeManifest', () => {
    const prompt = getLlmPrompt(USER_GRAMMAR_TEXT);

    expect(prompt.includes('FORMATO DECLARATIVO') || prompt.includes('DeclarativeManifest')).toBeTruthy(
      'Prompt debe pedir formato declarativo'
    );
    expect(prompt.includes('paradigms')).toBeTruthy('Prompt debe mencionar paradigms');
    expect(prompt.includes('strategies')).toBeTruthy('Prompt debe mencionar strategies');
    expect(prompt.includes('typology')).toBeTruthy('Prompt debe mencionar typology');
  });

  // -------------------------------------------------------------------------
  // 7.5 — Pipeline es consumible por UI (sin errores de tipo)
  // -------------------------------------------------------------------------
  it('7.5: pipeline es consumible por UI sin errores de tipo', () => {
    const localResult = parseLocal(USER_GRAMMAR_TEXT);
    const { manifest: normalized } = normalize(localResult.manifest);
    const validation = validatePostImport(normalized);
    const { strategies: bridged } = bridgeManifest(normalized);

    // Verificar que todos los campos son serializables (JSON-safe)
    const json = JSON.stringify({
      typology: normalized.typology,
      paradigms: normalized.paradigms,
      strategies: bridged,
      validation: {
        score: validation.score,
        ok: validation.ok,
        problems: validation.problems,
        sections: validation.sections,
      },
    });

    const parsed = JSON.parse(json);
    expect(parsed.typology.wordOrder).toBeTruthy('typology.wordOrder debe ser serializable');
    expect(Array.isArray(parsed.paradigms)).toBeTruthy('paradigms debe ser serializable');
    expect(Array.isArray(parsed.strategies)).toBeTruthy('strategies debe ser serializable');
    expect(typeof parsed.validation.score === 'number').toBeTruthy('validation.score debe ser serializable');
  });

  // -------------------------------------------------------------------------
  // 7.6 — E2E: texto mínimo → manifiesto utilizable
  // -------------------------------------------------------------------------
  it('7.6: E2E texto mínimo produce manifiesto utilizable por UI', async () => {
    const minimalText = `§ Tipología: SVO
§ Sustantivos: plural por -k sufijo
§ Verbos: pasado por -t sufijo`;

    const result = await inductFromText(minimalText, { llmAvailable: false });

    // La UI puede mostrar estos datos directamente
    expect(result.manifest.typology.wordOrder === 'SVO').toBeTruthy('Debe extraer wordOrder SVO del texto');
    expect(result.manifest.paradigms.length >= 1).toBeTruthy('Debe tener al menos un paradigma');
    expect(result.report.sections.typology === 'ok').toBeTruthy('Sección typology debe ser ok');
    expect(result.report.sections.paradigms !== 'empty').toBeTruthy('Sección paradigms no debe estar vacía');

    // La UI puede mostrar el reporte de validación
    expect(result.report.problems.length >= 0).toBeTruthy('Debe tener problems array');
    expect(result.report.suggestions.length >= 0).toBeTruthy('Debe tener suggestions array');
  });
});

console.log('Fase 7 tests cargados');
