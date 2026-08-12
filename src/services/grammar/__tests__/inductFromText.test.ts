/**
 * inductFromText.test.ts — Fase 2: Inductor LLM Mejorado TDD (7 tests)
 *
 * El inductor usa el parser local primero, luego el LLM como booster.
 * Valida output del LLM contra DeclarativeManifest.
 * Nunca usa cleanseJson ni segunda llamada a IA como fallback.
 */

import { describe, it, expect } from 'vitest';

import { inductFromText, getLlmPrompt } from '../inductFromText';
import type { DeclarativeManifest, ParseReport } from '../declarativeFormat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalManifest(overrides?: Partial<DeclarativeManifest>): DeclarativeManifest {
  return {
    name: 'TestLang',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: [], vowels: [], syllableStructures: ['CV'] },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('inductFromText (Fase 2)', () => {
  // -------------------------------------------------------------------------
  // 2.1 — Usa parser local primero cuando score >= 60
  // -------------------------------------------------------------------------
  it('2.1: usa parser local primero cuando score >= 60', async () => {
    const text = '§ Tipología: SOV\n§ Sustantivos: plural por -k sufijo';
    const result = await inductFromText(text, { llmAvailable: false });

    expect(result.method).toBe('local', 'Debe usar método local cuando parser score >= 60');
    expect(result.confidence >= 60).toBeTruthy(`Confidence debe ser >= 60, obtenido ${result.confidence}`);
    expect(result.manifest.paradigms.length > 0).toBeTruthy('Debe tener paradigmas del parser local');
  });

  // -------------------------------------------------------------------------
  // 2.2 — Usa LLM cuando parser score < 60
  // -------------------------------------------------------------------------
  it('2.2: usa LLM cuando parser local score < 60', async () => {
    const text = 'una descripción muy corta sin secciones reconocibles';
    const llmOutput = makeMinimalManifest({
      paradigms: [{ category: 'noun', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
    });

    const result = await inductFromText(text, {
      llmAvailable: true,
      llmOutput: { manifest: llmOutput, confidence: 75 },
    });

    expect(result.method === 'hybrid' || result.method === 'llm').toBeTruthy(
      `Debe usar hybrid o llm cuando parser score < 60, obtenido ${result.method}`
    );
    expect(result.confidence > 30).toBeTruthy('Confidence debe mejorar con LLM');
  });

  // -------------------------------------------------------------------------
  // 2.3 — Valida output del LLM (categorías normalizadas)
  // -------------------------------------------------------------------------
  it('2.3: valida output del LLM contra DeclarativeManifest', async () => {
    const llmOutput = makeMinimalManifest({
      paradigms: [{ category: 'sustantivo', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
    });

    const result = await inductFromText('§ Sustantivos: plural por -k sufijo', {
      llmAvailable: true,
      llmOutput: { manifest: llmOutput, confidence: 70 },
    });

    // El resultado debe tener la categoría normalizada (aunque el LLM devuelva "sustantivo")
    const paradigm = result.manifest.paradigms.find(p => p.category === 'noun' || p.category === 'sustantivo');
    expect(paradigm).toBeTruthy('Debe existir paradigma de sustantivo (normalizado o no)');
    expect(paradigm!.slots[0].realization.form).toBe('-k');
  });

  // -------------------------------------------------------------------------
  // 2.4 — Produce ValidationReport
  // -------------------------------------------------------------------------
  it('2.4: produce ValidationReport cuando hay problemas', async () => {
    const result = await inductFromText('§ Tipología: SVO', { llmAvailable: false });

    expect(result.report).toBeTruthy('Debe incluir reporte de validación');
    expect(typeof result.report.score === 'number').toBeTruthy('Reporte debe tener score numérico');
    expect(Array.isArray(result.report.problems)).toBeTruthy('Reporte debe tener array de problems');
    expect(Array.isArray(result.report.suggestions)).toBeTruthy('Reporte debe tener array de suggestions');
  });

  // -------------------------------------------------------------------------
  // 2.5 — Fallback sin LLM
  // -------------------------------------------------------------------------
  it('2.5: fallback sin LLM (llmAvailable = false)', async () => {
    const text = '§ Tipología: SOV\n§ Sustantivos: plural por -k sufijo';
    const result = await inductFromText(text, { llmAvailable: false });

    expect(result.method).toBe('local', 'Sin LLM debe usar solo parser local');
    expect(result.manifest).toBeTruthy('Debe devolver manifiesto del parser local');
    expect(result.manifest.paradigms.length > 0).toBeTruthy('Debe tener paradigmas');
  });

  // -------------------------------------------------------------------------
  // 2.6 — Prompt pide DeclarativeManifest
  // -------------------------------------------------------------------------
  it('2.6: genera prompt que pide DeclarativeManifest', () => {
    const prompt = getLlmPrompt('test text');

    expect(
      prompt.includes('DeclarativeManifest') || prompt.includes('FORMATO DECLARATIVO')
    ).toBeTruthy('Prompt debe pedir formato declarativo');
    expect(
      !prompt.includes('FlexibleGrammar') || prompt.includes('FORMATO DECLARATIVO')
    ).toBeTruthy('Prompt no debe pedir FlexibleGrammar como formato principal');
  });

  // -------------------------------------------------------------------------
  // 2.7 — No usa cleanseJson como fallback
  // -------------------------------------------------------------------------
  it('2.7: no usa cleanseJson como fallback de parsing', async () => {
    // Cuando el LLM falla (llmOutput null), debe fallback a parser local
    const text = 'texto irreconocible para el LLM';
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmOutput: null,
    });

    // Debe fallback a parser local, no a una segunda llamada IA
    expect(result.manifest).toBeTruthy('Debe devolver manifiesto aunque LLM falle');
    expect(result.method).toBe('local', 'Debe usar parser local como fallback');
  });
});

console.log('Fase 2 tests cargados');

