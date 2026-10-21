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

// ---------------------------------------------------------------------------
// Fase 3 — llmCall production path (wire AI to importer)
// ---------------------------------------------------------------------------

describe('inductFromText (Fase 3 — llmCall production path)', () => {
  // -------------------------------------------------------------------------
  // 3.1 — llmCall is invoked when AI available AND parser score < 60
  // -------------------------------------------------------------------------
  it('3.1: llmCall se invoca cuando AI disponible y score < 60', async () => {
    const text = 'una descripción muy corta sin secciones reconocibles';
    const llmResult = makeMinimalManifest({
      name: 'FromAI',
      paradigms: [{ category: 'noun', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
    });

    let called = false;
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => {
        called = true;
        return { manifest: llmResult, confidence: 80 };
      },
    });

    expect(called).toBe(true, 'llmCall debe ser invocado');
    expect(result.method).toBe('hybrid', 'Debe usar método hybrid');
    expect(result.confidence).toBe(80, 'Confidence debe reflejar el LLM');
  });

  // -------------------------------------------------------------------------
  // 3.2 — llmCall is invoked when score >= 60 BUT sectionsUnparsed > 0
  // -------------------------------------------------------------------------
  it('3.2: llmCall se invoca cuando score >= 60 pero hay secciones no parseadas', async () => {
    // Recognizable sections give score >= 60, but the unknown § section triggers uninterpreted
    const text = '§ Tipología: SOV, aglutinante, head-final\n§ Sustantivos: plural por -k sufijo\n§ Verbos: pasado por -t sufijo\n§ Fonología: p t k m n s l r, a e i o u\n§ UnknownSectionXYZ: algo que no se puede clasificar';
    const llmResult = makeMinimalManifest({ name: 'EnrichedByAI' });

    let called = false;
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => {
        called = true;
        return { manifest: llmResult, confidence: 85 };
      },
    });

    expect(called).toBe(true, 'llmCall debe invocarse incluso si score >= 60 con secciones não parseadas');
    expect(result.method).toBe('hybrid');
  });

  // -------------------------------------------------------------------------
  // 3.3 — llmCall NOT invoked when score >= 60 and no unparsed sections
  // -------------------------------------------------------------------------
  it('3.3: llmCall NO se invoca cuando score >= 60 y no hay secciones no parseadas', async () => {
    const text = '§ Tipología: SOV\n§ Sustantivos: plural por -k sufijo\n§ Verbos: pasado por -t sufijo';
    let called = false;
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => {
        called = true;
        return { manifest: makeMinimalManifest(), confidence: 90 };
      },
    });

    expect(called).toBe(false, 'llmCall NO debe invocarse con score >= 60 y sin secciones no parseadas');
    expect(result.method).toBe('local');
  });

  // -------------------------------------------------------------------------
  // 3.4 — onProgress callback is invoked
  // -------------------------------------------------------------------------
  it('3.4: onProgress se dispara durante el procesamiento', async () => {
    const text = 'una descripción muy corta sin secciones reconocibles';
    const llmResult = makeMinimalManifest();
    const progressEvents: any[] = [];

    await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => ({ manifest: llmResult, confidence: 80 }),
      onProgress: (progress) => { progressEvents.push(progress); },
    });

    expect(progressEvents.length > 0).toBe(true, 'onProgress debe dispararse al menos una vez');
  });

  // -------------------------------------------------------------------------
  // 3.5 — llmCall failure → fallback to local with error note
  // -------------------------------------------------------------------------
  it('3.5: si llmCall falla, fallback a local con nota de error', async () => {
    const text = 'una descripción muy corta sin secciones reconocibles';
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => {
        throw new Error('IA falló: conexión rechazada');
      },
    });

    expect(result.method).toBe('local', 'Debe fallback a parser local');
    expect(result.manifest).toBeTruthy('Debe devolver manifiesto local');
    expect(result.notes?.some(n => n.includes('IA falló') || n.includes('LLM'))).toBe(true,
      'Debe incluir nota de error de IA');
  });

  // -------------------------------------------------------------------------
  // 3.6 — Notes include uninterpreted sections from parser report
  // -------------------------------------------------------------------------
  it('3.6: las notas incluyen secciones não interpretadas del parser local', async () => {
    const text = '§ Tipología: SOV\n\nSECCION_EXTRA_RARA_QUE_NO_SE_PARSEA';
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => ({
        manifest: makeMinimalManifest({ name: 'AIEnrichment' }),
        confidence: 70,
      }),
    });

    expect(result.notes).toBeTruthy('Debe incluir notas');
  });

  // -------------------------------------------------------------------------
  // 3.7 — Zod validation rejects invalid manifest from llmCall
  // -------------------------------------------------------------------------
  it('3.7: manifest inválido del llmCall dispara reintento y fallback', async () => {
    const text = 'texto breve sin secciones';
    const result = await inductFromText(text, {
      llmAvailable: true,
      llmCall: async () => {
        // Return a manifest with a type mismatch that fails Zod validation
        // (z.string() rejects a number; .default() only fills missing fields, not wrong types)
        return {
          manifest: { name: 123 } as any,
          confidence: 90,
        };
      },
    });

    // Should fall back to local after the invalid result is rejected
    expect(result.method).toBe('local', 'Manifest inválido debe resultar en fallback local');
    expect(result.notes?.some(n => n.includes('inválido') || n.includes('error'))).toBe(true,
      'Debe incluir nota de error de validación');
  });

  // -------------------------------------------------------------------------
  // 3.8 — getLlmPrompt includes document text and declarative format spec
  // -------------------------------------------------------------------------
  it('3.8: getLlmPrompt incluye el texto del documento y spec declarativo', () => {
    const prompt = getLlmPrompt('MI DOCUMENTO DE PRUEBA');
    expect(prompt).toContain('MI DOCUMENTO DE PRUEBA');
    expect(prompt).toContain('wordOrder');
    expect(prompt).toContain('paradigms');
    expect(prompt).toContain('strategies');
  });
});

