/**
 * languageProfiles.ts
 * ----------------------------------------------------------------------------
 * Starter "language profiles" for the Grammar Wizard.
 *
 * A profile is a simplified but reasonable description of a real-world
 * typology (Turkish = agglutinative, Latin = fusional, Chinese = isolating,
 * Thai = tonal, Inuktitut = polysynthetic). Picking one PRE-FILLS a
 * GrammarManifest so a conlanger with zero linguistics training gets a working
 * scaffold they can tweak, instead of a blank page.
 *
 * IMPORTANT: every `SlotRealization` literal is cast with `as const` so
 * TypeScript keeps the narrow discriminated-union type. Without it the engine's
 * `realizeLexeme` switch on `realization.kind` would not type-check (and the
 * runtime value would be correct anyway, but TS needs the literal).
 * ----------------------------------------------------------------------------
 */
import type {
  GrammarManifest,
  MutationRule,
  CategoryParadigm,
  PhonologyConfig,
  SlotRealization,
  InflectionSlot,
} from '../types';

export interface LanguageProfile {
  id: string;
  label: string;
  description: string;
  typology: {
    wordOrder: string;
    alignment: string;
    morphology: string;
    headDirection: string;
  };
  phonology?: PhonologyConfig;
  paradigms: CategoryParadigm[];
  mutationRules: MutationRule[];
  showTone: boolean;
  sample?: { spanish: string; conlang: string };
}

// ── Small helpers so the profile literals stay readable ──────────────────────
const suffix = (form: string): SlotRealization => ({
  kind: 'affix' as const,
  position: 'suffix' as const,
  form,
});

const slot = (
  feature: string,
  order: number,
  realization: SlotRealization,
  label?: string,
): InflectionSlot => ({ feature, order, realization, ...(label ? { label } : {}) });

// Reusable Latin-ish phonology inventory.
const LATIN_PHONOLOGY: PhonologyConfig = {
  inventory: {
    consonants: ['p', 't', 'k', 'b', 'd', 'g', 'f', 's', 'm', 'n', 'l', 'r', 'w', 'j'],
    vowels: ['a', 'e', 'i', 'o', 'u'],
  },
  phonotactics: {
    syllableStructures: ['CV', 'CVC', 'CCV', 'CVCC'],
    maxConsonantClusters: 2,
  },
};

// Reusable Mandarin-ish phonology inventory (used by the isolating/tonal profiles).
const MANDARIN_PHONOLOGY: PhonologyConfig = {
  inventory: {
    consonants: ['p', 't', 'k', 'pʰ', 'tʰ', 'kʰ', 'm', 'n', 'f', 's', 'ɕ', 'x', 'l', 'w', 'j', 'ʐ', 'ŋ'],
    vowels: ['a', 'e', 'i', 'o', 'u', 'y', 'ə', 'ɑ', 'ɛ', 'ɔ', 'ɨ'],
  },
  phonotactics: {
    syllableStructures: ['CV', 'CVN', 'CGV', 'CGVN'],
    maxConsonantClusters: 0,
  },
};

