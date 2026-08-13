import assert from 'node:assert';
import { describe, test } from 'vitest';
import { typologyToManifest, manifestToTypology } from '../typologyProfile';
import type { TypologicalProfile } from '../../types';

const quavanol: TypologicalProfile = {
  morphology: { fusion_degree: 'aglutinante', vowel_harmony: true },
  syntax: {
    basic_word_order: 'SVO',
    morphosyntactic_alignment: 'nominativo_acusativo',
    head_directionality: 'head_initial',
    pro_drop_behavior: 'radical_pro_drop',
  },
  nominal: {
    noun_classes: { active: true, inventory: ['primordial', 'divino', 'magico'] },
    number_system: { active: true, inventory: ['singular', 'plural', 'dual', 'trial'] },
    case_system: {
      active: true,
      inventory: [
        'nominative', 'vocative', 'accusative', 'genitive', 'dative',
        'instrumental', 'comitative', 'exaltive', 'decressive', 'equative',
        'similative', 'locative', 'ablative', 'allative', 'perlative',
        'causal', 'pretemporal', 'posttemporal', 'aversive', 'mutative',
        'superessive', 'subessive',
      ],
    },
    definiteness: { marking_strategy: ['particle'] },
  },
  verbal: {
    tense_system: { active: true, inventory: ['presente', 'pasado', 'futuro'] },
    aspect_system: { active: true, inventory: ['perfecto'] },
    mood_system: { inventory: ['indicativo', 'subjuntivo', 'imperativo'] },
    valency: { inventory: ['reflexiva', 'vaerica_voice'] },
  },
  modifiers: { adjective_typology: 'noun_like', adpositions: 'posposiciones' },
  writing: { exists: true, script_type: 'alfabetico', directionality: 'izquierda_derecha', case_distinction: false },
  syntacticRoles: {
    catalog: ['agente', 'paciente', 'benefactivo', 'instrumento', 'tema'],
    custom: ['esencia_vaerica'],
  },
  markingStrategies: ['suffix', 'prefix', 'particle', 'clitic', 'root_internal_mutation_apophony', 'suppletion', 'zero_unmarked'],
};

describe('typologyProfile', () => {
  test('typologyToManifest maps Quavanol 20+ cases', () => {
    const m = typologyToManifest(quavanol);

    assert(m.typology?.wordOrder === 'SVO', 'wordOrder mapeado');
    assert(m.typology?.alignment === 'nominativo_acusativo', 'alignment mapeado');
    assert(m.typology?.morphology === 'aglutinante', 'morphology mapeado');
    assert(m.typology?.headDirection === 'head_initial', 'headDirection mapeado');

    const noun = m.paradigms?.find((p) => p.category === 'sustantivo');
    assert(!!noun, 'paradigma de sustantivo creado');
    assert(noun!.slots.some((s) => s.feature === 'number'), 'slot de número presente');
    assert(noun!.slots.some((s) => s.feature === 'case'), 'slot de caso presente');

    const verb = m.paradigms?.find((p) => p.category === 'verbo');
    assert(!!verb, 'paradigma de verbo creado');
    assert(verb!.slots.length === 3, 'verbo tiene 3 slots (tense/aspect/mood)');

    assert((m.roles?.length ?? 0) === 6, 'roles catalog+custom fusionados (6)');
    assert(m.roles?.some((r) => r.name === 'esencia_vaerica') === true, 'rol custom conservado');

    assert((m.strategies?.length ?? 0) === 7, '7 estrategias mapeadas');
    const zeroMarked = m.strategies?.find((s) => s.notes?.includes('zero_unmarked'));
    assert(!!zeroMarked && !!zeroMarked.notes, 'estrategia fuera del motor (zero_unmarked) queda como nota');

    assert(!!m.typologicalProfile, 'typologicalProfile conservado en el manifest');
    assert(m.typologicalProfile!.nominal!.case_system!.inventory.length === 22, 'los 22 casos abiertos se conservan');
  });

  test('manifestToTypology round-trip', () => {
    const m = typologyToManifest(quavanol);
    const back = manifestToTypology(m as any);
    assert(back.syntax?.basic_word_order === 'SVO', 'round-trip wordOrder');
    assert(back.nominal?.case_system?.active === true, 'round-trip: caso activo');
    assert((back.syntacticRoles?.catalog.length ?? 0) === 6, 'round-trip roles (6)');
  });
});
