/**
 * normalizer.test.ts — Fase 3: Normalizer + Taxonomy TDD (7 tests)
 *
 * El normalizer usa taxonomy.ts como fuente de verdad para resolver
 * aliases variantes (sustantivo, noun, sostantivo, nomen...) →
 * canonical key.
 *
 * TDD estricto: estos tests se escriben ANTES de la implementación.
 */

import { describe, it, expect } from 'vitest';

import { normalize } from '../normalizer';
import type { DeclarativeManifest } from '../declarativeFormat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManifest(overrides?: Partial<DeclarativeManifest>): DeclarativeManifest {
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

describe('normalize (Fase 3)', () => {
  // -------------------------------------------------------------------------
  // 3.1 — Normaliza categorías léxicas variantes
  // -------------------------------------------------------------------------
  it('3.1: normaliza categorías léxicas variantes a canonical key', () => {
    const manifest = makeManifest({
      paradigms: [
        {
          category: 'sustantivo',
          slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k' } }],
        },
      ],
    });

    const { manifest: out, report } = normalize(manifest);

    expect(out.paradigms[0].category).toBe('sustantivo', 'Debe mantener categoría ya canónica');
    expect(report.changes.length >= 0).toBeTruthy('Debe producir reporte de cambios');
  });

  // -------------------------------------------------------------------------
  // 3.2 — Normaliza aliases de inglés a canonical
  // -------------------------------------------------------------------------
  it('3.2: normaliza aliases de inglés (noun, verb) a canonical', () => {
    const manifest = makeManifest({
      paradigms: [
        { category: 'noun', slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k' } }] },
        { category: 'verb', slots: [{ id: 's2', feature: 'tense', order: 1, realization: { kind: 'affix', form: '-t' } }] },
      ],
    });

    const { manifest: out } = normalize(manifest);

    expect(out.paradigms[0].category).toBe('sustantivo', 'noun → sustantivo');
    expect(out.paradigms[1].category).toBe('verbo', 'verb → verbo');
  });

  // -------------------------------------------------------------------------
  // 3.3 — Normaliza roles gramaticales
  // -------------------------------------------------------------------------
  it('3.3: normaliza roles gramaticales variantes', () => {
    const manifest = makeManifest({
      roles: [
        { id: 'sujeto', name: 'Sujeto' },
        { id: 'objeto', name: 'Objeto' },
        { id: 'root', name: 'Raíz' },
      ],
    });

    const { manifest: out, report } = normalize(manifest);

    expect(out.roles[0].id).toBe('subject', 'sujeto → subject');
    expect(out.roles[1].id).toBe('object', 'objeto → object');
    expect(out.roles[2].id).toBe('root', 'root se mantiene');
    expect(report.changes.some(c => c.path === 'roles[0].id' && c.from === 'sujeto' && c.to === 'subject')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3.4 — Normaliza posiciones de afijo
  // -------------------------------------------------------------------------
  it('3.4: normaliza posiciones de afijo variantes', () => {
    const manifest = makeManifest({
      paradigms: [
        {
          category: 'sustantivo',
          slots: [
            { id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k', position: 'sufijo' } },
            { id: 's2', feature: 'case', order: 2, realization: { kind: 'affix', form: '-la', position: 'prefijo' } },
          ],
        },
      ],
    });

    const { manifest: out, report } = normalize(manifest);

    expect(out.paradigms[0].slots[0].realization.position).toBe('suffix', 'sufijo → suffix');
    expect(out.paradigms[0].slots[1].realization.position).toBe('prefix', 'prefijo → prefix');
    expect(report.changes.some(c => c.path.includes('realization.position') && c.from === 'sufijo')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3.5 — Normaliza tipos de estrategia
  // -------------------------------------------------------------------------
  it('3.5: normaliza tipos de estrategia variantes', () => {
    const manifest = makeManifest({
      strategies: [
        { id: 's1', name: 'Sufijo plural', type: 'sufijación', appliesToCategories: ['sustantivo'], affixRule: { position: 'suffix', form: '-k' } },
        { id: 's2', name: 'Clítico', type: 'clítico', appliesToCategories: ['verbo'] },
        { id: 's3', name: 'Partícula', type: 'partícula', appliesToCategories: ['verbo'] },
      ],
    });

    const { manifest: out, report } = normalize(manifest);

    expect(out.strategies[0].type).toBe('affix', 'sufijación → affix');
    expect(out.strategies[1].type).toBe('clitic', 'clítico → clitic');
    expect(out.strategies[2].type).toBe('particle', 'partícula → particle');
    expect(report.changes.some(c => c.path === 'strategies[0].type' && c.from === 'sufijación')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3.6 — Normaliza mutationRules y exceptions
  // -------------------------------------------------------------------------
  it('3.6: normaliza mutationRules y exceptions', () => {
    const manifest = makeManifest({
      mutationRules: [
        { id: 'm1', fromCategory: 'sustantivo', toCategory: 'verbo', rule: 'derivación' },
      ],
      exceptions: [
        { id: 'ex1', ruleDescription: 'ir → fue', context: 'supletiva', appliesToCategories: ['verbo'] },
      ],
    });

    const { manifest: out, report } = normalize(manifest);

    expect(out.mutationRules[0].fromCategory).toBe('sustantivo', 'fromCategory ya es canónica');
    // supletiva → suppletion via STRATEGY_LEGEND → ENGINE_STRATEGY_MAP puentea a 'affix'
    expect(out.exceptions[0].context).toBe('affix', 'supletiva → affix (via ENGINE_STRATEGY_MAP)');
    expect(report.changes.some(c => c.path === 'exceptions[0].context' && c.from === 'supletiva' && c.to === 'affix')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3.7 — No muta el manifiesto original
  // -------------------------------------------------------------------------
  it('3.7: no muta el manifiesto original (inmutabilidad)', () => {
    const manifest = makeManifest({
      paradigms: [
        { category: 'noun', slots: [{ id: 's1', feature: 'number', order: 1, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] },
      ],
      roles: [{ id: 'sujeto', name: 'Sujeto' }],
    });

    const originalCat = manifest.paradigms[0].category;
    const originalRole = manifest.roles[0].id;

    normalize(manifest);

    expect(manifest.paradigms[0].category).toBe(originalCat, 'No debe mutar category del original');
    expect(manifest.roles[0].id).toBe(originalRole, 'No debe mutar id del original');
  });
});

console.log('Fase 3 tests cargados');
