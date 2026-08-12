/**
 * standardCategories.ts
 * ----------------------------------------------------------------------------
 * Catálogo de categorías gramaticales canónicas.
 *
 * @deprecated Esta es ahora una re-exportación desde `taxonomy.ts`.
 *   El diccionario canónico vive en `src/data/taxonomy.ts` (LEXICAL_CATEGORIES).
 *   Se mantiene este archivo como shim de compatibilidad para los imports
 *   existentes (EntryEditor, LexiconTable).
 * ----------------------------------------------------------------------------
 */

import { STANDARD_CATEGORIES_KEYS, lexicalCategoryOptions } from './taxonomy';

/** Keys canónicas sin acentos de TODAS las categorías léxicas (raíces + subcats). */
export const STANDARD_CATEGORIES: string[] = STANDARD_CATEGORIES_KEYS;

/**
 * Combina la lista estándar con las categorías personalizadas del usuario.
 * Devuelve solo las keys canónicas (sin acentos) como `string[]`,
 * compatible con el uso actual en EntryEditor/LexiconTable.
 */
export function mergeCategoryOptions(customCategories: string[]): string[] {
  const standardKeys = new Set(STANDARD_CATEGORIES_KEYS);
  const customKeys = new Set(customCategories.map(c => c.toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')));
  // Union de ambos sets, ordenada por label de display
  const allKeys = Array.from(new Set([...STANDARD_CATEGORIES_KEYS, ...customKeys])).sort();
  return allKeys;
}

/** Opciones para dropdowns que necesiten `{value, label}` (uso futuro). */
export { lexicalCategoryOptions };

/** Label display con tildes para una key canónica. */
export { displayOf } from './taxonomy';



