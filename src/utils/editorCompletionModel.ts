/**
 * editorCompletionModel.ts
 * ────────────────────────
 * Fuente única de la resolución del modo "completar" del editor de léxico.
 *
 * Antes estas dos funciones vivían inline en el cuerpo de `App.tsx`: el efecto
 * que fijaba `entryToComplete` y el predicado que decidía si el modo activo
 * tenía entrada objetivo. Se extraen para que la decisión sea testeable sin
 * montar el componente.
 */

import type { LexiconEntry } from '../types';

/** Modos del editor de léxico: alta libre o recorrido de pendientes. */
export type EditorMode = 'add' | 'complete';

/** Resuelve la entrada pendiente en `index`; `null` si el índice está fuera de rango. */
export const resolveEntryToComplete = (
    entries: LexiconEntry[],
    index: number,
): LexiconEntry | null => entries[index] ?? null;

/**
 * El modo "completar" apunta a la entrada pendiente del índice; el modo "add"
 * nunca tiene entrada objetivo. Misma semántica que el `useEffect` original.
 */
export const resolveEntryToCompleteForMode = (
    mode: EditorMode,
    entries: LexiconEntry[],
    index: number,
): LexiconEntry | null =>
    mode === 'complete' ? resolveEntryToComplete(entries, index) : null;
