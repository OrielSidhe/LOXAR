/**
 * lexiconMergeModel — logica pura de la fusion de entradas en el lexico activo.
 *
 * `App.tsx` tenia dos `useCallback` inline (`handleLoadLexiconEntries` y
 * `handleMergeLexiconEntries`) que cargaban otro lexico desde `sqlStorage` y lo
 * concatenaban al activo. La carga es un efecto (localStorage / SQLite), asi que
 * vive en `useLexiconMerge`; aca queda la decision pura, testeable sin React ni
 * bridge.
 *
 * Contratos preservados del `App.tsx` original:
 *  - sin lexico activo NO se fusiona y se avisa al usuario (`NO_ACTIVE_LEXICON_MESSAGE`);
 *  - la fusion concatena las entradas nuevas al final del lexico activo
 *    (`[...activeLexicon, ...entries]`), sin deduplicar ni reindexar: esa
 *    politica la aplica despues `useLexicon` (mismo comportamiento de antes);
 *  - `newWordsCount` es la cantidad de entradas anadidas.
 */

import type { LexiconEntry } from '../types';

/** Aviso cuando no hay un lexico activo que fusionar. */
export const NO_ACTIVE_LEXICON_MESSAGE = 'No hay un léxico activo que fusionar.';

export interface LexiconMergeDeps {
  /** Nombre del lexico activo; `null` significa "no hay lexico abierto". */
  activeLexiconName: string | null;
  /** Entradas del lexico activo (base de la fusion). */
  activeLexicon: LexiconEntry[];
}

export interface LexiconMergePlan {
  /** `false` cuando no hay lexico activo: el caller debe avisar y abortar. */
  canMerge: boolean;
  /** Entradas resultantes (base + anadidas); igual a la base si no se puede. */
  mergedEntries: LexiconEntry[];
  /** Cantidad de entradas anadidas (para `newWordsCount`). */
  addedCount: number;
}

/**
 * Resuelve la fusion sin efectos: con lexico activo concatena `entries` al
 * final; sin el, devuelve la base intacta y `canMerge: false`.
 */
export function buildLexiconMerge(
  deps: LexiconMergeDeps,
  entries: LexiconEntry[],
): LexiconMergePlan {
  if (!deps.activeLexiconName) {
    return { canMerge: false, mergedEntries: deps.activeLexicon, addedCount: 0 };
  }
  return {
    canMerge: true,
    mergedEntries: [...deps.activeLexicon, ...entries],
    addedCount: entries.length,
  };
}
