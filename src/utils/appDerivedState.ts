/**
 * appDerivedState.ts
 * ─────────────────
 * Fuente única de la derivación de estado que `App.tsx` consume para el
 * dashboard, el editor de léxico y el resumen del motor pragmático.
 *
 * Antes estos cuatro `useMemo` vivían inline en el cuerpo de `App.tsx`:
 * - `grammarMetrics`: conteos vivos del manifiesto canónico.
 * - `pragmaticEngine`: resumen presentacional del motor pragmático derivado
 *   del `typology` del manifiesto (con fallback explícito por campo).
 * - `completionStats`: totales del modo "completar".
 * - `entryBeingEdited`: entrada objetivo del editor según el modo activo.
 *
 * El resumen pragmático es deliberadamente un SUBCONJUNTO presentacional: no
 * es `PragmaticEngineState` (que exige `typology` completa y `slots`), sino la
 * forma que `LanguageHomeCanvas`/`GraphCanvas` consumen para el nodo Gramática.
 */

import type { GrammarManifest, LexiconEntry } from '../types';
import { morphologyToTypologyProfile, type TypologyProfile } from '../types/pragmaticTypes';
import { getGrammarMetrics, type GrammarMetrics } from './grammarMetrics';
import {
  buildLexiconCompletionStats,
  type LexiconCompletionStats,
} from './lexiconCompletion';

/** Resumen pragmático que el dashboard renderiza en el nodo Gramática. */
export interface PragmaticEngineSummary {
  /** Categoría tipológica derivada de `typology.morphology` (nunca hardcodeada). */
  typologyLabel: TypologyProfile;
  /** Reglas gramaticales; reutiliza `getGrammarMetrics` para no duplicar el criterio. */
  rulesCount: number;
  alignment: string;
  wordOrder: string;
  headDirection: string;
  /** Tipo de cláusula guardado en el manifiesto; `null` si nunca se fijó. */
  activeClauseType: string | null;
}

/** Entradas que alimentan la derivación. Todas provienen del estado de `App.tsx`. */
export interface AppDerivedStateInput {
  activeGrammar?: GrammarManifest | null;
  activeLexicon: LexiconEntry[];
  incompleteEntries: LexiconEntry[];
  editorMode: 'add' | 'complete';
  entryToComplete: LexiconEntry | null;
}

export interface AppDerivedState {
  grammarMetrics: GrammarMetrics;
  pragmaticEngine: PragmaticEngineSummary | undefined;
  completionStats: LexiconCompletionStats;
  entryBeingEdited: LexiconEntry | null;
}

/**
 * Deriva el resumen pragmático desde el manifiesto canónico.
 *
 * Devuelve `undefined` cuando el manifiesto no tiene `typology` (misma
 * condición que el `useMemo` original: el nodo Gramática no muestra resumen).
 * Los campos de alineación/orden/dirección caen a `''` y `alignment` a
 * `'nominative'` para que el render nunca reciba `undefined`.
 */
export const buildPragmaticEngineSummary = (
  grammar?: GrammarManifest | null,
  rulesCount: number = 0,
): PragmaticEngineSummary | undefined => {
  if (!grammar?.typology) return undefined;
  return {
    typologyLabel: morphologyToTypologyProfile(grammar.typology.morphology),
    rulesCount,
    alignment: grammar.typology.alignment || 'nominative',
    wordOrder: grammar.typology.wordOrder || '',
    headDirection: grammar.typology.headDirection || '',
    activeClauseType: grammar.pragmaticEngine?.activeClauseType ?? null,
  };
};

/** Deriva el bloque completo de estado presentacional de la app. */
export const deriveAppState = ({
  activeGrammar,
  activeLexicon,
  incompleteEntries,
  editorMode,
  entryToComplete,
}: AppDerivedStateInput): AppDerivedState => {
  const grammarMetrics = getGrammarMetrics(activeGrammar);
  return {
    grammarMetrics,
    pragmaticEngine: buildPragmaticEngineSummary(activeGrammar, grammarMetrics.rules),
    completionStats: buildLexiconCompletionStats(activeLexicon, incompleteEntries),
    entryBeingEdited: editorMode === 'complete' ? entryToComplete : null,
  };
};
