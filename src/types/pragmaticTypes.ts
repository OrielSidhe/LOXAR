/**
 * pragmaticTypes.ts
 * ══════════════════
 * Fuente CANÓNICA de tipos para la Capa Pragmática de LOXAR.
 *
 * Este archivo es el único punto de verdad para los tipos de la
 * interfaz del motor pragmático. Re-exporta los tipos internos del
 * motor (engine) y define los tipos de la UI (PragmaticEngineState).
 *
 * ── Principio de diseño ──
 * El motor usa `TypologyProfile` (string: 'flexive'|'agglutinative'|'isolating')
 * para la selección de plantillas internas. La UI usa `typologyLabel` para ese
 * mismo propósito, mientras que `typology` es el objeto avanzado
 * `TypologicalProfile` con toda la información morfológica, sintáctica,
 * nominal, verbal, etc. del idioma.
 */

// ── Tipos del motor interno (import para uso interno + re-export) ──
import type {
  PragmaticBlockId,
  PragmaticClauseTypeId,
  PragmaticBlock,
  PragmaticBlockRef,
  GrammaticalFunction,
  PragmaticSlotState,
  TypologyProfile,           // string: 'flexive'|'agglutinative'|'isolating'
  PragmaticClauseType,
  SentenceBuilderState,
  PragmaticSentence,
  PragmaticAstNode,
} from '../services/grammar/pragmaticTypes';
export type {
  PragmaticBlockId,
  PragmaticClauseTypeId,
  PragmaticBlock,
  PragmaticBlockRef,
  GrammaticalFunction,
  PragmaticSlotState,
  TypologyProfile,
  PragmaticClauseType,
  SentenceBuilderState,
  PragmaticSentence,
  PragmaticAstNode,
} from '../services/grammar/pragmaticTypes';
export { PRAGMATIC_BLOCKS } from '../services/grammar/pragmaticTypes';

// ── Tipos avanzados de tipología (del archivo types.ts original) ─────
// Estos definen la estructura completa del perfil tipológico del idioma.

export type MarkingStrategy =
  | 'positional' | 'prefix' | 'suffix' | 'infix' | 'circumfix'
  | 'transfix_templatic' | 'clitic' | 'particle' | 'auxiliary_periphrastic'
  | 'tone_change' | 'stress_shift' | 'root_internal_mutation_apophony'
  | 'reduplication' | 'suppletion' | 'zero_unmarked';

/**
 * TypologicalProfile — el perfil tipológico completo del idioma.
 * Es el "núcleo + escritura": phonology, morphology, syntax, nominal,
 * verbal, modifiers, writing. Pragmatics y lexicon son excluidos.
 */
export interface TypologicalProfile {
  meta?: {
    modality?: string[];
    naturalness?: string;
    vitality_status?: string;
  };
  morphology?: {
    synthesis_level?: string;
    fusion_degree?: string;
    vowel_harmony?: boolean;
    consonant_mutation?: boolean;
  };
  syntax?: {
    basic_word_order?: string;
    flexibility?: string;
    morphosyntactic_alignment?: string;
    head_directionality?: string;
    pro_drop_behavior?: string;
  };
  nominal?: {
    noun_classes?: { active: boolean; inventory: string[] };
    number_system?: { active: boolean; inventory: string[] };
    case_system?: { active: boolean; inventory: string[] };
    definiteness?: { marking_strategy: string[] };
  };
  verbal?: {
    tense_system?: { active: boolean; inventory: string[] };
    aspect_system?: { active: boolean; inventory: string[] };
    mood_system?: { inventory: string[] };
    valency?: { inventory: string[] };
  };
  modifiers?: {
    adjective_typology?: string;
    adverb_formation?: string;
    adpositions?: string;
  };
  writing?: {
    exists?: boolean;
    script_type?: string;
    directionality?: string;
    case_distinction?: boolean;
  };
  syntacticRoles?: { catalog: string[]; custom: string[] };
  markingStrategies?: MarkingStrategy[];
}

// ── Estado del motor pragmático (interfaz UI) ──────────────────────
/**
 * PragmaticEngineState — el estado completo del motor pragmático.
 *
 * - `typology`: el objeto avanzado con toda la tipología del idioma.
 * - `typologyLabel`: el string categorización que usa el motor internamente
 *   para selección de plantillas ('flexive'|'agglutinative'|'isolating').
 * - `activeClauseType`: el tipo de oración seleccionado.
 * - `slots`: los bloques E-A-R-I-C-K-Q-F llenables.
 */
export interface PragmaticEngineState {
  /** Perfil tipológico avanzado completo del idioma */
  typology: TypologicalProfile;
  /** Categoría tipológica para el motor interno (plantillas) */
  typologyLabel: TypologyProfile;
  /** Tipo de oración activa en el constructor */
  activeClauseType: string | null;
  /** Slots llenables del constructor E-A-R-I-C-K-Q-F */
  slots: PragmaticSlotState[];
}

/** Estado pragmático por defecto — requiere un label explícito derivado del manifest */
export function createDefaultPragmaticState(
  label: TypologyProfile,
): PragmaticEngineState {
  return {
    typology: {},
    typologyLabel: label,
    activeClauseType: null,
    slots: [],
  };
}

/**
 * Deriva el TypologyProfile (etiqueta tipológica para el motor) a partir del
 * campo `morphology` del manifest activo.
 *
 * Esta es la ÚNICA fuente de verdad para el valor default de typologyLabel.
 * La UI nunca hardcodea 'isolating'; siempre deriva del manifest.
 */
export function morphologyToTypologyProfile(morphology: string | undefined): TypologyProfile {
  if (!morphology || typeof morphology !== 'string') return 'isolating';
  const m = morphology.toLowerCase().trim();
  if (m.includes('isolat') || m.includes('analyt')) return 'isolating';
  if (m.includes('agglutin')) return 'agglutinative';
  if (m.includes('fusion') || m.includes('flex') || m.includes('polysynth') || m.includes('templatic')) return 'flexive';
  return 'isolating';
}
