import { useEffect } from 'react';
import { initPragmaticDb } from '../services/grammarDb';

/**
 * Inicializa la base de datos pragmática al montar la app.
 *
 * Extraído del `useEffect` inline de `App.tsx` (P1 God Component): el contrato es
 * verbatim — corre una sola vez, degrada en silencio y solo registra el fallo.
 */
export function usePragmaticDbInit(): void {
  useEffect(() => {
    initPragmaticDb().catch(e => console.error('[App] Failed to init pragmatic DB:', e));
  }, []);
}
