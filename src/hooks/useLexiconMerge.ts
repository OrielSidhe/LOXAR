/**
 * useLexiconMerge — carga y fusion de lexicos para el modal de comparacion.
 *
 * Sustituye a los dos `useCallback` inline de `App.tsx`
 * (`handleLoadLexiconEntries` y `handleMergeLexiconEntries`), que eran el ultimo
 * bloque de logica de dominio del God Component. La decision pura vive en
 * `buildLexiconMerge` (`src/utils/lexiconMergeModel.ts`); este hook solo cablea
 * el almacen (`loadLexicon`) y el `useLexicon` real.
 *
 * Contratos preservados:
 *  - cargar un lexico devuelve sus entradas o `null` si no existe; un fallo del
 *    almacen se registra y degrada a `null` (el modal muestra "no se pudo cargar");
 *  - fusionar sin lexico activo NO escribe nada y notifica el error;
 *  - fusionar escribe via `updateActiveLexiconEntries` (marca dirty y acumula
 *    `wordsAddedSinceSave` con la cantidad anadida).
 */

import { useCallback, useMemo } from 'react';
import { loadLexicon } from '../services/sqlStorage';
import type { LexiconEntry } from '../types';
import { buildLexiconMerge, NO_ACTIVE_LEXICON_MESSAGE } from '../utils/lexiconMergeModel';

export interface UseLexiconMergeOptions {
  activeLexicon: LexiconEntry[];
  activeLexiconName: string | null;
  /** Persiste las entradas fusionadas en el lexico activo. */
  updateActiveLexiconEntries: (entries: LexiconEntry[], makeDirty?: boolean, newWordsCount?: number) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export interface UseLexiconMergeResult {
  /** Carga las entradas de otro lexico guardado; `null` si no existe o falla. */
  loadLexiconEntries: (name: string) => Promise<LexiconEntry[] | null>;
  /** Fusiona `entries` en el lexico activo (no-op con aviso si no hay activo). */
  mergeLexiconEntries: (entries: LexiconEntry[]) => void;
}

export function useLexiconMerge(options: UseLexiconMergeOptions): UseLexiconMergeResult {
  const { activeLexicon, activeLexiconName, updateActiveLexiconEntries, showNotification } = options;

  const loadLexiconEntries = useCallback(
    async (name: string): Promise<LexiconEntry[] | null> => {
      try {
        const data = await loadLexicon(name);
        return data?.entries ?? null;
      } catch (e) {
        console.error(`No se pudo cargar el léxico "${name}" para comparar.`, e);
        return null;
      }
    },
    [],
  );

  const mergeLexiconEntries = useCallback(
    (entries: LexiconEntry[]) => {
      const plan = buildLexiconMerge({ activeLexiconName, activeLexicon }, entries);
      if (!plan.canMerge) {
        showNotification(NO_ACTIVE_LEXICON_MESSAGE, 'error');
        return;
      }
      updateActiveLexiconEntries(plan.mergedEntries, true, plan.addedCount);
    },
    [activeLexicon, activeLexiconName, updateActiveLexiconEntries, showNotification],
  );

  return useMemo(
    () => ({ loadLexiconEntries, mergeLexiconEntries }),
    [loadLexiconEntries, mergeLexiconEntries],
  );
}
