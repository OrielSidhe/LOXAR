/**
 * useEditorCompletion — estado del modo "completar" del editor de léxico.
 *
 * Sustituye al bloque inline de `App.tsx` que resolvía las entradas pendientes
 * (`filterPendingCompletion`), el índice acotado (`clampIncompleteIndex`) y la
 * entrada objetivo del modo "completar", junto con sus dos `useEffect`.
 *
 * Contratos preservados:
 *  - `editorMode` arranca en `'add'`;
 *  - `entryToComplete` solo existe en modo `'complete'`;
 *  - el índice se acota cuando el lote pendiente cambia de tamaño;
 *  - los setters conservan la firma `Dispatch<SetStateAction<T>>` que reciben
 *    `useAppHandlers` y `AppBodyLayer`.
 */

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { LexiconEntry } from '../types';
import { clampIncompleteIndex, filterPendingCompletion } from '../utils/lexiconCompletion';
import { resolveEntryToCompleteForMode, type EditorMode } from '../utils/editorCompletionModel';

export interface UseEditorCompletionResult {
    editorMode: EditorMode;
    setEditorMode: Dispatch<SetStateAction<EditorMode>>;
    incompleteIndex: number;
    setIncompleteIndex: Dispatch<SetStateAction<number>>;
    incompleteEntries: LexiconEntry[];
    entryToComplete: LexiconEntry | null;
}

export function useEditorCompletion(activeLexicon: LexiconEntry[]): UseEditorCompletionResult {
    const [editorMode, setEditorMode] = useState<EditorMode>('add');
    const [incompleteIndex, setIncompleteIndex] = useState(0);
    const [entryToComplete, setEntryToComplete] = useState<LexiconEntry | null>(null);

    const incompleteEntries = useMemo(() => filterPendingCompletion(activeLexicon), [activeLexicon]);

    useEffect(() => {
        setEntryToComplete(resolveEntryToCompleteForMode(editorMode, incompleteEntries, incompleteIndex));
    }, [editorMode, incompleteEntries, incompleteIndex]);

    useEffect(() => {
        setIncompleteIndex(prev => clampIncompleteIndex(prev, incompleteEntries.length));
    }, [incompleteEntries.length]);

    return {
        editorMode,
        setEditorMode,
        incompleteIndex,
        setIncompleteIndex,
        incompleteEntries,
        entryToComplete,
    };
}