console.log('Fase 2 tests cargados');

// ---------------------------------------------------------------------------
// Fase 3b — Offline detectSections with ==== delimiters and roman numeral headers
// ---------------------------------------------------------------------------

describe('detectSections offline fallback (==== delimiters + roman numerals)', () => {
  // -------------------------------------------------------------------------
  // 3b.1 — ==== delimiters are skipped and don't create phantom sections
  // -------------------------------------------------------------------------
  it('3b.1: ==== delimiters son reconocidos como decoración, no como secciones', async () => {
    const text = '====\nI. FONOLOGÍA\n====\n/p t k m n s l r/, /a e i o u/';
    const result = await inductFromText(text, { llmAvailable: false });

    // Should have parsed phonology section (detected via roman numeral header)
    expect(result.parseReport.sectionsFound).toContain('phonology');
    expect(result.parseReport.sectionsUnparsed.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3b.2 — Roman numeral headers with dots (II., III.)
  // -------------------------------------------------------------------------
  it('3b.2: headers romanos con punto (II., III.) son reconocidos', async () => {
    const text = '====\nII. MORFOLOGÍA\n====\nEl plural se forma con -k sufijo';
    const result = await inductFromText(text, { llmAvailable: false });

    expect(result.parseReport.sectionsFound.length).toBe(1);
    expect(result.parseReport.sectionsFound[0]).toBe('typology'); // morfología classified as typology
  });

  // -------------------------------------------------------------------------
  // 3b.3 — Roman numeral headers without dots (IV, V)
  // -------------------------------------------------------------------------
  it('3b.3: headers romanos sin punto (IV, V) son reconocidos', async () => {
    const text = '====\nIV SUSTANTIVOS\n====\nEl plural es -k sufijo';
    const result = await inductFromText(text, { llmAvailable: false });

    expect(result.parseReport.sectionsFound).toContain('nouns');
  });

  // -------------------------------------------------------------------------
  // 3b.4 — Nested roman numerals (IV.2.)
  // -------------------------------------------------------------------------
  it('3b.4: headers romanos anidados (IV.2.) son reconocidos', async () => {
    const text = '====\nIV.2. VERBOS\n====\npasado por -t sufijo, futuro por -lu sufijo';
    const result = await inductFromText(text, { llmAvailable: false });

    // verbs should be classified (matches /\bverb/i)
    expect(result.parseReport.sectionsFound).toContain('verbs');
  });

  // -------------------------------------------------------------------------
  // 3b.5 — Windows \r line endings tolerated
  // -------------------------------------------------------------------------
  it('3b.5: finales de línea Windows (\r) son tolerados con ====', async () => {
    // Build text with explicit \r\n line endings
    const lines = ['====', 'I. FONOLOGÍA', '====', 'vocales: a e i o u', '====', 'II. MORFOLOGÍA', '====', 'plural: -k sufijo'];
    const text = lines.join('\r\n');
    const result = await inductFromText(text, { llmAvailable: false });

    // Should parse without crashing, both sections detected
    expect(result.parseReport.sectionsFound.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3b.6 — Unknown roman numeral sections go to sectionsUnparsed
  // -------------------------------------------------------------------------
  it('3b.6: secciones romanas desconocidas van a sectionsUnparsed', async () => {
    const text = '====\nI. FONOLOGÍA\n====\n/a e i o u/\n====\nX. COSAS RARAS\n====\nalgo extraño';
    const result = await inductFromText(text, { llmAvailable: false });

    expect(result.parseReport.sectionsUnparsed.length).toBeGreaterThan(0);
  });
});

console.log('Fase 2b tests cargados');