export const LANGUAGE_PROFILES: LanguageProfile[] = [
  {
    id: 'flexivo-latin',
    label: 'Flexivo (tipo Latín)',
    description:
      'Idioma fusional: pocos morfemas, pero cada uno lleva mucha información junta (tiempo + persona + número en una sola terminación). El orden suele ser Sujeto-Verbo-Objeto.',
    typology: {
      wordOrder: 'SVO',
      alignment: 'Nominativo-Acusativo',
      morphology: 'Fusional',
      headDirection: 'Head-Initial',
    },
    phonology: LATIN_PHONOLOGY,
    paradigms: [
      {
        category: 'verbo',
        slots: [
          slot('tense', 1, suffix('-t'), 'Tiempo (pasado)'),
          slot('person', 2, suffix('-n'), 'Persona (3ª)'),
          slot('number', 3, suffix('-sg'), 'Número (singular)'),
        ],
      },
      {
        category: 'sustantivo',
        slots: [
          slot('case', 1, suffix('-s'), 'Caso (nominativo)'),
          slot('number', 2, suffix('-pl'), 'Número (plural)'),
          slot('gender', 3, suffix('-m'), 'Género (masculino)'),
        ],
      },
    ],
    mutationRules: [],
    showTone: false,
    sample: { spanish: 'El niño come la manzana', conlang: 'Puer paktat malum' },
  },
  {
    id: 'aglutinante-turco',
    label: 'Aglutinante (tipo Turco)',
    description:
      'Idioma aglutinante: se encadenan muchos sufijos, uno por cada idea (tiempo, persona, plural…). Cada pegote significa una sola cosa. El orden es Sujeto-Objeto-Verbo.',
    typology: {
      wordOrder: 'SOV',
      alignment: 'Nominativo-Acusativo',
      morphology: 'Aglutinante',
      headDirection: 'Head-Final',
    },
    paradigms: [
      {
        category: 'verbo',
        slots: [
          slot('tense', 1, suffix('-di'), 'Tiempo (pasado)'),
          slot('person', 2, suffix('-k'), 'Persona (3ª)'),
          slot('number', 3, suffix('-lar'), 'Número (plural)'),
        ],
      },
    ],
    mutationRules: [],
    showTone: false,
    sample: { spanish: 'El niño come la manzana', conlang: 'Çocuk elma yi-di' },
  },
  {
    id: 'aislante-chino',
    label: 'Aislante (tipo Chino)',
    description:
      'Idioma aislante: las palabras casi no cambian de forma. El significado se marca con el ORDEN de las palabras y con partículas sueltas, no con terminaciones. Usa tonos para distinguir significados.',
    typology: {
      wordOrder: 'SVO',
      alignment: 'Nominativo-Acusativo',
      morphology: 'Aislante',
      headDirection: 'Head-Initial',
    },
    phonology: MANDARIN_PHONOLOGY,
    paradigms: [],
    mutationRules: [],
    showTone: true,
    sample: { spanish: 'El niño come la manzana', conlang: 'Háizi chī píngguǒ' },
  },
  {
    id: 'tonal-thai',
    label: 'Tonal (tipo Tailandés)',
    description:
      'Idioma aislante y tonal: las palabras no se flexionan, pero el TONO con el que dices una sílaba cambia por completo su significado. Aquí verás un ejemplo de regla de tono.',
    typology: {
      wordOrder: 'SVO',
      alignment: 'Nominativo-Acusativo',
      morphology: 'Aislante',
      headDirection: 'Head-Initial',
    },
    paradigms: [],
    mutationRules: [
      {
        id: 'tone1',
        name: 'Tono bajo',
        pattern: '.*',
        replacement: '(low)',
        scope: 'tone',
      },
    ],
    showTone: true,
    sample: { spanish: 'El niño come la manzana', conlang: 'Dèk kin appon' },
  },
  {
    id: 'polisintetico-inuit',
    label: 'Polisintético (tipo Inuktitut)',
    description:
      'Idioma polisintético: una sola "palabra" puede ser toda una frase, pegando raíz + persona + número + posesión + tiempo en un solo bloque larguísimo. El orden es Sujeto-Objeto-Verbo.',
    typology: {
      wordOrder: 'SOV',
      alignment: 'Ergativo-Absolutivo',
      morphology: 'Polisintético',
      headDirection: 'Head-Final',
    },
    paradigms: [
      {
        category: 'verbo',
        slots: [
          slot('tense', 1, suffix('-tuq'), 'Tiempo'),
          slot('person', 2, suffix('-anga'), 'Persona'),
          slot('number', 3, suffix('-t'), 'Número'),
          slot('possession', 4, suffix('-nia'), 'Posesión'),
        ],
      },
    ],
    mutationRules: [],
    showTone: false,
    sample: { spanish: 'El niño come la manzana', conlang: 'Angutim niriqpaa' },
  },
];

/**
 * Build a full GrammarManifest from a profile + a language name.
 * The manifest is "fresh": meta is reset, typology/phonology/paradigms/
 * mutationRules come from the profile, and everything else is empty so the
 * conlanger starts from a clean scaffold.
 *
 * `phonology` is omitted entirely when the profile has none (isolating/tonal
 * profiles may still carry one; the Chinese profile does).
 */
export const buildGrammarManifest = (profile: LanguageProfile, name: string): GrammarManifest => {
  const manifest: GrammarManifest = {
    meta: {
      author: 'Wizard',
      version: '1.0',
      sourceFormat: 'json',
      lastUpdated: new Date().toISOString(),
    },
    typology: { ...profile.typology },
    paradigms: profile.paradigms,
    mutationRules: profile.mutationRules,
    roles: [],
    strategies: [],
    notes: [profile.description, name ? `Idioma: ${name}` : ''].filter(Boolean),
    affixInventory: [],
    preview: { useLexiconAffixes: false },
    exceptions: [],
    ui: { showTone: profile.showTone },
  };

  if (profile.phonology) {
    manifest.phonology = profile.phonology;
  }

  return manifest;
};
