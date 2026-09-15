/**
 * pragmaticTypes.ts
 * ──────────────────
 * Tipos del motor de sintaxis basado en la "Capa Pragmática".
 *
 * El modelo abandona el flujo estático SOV y lo reemplaza por
 * una jerarquía donde la INTENCIÓN de la oración (tipo pragmático)
 * determina el orden y la composición de los módulos estructurales.
 *
 * Módulos de abstracción (slots):
 *   E - Entidad (Actor / Sujeto)
 *   A - Acción (Núcleo del proceso)
 *   R - Receptor (Paciente / Blanco)
 *   I - Intención (Fuerza ilocutiva / partícula modal)
 *   C - Condición (Circunstancia)
 *   K - Konsekvenco (Desenlace)
 *   Q - Qualitajo (Atributo / Adjetivación)
 *   F - Effekto (Efecto secundario)
 *
 * Las keys de funciones gramaticales son CANÓNICAS de taxonomy.ts
 * (sustantivo, verbo, adjetivo, adverbio, particula, pronombre, etc.)
 */

// ── Tipos ──────────────────────────────────────────────
export type PragmaticBlockId = 'E' | 'A' | 'R' | 'I' | 'C' | 'K' | 'Q' | 'F';

export type PragmaticClauseTypeId =
  | 'afirmation'
  | 'question'
  | 'command'
  | 'report'
  | 'desire'
  | 'exclamation'
  | 'nominal'
  | 'verse'
  | 'justicial';

export type TypologyProfile = 'flexive' | 'agglutinative' | 'isolating';

// ── Catálogo global de funciones gramaticales ──────────
// Keys alineadas con LEXICAL_CATEGORIES de taxonomy.ts
export interface GrammaticalFunction {
  id: string;              // key canónica de taxonomy (p. ej. "sustantivo")
  label: string;           // etiqueta UI (p. ej. "Sustantivo")
  category: 'noun' | 'verb' | 'adjective' | 'adverb'
            | 'particle' | 'morpheme' | 'phrase';
  description?: string;
  /** Slots que puede llenar (E/A/R/I/C/K/Q/F) */
  fillsSlots: PragmaticBlockId[];
  /** Tipos de oración donde aparece habitualmente */
  commonInClauseTypes: PragmaticClauseTypeId[];
}

// ── Bloques de construcción estructural ─────────────────
export interface PragmaticBlock {
  id: PragmaticBlockId;
  label: string;
  description: string;
  /** Funciones gramaticales que pueden llenar este slot */
  allowedFunctions: string[];   // ids canónicos de taxonomy
  required: boolean;
  morphologyOverride?: string;
}

// ── Tipos de oración (nodos raíz de la Capa Pragmática) ─────────
export interface PragmaticClauseType {
  id: PragmaticClauseTypeId;
  label: string;
  description: string;
  /** Bloques constitutivos, ordenados por prioridad */
  blocks: PragmaticBlockRef[];
  /** Plantillas pre-llenadas por tipología */
  templates: Record<TypologyProfile, string[]>;
}

export interface PragmaticBlockRef {
  blockId: PragmaticBlockId;
  order: number;
  defaultFunction?: string;
}

// ── Estado del constructor de oraciones ──────────────────
export interface PragmaticSlotState {
  blockId: PragmaticBlockId;
  blockLabel: string;
  functionId: string | null;
  lexemeId: string | null;
  customText: string;
  features: Record<string, string>;
}

/** @deprecated Alias por compatibilidad */
export type ConstructorSlot = PragmaticSlotState;

export interface SentenceBuilderState {
  clauseTypeId: PragmaticClauseTypeId;
  slots: ConstructorSlot[];
  typology: TypologyProfile;
  moduleOrder: PragmaticBlockId[];
}

// ── Resultado del motor ──────────────────────────────────
export interface PragmaticSentence {
  surface: string;
  ast: PragmaticAstNode[];
  featuresApplied: string[];
}

export interface PragmaticAstNode {
  slot: PragmaticBlockId;
  functionId: string;
  lexemeId: string | null;
  surfaceForm: string;
  children: PragmaticAstNode[];
}

// ── Catálogo de bloques (definición canónica) ───────────
export const PRAGMATIC_BLOCKS: Record<PragmaticBlockId, Omit<PragmaticBlock, 'id'>> = {
  E: {
    label: 'Entidad',
    description: 'Actor / Sujeto — quien realiza la acción',
    allowedFunctions: ['sustantivo', 'pronombre', 'nombre_propio'],
    required: true,
  },
  A: {
    label: 'Acción',
    description: 'Núcleo del proceso — verbo o núcleo verbal',
    allowedFunctions: ['verbo', 'particula_verbal'],
    required: true,
  },
  R: {
    label: 'Receptor',
    description: 'Paciente / Blanco — quien recibe la acción',
    allowedFunctions: ['sustantivo', 'pronombre'],
    required: false,
  },
  I: {
    label: 'Intención',
    description: 'Fuerza ilocutiva / partícula modal',
    allowedFunctions: ['particula', 'adv_modo'],
    required: false,
  },
  C: {
    label: 'Condición',
    description: 'Circunstancia / entorno de la acción',
    allowedFunctions: ['adverbio', 'sustantivo_oblicuo', 'preposicion'],
    required: false,
  },
  K: {
    label: 'Konsekvenco',
    description: 'Desenlace / resultado de la acción',
    allowedFunctions: ['sustantivo', 'verbo', 'adjetivo'],
    required: false,
  },
  Q: {
    label: 'Qualitajo',
    description: 'Atributo / adjectivación del sujeto u objeto',
    allowedFunctions: ['adjetivo', 'adverbio'],
    required: false,
  },
  F: {
    label: 'Effekto',
    description: 'Efecto secundario / consecuencia colateral',
    allowedFunctions: ['sustantivo', 'verbo', 'adjetivo'],
    required: false,
  },
};
