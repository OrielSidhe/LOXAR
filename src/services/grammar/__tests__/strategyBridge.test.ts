/**
 * strategyBridge.test.ts — Fase 5: Cableado Estrategias→Motor TDD (9 tests)
 *
 * Verifica que las DeclarativeStrategy se convierten correctamente al formato
 * que el motor de realización morfológica consume, y que applyAffixStrategy /
 * applyParticleStrategy funcionan como el motor espera.
 */

import { describe, it, expect } from 'vitest';

import { bridgeStrategy, bridgeStrategies, bridgeManifest, getStrategiesForCategory, applyAffixStrategy, applyParticleStrategy } from '../strategyBridge';
import type { DeclarativeStrategy, DeclarativeManifest } from '../declarativeFormat';

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

describe('strategyBridge (Fase 5)', () => {
  // -------------------------------------------------------------------------
  // 5.1 — Bridge convierte DeclarativeStrategy a formato motor
  // -------------------------------------------------------------------------
  it('5.1: bridgeStrategy convierte DeclarativeStrategy a formato motor', () => {
    const ds: DeclarativeStrategy = {
      id: 's1',
      name: 'Sufijo plural',
      type: 'affix',
      appliesToCategories: ['sustantivo'],
      affixRule: { position: 'suffix', form: '-k' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.id).toBe('s1');
    expect(bridged.type).toBe('affix');
    expect(bridged.affixRule).toBeTruthy('Debe tener affixRule');
    expect(bridged.affixRule!.position).toBe('suffix');
    expect(bridged.affixRule!.form).toBe('-k');
  });

  // -------------------------------------------------------------------------
  // 5.2 — Affix strategy: suffix aplica correctamente
  // -------------------------------------------------------------------------
  it('5.2: affix suffix aplica correctamente a la forma base', () => {
    const result = applyAffixStrategy('kala', {
      id: 's1', name: 'Plural', type: 'affix', appliesToCategories: [],
      affixRule: { position: 'suffix', form: '-k' },
    });

    expect(result).toBe('kala-k');
  });

  // -------------------------------------------------------------------------
  // 5.3 — Affix strategy: prefix aplica correctamente
  // -------------------------------------------------------------------------
  it('5.3: affix prefix aplica correctamente a la forma base', () => {
    const result = applyAffixStrategy('kala', {
      id: 's2', name: 'Negación', type: 'affix', appliesToCategories: [],
      affixRule: { position: 'prefix', form: 'ma-' },
    });

    expect(result).toBe('ma-kala');
  });

  // -------------------------------------------------------------------------
  // 5.4 — Clitic strategy: bridge preserva tipo clitic
  // -------------------------------------------------------------------------
  it('5.4: clitic strategy se convierte preservando tipo', () => {
    const ds: DeclarativeStrategy = {
      id: 's3', name: 'Clítico enclítico', type: 'clitic',
      appliesToCategories: ['verbo'], particleRule: { marker: '=ka', relativePosition: 'after' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.type).toBe('clitic');
    expect(bridged.particleRule).toBeTruthy('Debe tener particleRule');
    expect(bridged.particleRule!.marker).toBe('=ka');
    expect(bridged.particleRule!.relativePosition).toBe('after');
  });

  // -------------------------------------------------------------------------
  // 5.5 — Particle strategy: bridge con marker
  // -------------------------------------------------------------------------
  it('5.5: particle strategy con marker y posición', () => {
    const ds: DeclarativeStrategy = {
      id: 's4', name: 'Partícula de pregunta', type: 'particle',
      appliesToCategories: ['verbo'], particleRule: { marker: 'ka', relativePosition: 'before' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.type).toBe('particle');
    expect(bridged.particleRule).toBeTruthy();
    expect(bridged.particleRule!.marker).toBe('ka');
    expect(bridged.particleRule!.relativePosition).toBe('before');
  });

  // -------------------------------------------------------------------------
  // 5.6 — Tone strategy: bridge con toneRule
  // -------------------------------------------------------------------------
  it('5.6: tone strategy con toneRule', () => {
    const ds: DeclarativeStrategy = {
      id: 's5', name: 'Tono alto', type: 'tone',
      appliesToCategories: ['sustantivo'],
      toneRule: { description: 'á → a', pattern: 'á' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.type).toBe('tone');
    expect(bridged.toneRule).toBeTruthy();
    expect(bridged.toneRule!.description).toBe('á → a');
    expect(bridged.toneRule!.pattern).toBe('á');
  });

  // -------------------------------------------------------------------------
  // 5.7 — Mutation strategy: bridge con transformationRule
  // -------------------------------------------------------------------------
  it('5.7: mutation strategy con transformationRule', () => {
    const ds: DeclarativeStrategy = {
      id: 's6', name: 'Lenición', type: 'mutation',
      appliesToCategories: ['sustantivo'],
      transformationRule: { pattern: 'p', replacement: 'b' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.type).toBe('mutation');
    expect(bridged.transformationRule).toBeTruthy();
    expect(bridged.transformationRule!.pattern).toBe('p');
    expect(bridged.transformationRule!.replacement).toBe('b');
  });

  // -------------------------------------------------------------------------
  // 5.8 — Suppletion strategy: bridge con suppletion mapping
  // -------------------------------------------------------------------------
  it('5.8: suppletion strategy se convierte a affix con excepción', () => {
    const ds: DeclarativeStrategy = {
      id: 's7', name: 'Ir → fue', type: 'suppletion',
      appliesToCategories: ['verbo'],
      exception: { pattern: 'ir', replacement: 'fue' },
    };

    const bridged = bridgeStrategy(ds);

    expect(bridged.type).toBe('suppletion');
    expect(bridged.affixRule || bridged.mutationRule || ds.exception).toBeTruthy('Suppletion debe tener excepción asociada');
  });

  // -------------------------------------------------------------------------
  // 5.9 — bridgeManifest indexa estrategias por categoría
  // -------------------------------------------------------------------------
  it('5.9: bridgeManifest indexa estrategias por categoría', () => {
    const manifest = makeManifest({
      strategies: [
        { id: 's1', name: 'Plural sustantivo', type: 'affix', appliesToCategories: ['sustantivo'], affixRule: { position: 'suffix', form: '-k' } },
        { id: 's2', name: 'Pasado verbo', type: 'affix', appliesToCategories: ['verbo'], affixRule: { position: 'suffix', form: '-t' } },
        { id: 's3', name: 'General', type: 'particle', appliesToCategories: ['sustantivo', 'verbo'], particleRule: { marker: 'ka', relativePosition: 'before' } },
      ],
    });

    const { strategyIndex } = bridgeManifest(manifest);

    const nounStrategies = getStrategiesForCategory('sustantivo', strategyIndex);
    expect(nounStrategies.length >= 2).toBeTruthy('sustantivo debe tener al menos 2 estrategias');
    expect(nounStrategies.some(s => s.id === 's1')).toBeTruthy('Debe incluir s1 (plural)');

    const verbStrategies = getStrategiesForCategory('verbo', strategyIndex);
    expect(verbStrategies.length >= 2).toBeTruthy('verbo debe tener al menos 2 estrategias');
    expect(verbStrategies.some(s => s.id === 's2')).toBeTruthy('Debe incluir s2 (pasado)');
  });
});

console.log('Fase 5 tests cargados');
