/**
 * postImportValidator.test.ts — Fase 4: Validador Post-Import TDD (7 tests)
 *
 * Valida el DeclarativeManifest DESPUÉS de normalización, antes de entrar
 * al motor. Detecta categorías no reconocidas, estrategias huérfanas,
 * slots vacíos, tipología incompleta, etc.
 */

import { describe, it, expect } from 'vitest';

import { validatePostImport } from '../postImportValidator';
import type { DeclarativeManifest } from '../declarativeFormat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManifest(overrides?: Partial<DeclarativeManifest>): DeclarativeManifest {
  return {
    name: 'TestLang',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: ['p', 't', 'k'], vowels: ['a', 'e', 'i'], syllableStructures: ['CV'] },
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

describe('validatePostImport (Fase 4)', () => {
  // -------------------------------------------------------------------------
  // 4.1 — Manifiesto completo pasa validación con score alto
  // -------------------------------------------------------------------------
  it('4.1: manifiesto completo pasa con score alto', () => {
    const manifest = makeManifest({
      paradigms: [
        {
          category: 'sustantivo',
          slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k', position: 'suffix' } }],
        },
      ],
      strategies: [
        { id: 's1', name: 'Sufijo plural', type: 'affix', appliesToCategories: ['sustantivo'], affixRule: { position: 'suffix', form: '-k' } },
      ],
      exceptions: [{ id: 'ex1', ruleDescription: 'ir → fue', context: 'suppletion' }],
      roles: [{ id: 'subject', name: 'Sujeto' }],
    });

    const report = validatePostImport(manifest);

    expect(report.ok).toBeTruthy('Manifiesto completo debe pasar validación');
    expect(report.score >= 80).toBeTruthy(`Score debe ser >= 80, obtenido ${report.score}`);
    expect(report.sections.paradigms).toBe('ok');
    expect(report.sections.typology).toBe('ok');
  });

  // -------------------------------------------------------------------------
  // 4.2 — Detecta categoría léxica no reconocida
  // -------------------------------------------------------------------------
  it('4.2: detecta categoría léxica no reconocida', () => {
    const manifest = makeManifest({
      paradigms: [
        { category: 'categoria_inventada', slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k' } }] },
      ],
    });

    const report = validatePostImport(manifest);

    expect(!report.ok).toBeTruthy('Debe fallar por categoría no reconocida');
    expect(report.problems.some(p => p.location.includes('paradigms') && p.message.includes('no reconocida'))).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4.3 — Detecta estrategia huérfana (sin paradigmas objetivo)
  // -------------------------------------------------------------------------
  it('4.3: detecta estrategia huérfana sin paradigmas objetivo', () => {
    const manifest = makeManifest({
      strategies: [
        { id: 's1', name: 'Estrategia perdida', type: 'affix', appliesToCategories: ['categoria_inexistente'] },
      ],
    });

    const report = validatePostImport(manifest);

    expect(report.problems.some(p => p.location === 'strategies[0]' && p.message.includes('no apunta'))).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4.4 — Detecta slot sin realización.form
  // -------------------------------------------------------------------------
  it('4.4: detecta slot sin realización.form', () => {
    const manifest = makeManifest({
      paradigms: [
        { category: 'sustantivo', slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', position: 'suffix' } }] },
      ],
    });

    const report = validatePostImport(manifest);

    expect(report.problems.some(p => p.location.includes('realization.form') && p.message.includes('sin forma'))).toBeTruthy();
    expect(report.sections.paradigms).toBe('partial');
  });

  // -------------------------------------------------------------------------
  // 4.5 — Penaliza tipología incompleta
  // -------------------------------------------------------------------------
  it('4.5: penaliza tipología incompleta', () => {
    const manifest = makeManifest({
      typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: '', alignment: 'nominative' },
    });

    const report = validatePostImport(manifest);

    expect(report.problems.some(p => p.location === 'typology.headDirection' && p.severity === 'warning')).toBeTruthy();
    expect(report.score < 100).toBeTruthy('Score debe ser menor a 100 por tipología incompleta');
    expect(report.sections.typology).toBe('partial');
  });

  // -------------------------------------------------------------------------
  // 4.6 — Detecta rol sin nombre de display
  // -------------------------------------------------------------------------
  it('4.6: detecta rol sin nombre de display', () => {
    const manifest = makeManifest({
      roles: [{ id: 'subject', name: '' }],
    });

    const report = validatePostImport(manifest);

    expect(report.problems.some(p => p.location === 'roles[0]' && p.message.includes('sin nombre'))).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4.7 — Detecta fonología vacía
  // -------------------------------------------------------------------------
  it('4.7: detecta fonología vacía', () => {
    const manifest = makeManifest({
      phonology: { consonants: [], vowels: [], syllableStructures: [] },
    });

    const report = validatePostImport(manifest);

    expect(report.problems.some(p => p.location === 'phonology' && p.message.includes('fonológico'))).toBeTruthy();
    expect(report.sections.phonology).toBe('empty');
  });
});

console.log('Fase 4 tests cargados');
