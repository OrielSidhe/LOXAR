/**
 * declarativeFormat.ts
 *
 * Formato declarativo intermedio para el motor de gramática.
 *
 * Regla de oro: TODO parser local (textParser) y TODO inductor LLM (geminiService)
 * devuelven este formato. El normalizer lo convierte a GrammarManifest (types.ts)
 * resolviendo aliases con taxonomy.ts.
 *
 * Esto garantiza:
 * - Trazabilidad: se sabe exactamente qué produjo el parser/LLM
 * - Validación: Zod estricto en esta capa, Zod laxo en GrammarManifest externo
 * - Determinismo: mismo input → mismo DeclarativeManifest
 */

// ---------------------------------------------------------------------------
// Tipos base (alineados a types.ts pero sin dependencia circular)
// ---------------------------------------------------------------------------

export type StrategyType =
  | 'position'
  | 'affix'
  | 'clitic'
  | 'tone'
  | 'mutation'
  | 'particle'
  | 'auxiliary'
  | 'suppletion';

// ---------------------------------------------------------------------------
// Slots y paradigmas
// ---------------------------------------------------------------------------

export interface DeclarativeSlot {
  /** ID único del slot (ej: "plural", "past_tense") */
  id: string;
  /** Rasgo gramatical que activa este slot (ej: "number", "tense") */
  feature: string;
  /** Orden de aplicación dentro del paradigma (menor → primero) */
  order: number;
  /** Cómo se realiza este slot */
  realization: {
    kind: 'affix' | 'mutation' | 'tone' | 'stem' | 'particle';
    /** Forma de superficie (ej: "-k", "^h→x", "rising") */
    form: string;
    /** Condición de alomorfia (opcional) */
    when?: string;
    /** Posición del afijo (solo para kind='affix') */
    position?: 'prefix' | 'suffix' | 'infix' | 'circumfix';
  };
}

export interface DeclarativeParadigm {
  /** Categoría léxica a la que aplica (ej: "noun", "verb") */
  category: string;
  /** Ranuras de inflexión */
  slots: DeclarativeSlot[];
}

// ---------------------------------------------------------------------------
// Estrategias de marcaje
// ---------------------------------------------------------------------------

export interface DeclarativeStrategy {
  id: string;
  name: string;
  type: StrategyType;
  /** A qué categorías aplica (ej: ["noun", "verb"]) */
  appliesTo?: string[];
  /** Aplica a estas categorías léxicas (alias de appliesTo, más explícito) */
  appliesToCategories?: string[];
  positionRule?: {
    anchor: 'verb' | 'noun' | 'sentence_start' | 'sentence_end';
    relation: 'before' | 'after';
    distance: number;
  };
  affixRule?: {
    position: string; // normalizado a prefix/suffix/infix/circumfix después
    form: string;
    allomorphs?: { condition: string; form: string }[];
  };
  particleRule?: {
    marker: string;
    relativePosition: 'before' | 'after';
    distance?: number;
  };
  cliticRule?: {
    form: string;
    hostPosition: 'proclitic' | 'enclitic' | 'mesoclitic';
  };
  auxiliaryRule?: {
    auxiliaryForm: string;
    order: 'aux_before' | 'aux_after';
    mainVerbForm: string;
  };
  toneRule?: {
    description: string;
    pattern?: string;
  };
  transformationRule?: {
    pattern: string;
    replacement: string;
  };
  notes?: string;
}

// ---------------------------------------------------------------------------
// Mutaciones y excepciones
// ---------------------------------------------------------------------------

export interface DeclarativeMutationRule {
  id: string;
  name: string;
  pattern: string;
  replacement: string;
  scope: 'consonant' | 'vowel' | 'tone';
}

export interface DeclarativeException {
  id: string;
  ruleDescription: string;
  exceptionPattern: string;
  context: string;
  example?: string;
}

// ---------------------------------------------------------------------------
// Roles y manifiesto
// ---------------------------------------------------------------------------

export interface DeclarativeRole {
  id: string;
  name: string;
  description?: string;
}

export interface DeclarativeManifest {
  name: string;
  typology: {
    wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OVS' | 'OSV';
    morphology: 'isolating' | 'agglutinative' | 'fusional' | 'polysynthetic';
    headDirection: 'head-initial' | 'head-final';
    alignment: string;
  };
  phonology: {
    consonants: string[];
    vowels: string[];
    syllableStructures: string[];
  };
  paradigms: DeclarativeParadigm[];
  strategies: DeclarativeStrategy[];
  mutationRules: DeclarativeMutationRule[];
  exceptions: DeclarativeException[];
  roles: DeclarativeRole[];
}

// ---------------------------------------------------------------------------
// Reporte de parsing
// ---------------------------------------------------------------------------

export interface ParseReport {
  sectionsFound: string[];
  sectionsUnparsed: string[];
  paradigmsExtracted: number;
  exceptionsExtracted: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Reporte de validación post-import
// ---------------------------------------------------------------------------

export type SectionStatus = 'ok' | 'partial' | 'empty' | 'unparsed' | 'missing';

export interface Problem {
  severity: 'error' | 'warning' | 'info';
  /** Ubicación en el manifiesto (ej: "paradigms[0].slots[2].realization.form") */
  location: string;
  message: string;
  fix?: string;
}

export interface ImportValidationReport {
  ok: boolean;
  /** Score 0-100 de completitud */
  score: number;
  sections: {
    phonology: SectionStatus;
    typology: SectionStatus;
    paradigms: SectionStatus;
    strategies: SectionStatus;
    exceptions: SectionStatus;
    roles: SectionStatus;
  };
  problems: Problem[];
  suggestions: string[];
}
