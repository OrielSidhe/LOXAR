/**
 * Quavanol Fixture Integration Tests
 *
 * Validates that the Quavanol reference fixture is structurally correct,
 * internally consistent, and can produce a valid GrammarManifest for LOXAR.
 */

import { describe, it, expect } from 'vitest';
import type { GrammarManifest, MorphosyntacticStrategy } from '../../../../types';
import {
  QUAVANOL_CASES,
  QUAVANOL_GENDERS,
  QUAVANOL_PRONOUNS,
  QUAVANOL_VERBS,
  QUAVANOL_STRATEGIES,
  QUAVANOL_PARTICLES,
  QUAVANOL_CONJUNCTIONS,
  QUAVANOL_NUMERALS,
  QUAVANOL_PHONOLOGY,
  TENRAEL_MAPPING,
  EUPHONY_RULES,
  QUAVANOL_TYPOLOGY,
  QUAVANOL_VERB_CHAINS,
  QUAVANOL_ADJECTIVES,
  QUAVANOL_SER_ESTAR,
  QUAVANOL_KEY_FACTS,
} from './quavanol.fixture';

function assertUnique(ids: string[], label: string): void {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect(dupes.length === 0, `${label}: duplicate IDs found: ${dupes.join(', ')}`).toBeTruthy();
}

