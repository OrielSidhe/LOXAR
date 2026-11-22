import type { LexiconEntry } from '../types';

/**
 * Criterio de "pendiente de completar" del editor de léxico.
 *
 * DISTINTO de `isEntryIncomplete` (`src/utils/lexiconTableModel.ts`): esta variante
 * también exige `Significado`, porque el modo "completar" del editor recorre las
 * entradas a las que les falta contenido, no solo las que carecen de raíz, léxema o
 * categoría. No unificar ambos predicados sin una decisión de producto.
 */
const PENDING_COMPLETION_CATEGORIES = new Set(['desconocida', 'n/a']);

/** Una entrada está pendiente de completar si le falta significado, raíz, léxema o categoría. */
export const isEntryPendingCompletion = (entry: LexiconEntry): boolean => {
    const category = entry.Categoría?.trim().toLowerCase();
    return !entry.Significado?.[0]?.trim()
        || !category
        || PENDING_COMPLETION_CATEGORIES.has(category)
        || !entry.Raíz?.trim()
        || !entry.Léxema?.[0]?.trim();
};

/** Filtra el léxico conservando solo las entradas pendientes de completar. */
export const filterPendingCompletion = (entries: LexiconEntry[]): LexiconEntry[] =>
    entries.filter(isEntryPendingCompletion);

export type LexiconCompletionStats = {
    total: number;
    needsFunction: number;
    totalIncomplete: number;
};

/** Estadísticas de completitud que consume el dashboard y el editor. */
export const buildLexiconCompletionStats = (
    entries: LexiconEntry[],
    pendingEntries: LexiconEntry[],
): LexiconCompletionStats => ({
    total: entries.length,
    needsFunction: pendingEntries.filter(entry => !entry.Categoría || entry.Categoría === 'desconocida').length,
    totalIncomplete: pendingEntries.length,
});

/** Acota el índice de la entrada en completado al rango válido del lote pendiente. */
export const clampIncompleteIndex = (index: number, pendingCount: number): number =>
    Math.max(0, Math.min(index, pendingCount - 1));
