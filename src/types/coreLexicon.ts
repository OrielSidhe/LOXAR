/**
 * Core Lexicon types
 * ══════════════════
 * Tipos para el Extended Core Lexicon — diccionario de 1,000-1,500
 * conceptos semánticos base (Ogden's Basic English + Conlangers' Lexipedia).
 */

/** Una entrada del diccionario base */
export interface CoreLexiconEntry {
  /** Identificador único (ej: "c001") */
  id: string;
  /** Concepto en inglés/base (ej: "water", "to eat") */
  concept: string;
  /** Categoría gramatical semántica */
  category: CoreLexiconCategory;
  /** Campo semántico agrupador */
  semanticField: string;
  /** Estado de asignación */
  status: 'available' | 'assigned' | 'used';
}

/** Categorías semánticas del core lexicon */
export type CoreLexiconCategory =
  | 'Naturaleza'
  | 'Elementos'
  | 'Anatomía'
  | 'Verbs of Motion'
  | 'Verbs of Perception'
  | 'Verbs of Communication'
  | 'Verbs of Thinking'
  | 'Verbs of Emotion'
  | 'Verbs of State'
  | 'Adjetivos de Calidad'
  | 'Cantidad y Número'
  | 'Tiempo'
  | 'Lugar y Dirección'
  | 'Personas y Roles'
  | 'Objetos Cotidianos';

/** Palabra asignada (resultado del flujo de generación) */
export interface AssignedWord {
  /** Forma fonotáctica generada */
  form: string;
  /** Concepto asignado del core lexicon */
  concept: string;
  /** Categoría semántica */
  category: CoreLexiconCategory;
  /** Campo semántico */
  semanticField: string;
  /** Estado en el flujo de auditoría */
  status: 'pending' | 'approved' | 'rejected';
  /** Nota opcional del usuario */
  notes?: string;
}

/** Resultado del pool generado con asignaciones */
export interface SemanticAssignmentResult {
  /** Pool de palabras con asignaciones */
  assignedWords: AssignedWord[];
  /** Estadísticas */
  stats: {
    generated: number;
    assigned: number;
    unassigned: number;
    fieldsCovered: string[];
  };
}