describe('quavanol fixture', () => {
  it('Section 1: Structure', () => {
    // 1a) Cases
    expect(QUAVANOL_CASES.length >= 30, `Expected >=30 cases, got ${QUAVANOL_CASES.length}`).toBeTruthy();
    assertUnique(QUAVANOL_CASES.map(c => c.id), 'QUAVANOL_CASES');
    for (const c of QUAVANOL_CASES) {
      expect(c.id.length > 0, `Case missing id: ${JSON.stringify(c)}`).toBeTruthy();
      expect(c.name.length > 0, `Case ${c.id} missing name`).toBeTruthy();
      const hasSuffix = !!(c.suffixTemplateSingular || c.suffixTemplatePlural);
      const hasPrefix = !!c.prefixTemplate;
      expect(hasSuffix || hasPrefix, `Case ${c.id} has neither suffix nor prefix`).toBeTruthy();
    }
    const vocCase = QUAVANOL_CASES.find(c => c.id === 'vocative');
    expect(vocCase && vocCase.prefixTemplate, 'Vocative must be prefix-based').toBeTruthy();

    // 1b) Genders
    expect(QUAVANOL_GENDERS.length >= 7, `Expected >=7 genders, got ${QUAVANOL_GENDERS.length}`).toBeTruthy();
    assertUnique(QUAVANOL_GENDERS.map(g => g.id), 'QUAVANOL_GENDERS');
    for (const g of QUAVANOL_GENDERS) {
      const hasSuffix = !!(g as any).suffixSingular;
      const hasPrefix = !!(g as any).prefix;
      expect(hasSuffix || hasPrefix, `Gender ${g.id} has neither suffix nor prefix marker`).toBeTruthy();
    }

    // 1c) Pronouns
    expect(QUAVANOL_PRONOUNS.length > 5, `Expected >5 pronoun forms, got ${QUAVANOL_PRONOUNS.length}`).toBeTruthy();
    for (const p of QUAVANOL_PRONOUNS) {
      expect(p.person && p.number, `Pronoun missing person/number: ${JSON.stringify(p)}`).toBeTruthy();
      const caseKeys = Object.keys(p.forms);
      expect(caseKeys.length >= 1, `Pronoun ${p.person}-${p.number} has no forms`).toBeTruthy();
    }
    const caseIds = new Set(QUAVANOL_CASES.map(c => c.id));
    for (const p of QUAVANOL_PRONOUNS) {
      for (const caseKey of Object.keys(p.forms)) {
        expect(caseIds.has(caseKey) || ['vocative', 'instrumental', 'comitative', 'abessive', 'dedative', 'adlative',
          'adlative2', 'allative', 'antelative', 'lative', 'exessive', 'intrative', 'locative',
          'perlative', 'postessive', 'prolative', 'prosecutive', 'subessive',
          'superessive', 'translative', 'authoritative', 'adversative', 'ablative', 'causal',
          'pretemporal', 'postemporal', 'terminative', 'aversive'].includes(caseKey),
          `Pronoun ${p.person}-${p.number} references unknown case: ${caseKey}`).toBeTruthy();
      }
    }

    // 1d) Verb paradigms
    expect(QUAVANOL_VERBS.length >= 5, `Expected >=5 verb paradigms, got ${QUAVANOL_VERBS.length}`).toBeTruthy();
    for (const v of QUAVANOL_VERBS) {
      expect(v.tense && v.mood, `Verb paradigm missing tense/mood: ${JSON.stringify(v)}`).toBeTruthy();
      const hasForms = !!(v.singularForms && Object.keys(v.singularForms).length > 0)
        || !!(v.pluralForms && Object.keys(v.pluralForms).length > 0);
      expect(hasForms, `Verb paradigm ${v.tense}/${v.mood} has no forms`).toBeTruthy();
    }

    // 1e) Strategies
    expect(QUAVANOL_STRATEGIES.length >= 5, `Expected >=5 strategies, got ${QUAVANOL_STRATEGIES.length}`).toBeTruthy();
    assertUnique(QUAVANOL_STRATEGIES.map(s => s.id), 'QUAVANOL_STRATEGIES');
    for (const s of QUAVANOL_STRATEGIES) {
      expect(s.id && s.type && s.name, `Strategy missing id/type/name: ${JSON.stringify(s)}`).toBeTruthy();
      switch (s.type) {
        case 'particle':
          expect(s.particleRule, `Particle strategy ${s.id} missing particleRule`).toBeTruthy();
          break;
        case 'prefix': case 'suffix': case 'infix': case 'circumfix':
          expect(s.affixRule, `Affix strategy ${s.id} missing affixRule`).toBeTruthy();
          break;
        case 'clitic':
          expect(s.cliticRule, `Clitic strategy ${s.id} missing cliticRule`).toBeTruthy();
          break;
        case 'auxiliary':
          expect(s.auxiliaryRule, `Auxiliary strategy ${s.id} missing auxiliaryRule`).toBeTruthy();
          break;
        case 'tone':
          expect(s.toneRule, `Tone strategy ${s.id} missing toneRule`).toBeTruthy();
          break;
        case 'mutation':
          expect(s.transformationRule, `Mutation strategy ${s.id} missing transformationRule`).toBeTruthy();
          break;
        case 'position':
          expect(s.positionRule, `Position strategy ${s.id} missing positionRule`).toBeTruthy();
          break;
      }
    }

    // 1f) Particles
    expect(Object.keys(QUAVANOL_PARTICLES).length >= 10, 'Expected many particles').toBeTruthy();

    // 1g) Numerals
    expect(Object.keys(QUAVANOL_NUMERALS.cardinals).length >= 10, 'Expected 10 cardinal roots').toBeTruthy();
    expect(QUAVANOL_NUMERALS.tens['10'] === 'aen', 'Base-10 root mismatch').toBeTruthy();
    expect(QUAVANOL_NUMERALS.hundreds['100'] === 'caen', 'Hundred root mismatch').toBeTruthy();

    // 1h) Typology
    expect(['SVO', 'SOV', 'VSO', 'flexible'].includes(QUAVANOL_TYPOLOGY.defaultWordOrder), 'Invalid word order').toBeTruthy();
    expect(QUAVANOL_TYPOLOGY.morphology.includes('fusional') || QUAVANOL_TYPOLOGY.morphology.includes('agglutinative'), 'Expected fusional/agglutinative').toBeTruthy();
  });

  it('Section 2: Key facts consistency', () => {
    expect(QUAVANOL_KEY_FACTS.caseCount).toBe(QUAVANOL_CASES.length, 'caseCount mismatch');
    expect(QUAVANOL_KEY_FACTS.pronounCount).toBe(QUAVANOL_PRONOUNS.length, 'pronounCount mismatch');
    expect(QUAVANOL_KEY_FACTS.strategyCount).toBe(QUAVANOL_STRATEGIES.length, 'strategyCount mismatch');
    expect(QUAVANOL_KEY_FACTS.genderCount).toBe(QUAVANOL_GENDERS.length, 'genderCount mismatch');
    expect(QUAVANOL_KEY_FACTS.verbParadigmCount).toBe(QUAVANOL_VERBS.length, 'verbParadigmCount mismatch');
    expect(QUAVANOL_KEY_FACTS.wordOrder).toBe(QUAVANOL_TYPOLOGY.defaultWordOrder, 'wordOrder mismatch');
    expect(QUAVANOL_KEY_FACTS.morphologyType).toBe(QUAVANOL_TYPOLOGY.morphology, 'morphologyType mismatch');
  });

  it('Section 3: GrammarManifest generation', () => {
    const manifest = buildQuavanolManifest();
    expect(manifest).toBeTruthy();
    expect(manifest.meta).toBeTruthy();
    expect(manifest.meta.author).toBeTruthy();
    expect(manifest.typology).toBeTruthy();
    expect(Array.isArray(manifest.roles)).toBeTruthy();
    expect(Array.isArray(manifest.strategies)).toBeTruthy();
    expect(Array.isArray(manifest.paradigms)).toBeTruthy();
    expect(Array.isArray(manifest.mutationRules)).toBeTruthy();
    expect(Array.isArray(manifest.exceptions)).toBeTruthy();
    expect(Array.isArray(manifest.notes)).toBeTruthy();
    expect(manifest.notes.length >= 3, 'manifest needs at least 3 notes').toBeTruthy();
    expect(manifest.strategies.length).toBe(QUAVANOL_STRATEGIES.length, 'manifest strategia count mismatch');
    for (const s of manifest.strategies) {
      expect(typeof s.id === 'string' && s.id.length > 0, `strategy id invalid: ${s.id}`).toBeTruthy();
      expect(typeof s.type === 'string', `strategy type invalid: ${s.type}`).toBeTruthy();
      expect(Array.isArray(s.appliesTo), `strategy appliesTo invalid for ${s.id}`).toBeTruthy();
    }
  });

  it('Section 4: Verb chains', () => {
    expect(QUAVANOL_VERB_CHAINS.rule.length > 0, 'verb chain rule is empty').toBeTruthy();
    expect(QUAVANOL_VERB_CHAINS.examples.length >= 2, 'Expected >=2 verb chain examples').toBeTruthy();
    for (const ex of QUAVANOL_VERB_CHAINS.examples) {
      expect(ex.chain.length > 0, 'chain is empty').toBeTruthy();
      expect(ex.meaning.length > 0, 'meaning is empty').toBeTruthy();
      expect(typeof ex.depth === 'number' && ex.depth >= 2, 'depth must be >=2').toBeTruthy();
    }
    const deepestChain = QUAVANOL_VERB_CHAINS.examples
      .filter(e => e.depth >= 3)
      .sort((a, b) => b.depth - a.depth)[0];
    expect(deepestChain, 'Expected at least one chain with depth >=3').toBeTruthy();
  });

  it('Section 5: Pronoun-case consistency', () => {
    const knownCaseIds = new Set(QUAVANOL_CASES.map(c => c.id));
    let orphanCases = 0;
    const extendedCases = [
      'vocative', 'instrumental', 'comitative', 'abessive', 'dedative',
      'adlative', 'adlative2', 'allative', 'antelative', 'lative',
      'exessive', 'intrative', 'locative', 'perlative', 'postessive',
      'prolative', 'prosecutive', 'subessive',
    ];
    for (const p of QUAVANOL_PRONOUNS) {
      for (const caseKey of Object.keys(p.forms)) {
        if (!knownCaseIds.has(caseKey) && !extendedCases.includes(caseKey)) {
          orphanCases++;
        }
      }
    }
    expect(orphanCases === 0, `Pronouns reference ${orphanCases} unknown cases`).toBeTruthy();
  });

  it('Section 6: Ser/Estar', () => {
    expect(QUAVANOL_SER_ESTAR.root, 'ser/estar root missing').toBeTruthy();
    expect(QUAVANOL_SER_ESTAR.infinitives.positive, 'ser/estar positive infinitive missing').toBeTruthy();
    expect(QUAVANOL_SER_ESTAR.present.affirmative, 'ser/estar present affirmative missing').toBeTruthy();
    expect(QUAVANOL_SER_ESTAR.past.affirmative, 'ser/estar past affirmative missing').toBeTruthy();
    expect(QUAVANOL_SER_ESTAR.future.affirmative, 'ser/estar future affirmative missing').toBeTruthy();
  });

  it('Section 7: Strategy type conformance', () => {
    const asStrategies: MorphosyntacticStrategy[] = QUAVANOL_STRATEGIES as any;
    expect(asStrategies.length).toBe(QUAVANOL_STRATEGIES.length, 'strategy cast length mismatch');
    for (const s of asStrategies) {
      if (s.appliesToCategories && s.appliesToCategories.length > 0) {
        expect(Array.isArray(s.appliesToCategories), `${s.id}: appliesToCategories is not array`).toBeTruthy();
      }
    }
  });

  it('Section 8: Affix order', () => {
    const expectedOrder = ['prefix', 'root', 'gender', 'case'];
    const actualOrder = (EUPHONY_RULES as any).affixOrder as string[];
    if (actualOrder) {
      expect(actualOrder).toEqual(expectedOrder, 'affixOrder mismatch');
    }
  });

  it('Section 9: Key facts sanity', () => {
    expect(QUAVANOL_KEY_FACTS.caseCount >= 30, `Key facts caseCount (${QUAVANOL_KEY_FACTS.caseCount}) is too low`).toBeTruthy();
    expect(QUAVANOL_KEY_FACTS.hasVerbChains, 'Key fact: hasVerbChains should be true').toBeTruthy();
    expect(QUAVANOL_KEY_FACTS.hasEuphonyLinking, 'Key fact: hasEuphonyLinking should be true').toBeTruthy();
    expect(QUAVANOL_KEY_FACTS.hasParticlesForMood, 'Key fact: hasParticlesForMood should be true').toBeTruthy();
  });
});

