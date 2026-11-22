/**
 * useAppDerivedState — estado presentacional derivado de `App.tsx`.
 *
 * Sustituye a los cuatro `useMemo` inline del cuerpo del God Component
 * (`grammarMetrics`, `pragmaticEngine`, `completionStats` y `entryBeingEdited`).
 * La derivación pura vive en `src/utils/appDerivedState.ts`; este hook solo la
 * memoiza con las dependencias reales.
 *
 * Contratos preservados:
 *  - `pragmaticEngine` es `undefined` si el manifiesto no tiene `typology`;
 *  - `rulesCount` del resumen pragmático reutiliza `getGrammarMetrics`;
 *  - `entryBeingEdited` solo existe en modo `'complete'`.
 */

import { useMemo } from 'react';
import {
  deriveAppState,
  type AppDerivedState,
  type AppDerivedStateInput,
} from '../utils/appDerivedState';

export function useAppDerivedState(input: AppDerivedStateInput): AppDerivedState {
  const { activeGrammar, activeLexicon, incompleteEntries, editorMode, entryToComplete } = input;

  return useMemo(
    () =>
      deriveAppState({
        activeGrammar,
        activeLexicon,
        incompleteEntries,
        editorMode,
        entryToComplete,
      }),
    [activeGrammar, activeLexicon, incompleteEntries, editorMode, entryToComplete],
  );
}
