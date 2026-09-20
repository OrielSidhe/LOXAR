/**
 * Core Lexicon — Lazy Exports
 * ══════════════════════════════
 * 
 * Los archivos de datos se cargan bajo demanda para no saturar
 * el bundle inicial de Tauri.
 * 
 * Uso:
 *   const { loadCoreLexicon } = await import('../data/coreLexicon');
 *   const concepts = await loadCoreLexicon();
 */

import type { CoreLexiconEntry } from '../../types/coreLexicon';

/** Carga pregnerativa del diccionario base. */
export async function loadCoreLexicon(): Promise<CoreLexiconEntry[]> {
  // Dynamic import del JSON — Vite lo code-splits automáticamente
  const module = await import('./concepts.json');
  return (module as { concepts: CoreLexiconEntry[] }).concepts;
}

/** Carga solo las categorías disponibles (liviano). */
export async function loadSemanticCategories() {
  const { SEMANTIC_CATEGORIES } = await import('./categories');
  return SEMANTIC_CATEGORIES;
}

/** Carga el generador de asignación semántica. */
export async function loadSemanticAssigner() {
  const { assignSemantics, generateAndAssign } = await import('./generators');
  return { assignSemantics, generateAndAssign };
}

/** Asignación semántica directa (import sincrónico). */
export { assignSemantics } from './generators';

/** Verifica que el core lexicon esté disponible sin cargarlo completamente. */
export async function isCoreLexiconAvailable(): Promise<boolean> {
  try {
    const module = await import('./concepts.json');
    return !!module.concepts && module.concepts.length > 0;
  } catch {
    return false;
  }
}
