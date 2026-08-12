import type {
  GrammarManifest,
  TypologicalProfile,
  CategoryParadigm,
  InflectionSlot,
  SlotRealization,
  SyntacticRole,
  MorphosyntacticStrategy,
  StrategyType,
} from '../types';
import { ENGINE_STRATEGY_MAP, MARKING_STRATEGY_BY_ID } from '../data/markingStrategies';

/**
 * Convert an extracted TypologicalProfile into a partial GrammarManifest.
 *
 * The profile is the "guide" layer: it pre-fills the manifest with what the
 * extraction found, but inventories are OPEN (e.g. Quavanol's 20+ cases) so
 * nothing is lost. Paradigms are seeded as editable skeletons (one slot per
 * feature) — the user refines the actual forms in the Grammar tab.
 *
 * Scope: motor + writing only (phonology, morphology, syntax, nominal,
 * verbal, modifiers, writing). Pragmatics/lexicon are excluded by design.
 */
export function typologyToManifest(profile: TypologicalProfile): Partial<GrammarManifest> {
  const paradigms: CategoryParadigm[] = [];

  // Noun: number + case as inflection slots.
  const nounSlots: InflectionSlot[] = [];
  const numInv = profile.nominal?.number_system?.inventory ?? [];
  if (numInv.length) {
    nounSlots.push({
      feature: 'number',
      label: 'Número',
      order: 1,
      realization: { kind: 'affix', position: 'suffix', form: '' } as SlotRealization,
    });
  }
  const caseInv = profile.nominal?.case_system?.inventory ?? [];
  if (caseInv.length) {
    nounSlots.push({
      feature: 'case',
      label: 'Caso',
      order: 2,
      realization: { kind: 'affix', position: 'suffix', form: '' } as SlotRealization,
    });
  }
  if (nounSlots.length) {
    paradigms.push({ category: 'sustantivo', slots: nounSlots });
  }

  // Verb: tense + aspect + mood as inflection slots.
  const verbSlots: InflectionSlot[] = [];
  const tenseInv = profile.verbal?.tense_system?.inventory ?? [];
  if (tenseInv.length) {
    verbSlots.push({
      feature: 'tense',
      label: 'Tiempo',
      order: 1,
      realization: { kind: 'affix', position: 'suffix', form: '' } as SlotRealization,
    });
  }
  const aspectInv = profile.verbal?.aspect_system?.inventory ?? [];
  if (aspectInv.length) {
    verbSlots.push({
      feature: 'aspect',
      label: 'Aspecto',
      order: 2,
      realization: { kind: 'affix', position: 'suffix', form: '' } as SlotRealization,
    });
  }
  const moodInv = profile.verbal?.mood_system?.inventory ?? [];
  if (moodInv.length) {
    verbSlots.push({
      feature: 'mood',
      label: 'Modo',
      order: 3,
      realization: { kind: 'affix', position: 'suffix', form: '' } as SlotRealization,
    });
  }
  if (verbSlots.length) {
    paradigms.push({ category: 'verbo', slots: verbSlots });
  }

  // Strategies: from the marking_strategy_legend vocabulary.
  const strategies: MorphosyntacticStrategy[] = (profile.markingStrategies ?? []).map((id, i) => {
    const engineType: StrategyType | null = (ENGINE_STRATEGY_MAP[id] as StrategyType | null) ?? null;
    const def = MARKING_STRATEGY_BY_ID[id];
    return {
      id: `strat_${id}_${i}`,
      name: def?.description ?? id,
      type: engineType ?? 'affix',
      appliesTo: [],
      notes: engineType ? undefined : `Estrategia fuera del motor (${id}): ${def?.description ?? ''}`.trim(),
    };
  });

  // Roles: catalog + custom, merged into SyntacticRole[].
  const roleNames = [
    ...(profile.syntacticRoles?.catalog ?? []),
    ...(profile.syntacticRoles?.custom ?? []),
  ];
  const roles: SyntacticRole[] = roleNames.map((name, i) => ({
    id: `role_${i}_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
  }));

  const typology = {
    wordOrder: profile.syntax?.basic_word_order ?? '',
    alignment: profile.syntax?.morphosyntactic_alignment ?? '',
    morphology: profile.morphology?.fusion_degree ?? profile.morphology?.synthesis_level ?? '',
    headDirection: profile.syntax?.head_directionality ?? '',
  };

  return {
    typology,
    paradigms,
    strategies,
    roles,
    typologicalProfile: profile,
  };
}

/**
 * Best-effort inverse: pull the guide layer back out of a manifest.
 * Used for export/round-tripping. Open inventories are reconstructed from
 * the paradigm slots where possible.
 */
export function manifestToTypology(manifest: GrammarManifest): TypologicalProfile {
  const noun = manifest.paradigms.find((p) => p.category === 'sustantivo');
  const verb = manifest.paradigms.find((p) => p.category === 'verbo');

  return {
    syntax: {
      basic_word_order: manifest.typology.wordOrder || undefined,
      morphosyntactic_alignment: manifest.typology.alignment || undefined,
      head_directionality: manifest.typology.headDirection || undefined,
    },
    morphology: {
      fusion_degree: manifest.typology.morphology || undefined,
    },
    nominal: {
      case_system: {
        active: !!noun?.slots.some((s) => s.feature === 'case'),
        inventory: (noun?.slots.find((s) => s.feature === 'case')?.allomorphs as unknown as string[])
          ?? [],
      },
      number_system: {
        active: !!noun?.slots.some((s) => s.feature === 'number'),
        inventory: (noun?.slots.find((s) => s.feature === 'number')?.allomorphs as unknown as string[])
          ?? [],
      },
    },
    verbal: {
      tense_system: {
        active: !!verb?.slots.some((s) => s.feature === 'tense'),
        inventory: (verb?.slots.find((s) => s.feature === 'tense')?.allomorphs as unknown as string[])
          ?? [],
      },
      aspect_system: {
        active: !!verb?.slots.some((s) => s.feature === 'aspect'),
        inventory: (verb?.slots.find((s) => s.feature === 'aspect')?.allomorphs as unknown as string[])
          ?? [],
      },
      mood_system: {
        inventory: (verb?.slots.find((s) => s.feature === 'mood')?.allomorphs as unknown as string[])
          ?? [],
      },
    },
    syntacticRoles: {
      catalog: manifest.roles.map((r) => r.name),
      custom: [],
    },
    markingStrategies: manifest.strategies
      .map((s) => Object.keys(ENGINE_STRATEGY_MAP).find((k) => ENGINE_STRATEGY_MAP[k] === s.type) as never)
      .filter(Boolean),
  };
}
