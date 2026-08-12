import type { GrammarManifest, LexiconEntry, MorphemeSegment, SyntaxCanvas } from '../../types';

export type SurfaceFormSource = 'rule' | 'suppletion' | 'particle';

export interface SurfaceForm {
  form: string;
  source: SurfaceFormSource;
  applied: string[];
  segments?: MorphemeSegment[];
  freeMorphemes?: string[];
  violations?: string[];
  warnings?: string[];
}

export type GrammaticalRole =
  | 'root'               // verbo principal
  | 'subject'            // sujeto estructural
  | 'object'             // complemento directo
  | 'particle'           // partícula independiente (preverbales, posts)
  | 'modifier'           // adjetivo, adverbio, etc.
  | 'auxiliary_verb';    // verbo auxiliar en cadena

// -------------------------------------------------
//                       NODOS BASE
// -------------------------------------------------
export interface SyntaxNode {
  /** Identificador único – útil para UI/debug */
  id: string;

  /** Rol semántico (ver tabla arriba) */
  role: GrammaticalRole;

  /** Representación léxica simple.
   *  - `root`  : cadena del lexema (ej. "faryo")
   *  - `category`  : tipo lexical básico (verb|noun|adjective|particle) */
  lexeme: { root: string; category: 'verb' | 'noun' | 'adjective' | 'particle' };

  /** Metadatos arbitrarios (case, aspect, etc.) */
  features: Record<string, string>;

  /** ***NÚCLEO DEL AST***: los nodos que modifican a este nodo */
  dependents: SyntaxNode[];
}

// -------------------------------------------------
//                    VERBOS
// -------------------------------------------------
export interface VerbNode extends SyntaxNode {
  category: 'verb';
  role: 'root' | 'auxiliary_verb';
  /** Si true, este verbo es la raíz (se conjuga);
   *  si false, solo aporta información (ej. auxiliares). */
  conjugateRoot: boolean;
}

// -------------------------------------------------
//               PARTICULAS
// -------------------------------------------------
export interface ParticleNode extends SyntaxNode {
  category: 'particle';
  role: 'particle';
  /** Si true, el motor debe imprimirla separada
   *  por espacio (ej. "vo faryo") en vez de fusionarla. */
  isIndependentWord: boolean;
}

// -------------------------------------------------
//                     CLAÚSULA
// -------------------------------------------------
export interface ClauseAST {
  /** Identificador interno de la cláusula (para UI) */
  clauseId: string;

  /** El verbo principal es la raíz del árbol de la oración */
  root: VerbNode;
}

// -------------------------------------------------
//                ENTRADA PLANE (para retrocompatibilidad)
// -------------------------------------------------
export interface OldClauseFeatures {
  /** Mantener la firma actual (array plano) */
  participants: ClauseParticipant[];
}

export interface ClauseParticipant {
  role: string;
  lexeme: LexiconEntry;
  features: Record<string, string>;
}

export interface ClauseFeatures {
  participants: ClauseParticipant[];
  freeMorphemes?: { role: string; form: string }[];
}

export interface RealizeClauseResult {
  sentence: string;
  canvas: SyntaxCanvas;
}