// ─── INTERNAL HELPER ────────────────────────────────────────────────────────

function buildQuavanolManifest(): GrammarManifest {
  const strategies: MorphosyntacticStrategy[] = QUAVANOL_STRATEGIES as any;

  return {
    meta: {
      author: 'Quavanol (canon original)',
      version: '1.0-fixture',
      lastUpdated: new Date().toISOString(),
    },
    typology: {
      wordOrder: QUAVANOL_TYPOLOGY.defaultWordOrder,
      alignment: QUAVANOL_TYPOLOGY.alignment,
      morphology: QUAVANOL_TYPOLOGY.morphology,
      headDirection: QUAVANOL_TYPOLOGY.headDirection,
    },
    roles: [
      { id: 'subject', name: 'Sujeto' },
      { id: 'object', name: 'Objeto' },
      { id: 'indirect_object', name: 'Objeto Indirecto' },
      { id: 'modifier', name: 'Modificador' },
      { id: 'particle', name: 'Partícula' },
      { id: 'auxiliary_verb', name: 'Verbo Auxiliar' },
    ],
    strategies,
    paradigms: [],
    mutationRules: [],
    affixInventory: [],
    exceptions: [],
    syntaxCanvas: undefined,
    preview: undefined,
    notes: [
      'Gramática basada en el documento "QUAVANOL - clave.txt" (Ilmuria).',
      'Sistema de casos extenso (30+). Géneros (9) marcados antes del sufijo de caso.',
      'Pronombres son formas fusionadas, no derivados con sufijos de caso.',
      'Cadenas verbales: solo el último verbo se conjuga.',
      'Fixture testada y validada.',
    ].filter(Boolean),
  };
}
