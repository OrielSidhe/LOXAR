/**
 * useAppSessionHydration — hidratacion de sesion de `App.tsx` (P1 God Component).
 *
 * Sustituye a los dos `useEffect` grandes del `App.tsx` (bienvenida + bootstrap de
 * proyecto), que hidrataban `showWelcome`/`sessionCacheData`/`projectPath`/
 * `exportPath`/`exportFormats`/`bootstrapDismissed`/`hasLocalData`/`isAppLoaded`/
 * `showProjectBootstrap` con flechas inline. Toda la decision vive en
 * `buildSessionHydrationPlan` (`src/utils/sessionHydrationModel.ts`); este hook solo
 * lee el cache y los lexicos locales y aplica el plan.
 *
 * Contratos preservados:
 *  - la bienvenida se decide una sola vez (`hasSeenWelcome`) y respeta el opt-out
 *    `showWelcomeOnStart` del cache;
 *  - `isAppLoaded` se eleva siempre: tanto si el cache carga como si falla, y nunca
 *    despues de un desmontaje (guard `cancelled`);
 *  - el bootstrap de proyecto se ofrece solo si no hay `projectPath` y no fue
 *    descartado antes;
 *  - en modo no-Tauri (tests) `listLexiconNames` no existe: el error se registra y
 *    `hasLocalData` queda en `false`, sin tumbar el arranque.
 */

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { loadSessionCache, type SessionCache } from '../services/sessionCache';
import { listLexiconNames } from '../services/sqlStorage';
import { DEFAULT_EXPORT_FORMATS, type ExportFormat } from '../utils/lexiconExport';
import {
  buildSessionHydrationPlan,
  shouldShowWelcomeOnStart,
  type SessionHydrationPlan,
} from '../utils/sessionHydrationModel';

export interface UseAppSessionHydrationResult extends SessionHydrationPlan {
  /** `true` recien cuando la bienvenida ya se decidio (permite no parpadear). */
  hasSeenWelcome: boolean;
  /** `false` hasta que el cache (o su falla) termino de hidratar. */
  isAppLoaded: boolean;
  // Los setters se exponen con el tipo completo de `useState` para que los hooks
  // consumidores (`useProjectOperations`, `useAppHandlers`) reciban exactamente
  // `Dispatch<SetStateAction<T>>`, igual que antes de la extraccion.
  setProjectPath: Dispatch<SetStateAction<string | null>>;
  setExportPath: Dispatch<SetStateAction<string | null>>;
  setExportFormats: Dispatch<SetStateAction<ExportFormat[]>>;
  setBootstrapDismissed: Dispatch<SetStateAction<boolean>>;
  setHasLocalData: Dispatch<SetStateAction<boolean>>;
  setShowProjectBootstrap: Dispatch<SetStateAction<boolean>>;
  setIsAppLoaded: Dispatch<SetStateAction<boolean>>;
  setShowWelcome: Dispatch<SetStateAction<boolean>>;
}

export function useAppSessionHydration(): UseAppSessionHydrationResult {
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [sessionCacheData, setSessionCacheData] = useState<SessionCache | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([...DEFAULT_EXPORT_FORMATS]);
  const [bootstrapDismissed, setBootstrapDismissed] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [showProjectBootstrap, setShowProjectBootstrap] = useState(false);

  // ── Pantalla de bienvenida: respetar el opt-out `showWelcomeOnStart` ──
  useEffect(() => {
    if (hasSeenWelcome) return;
    let cancelled = false;
    loadSessionCache()
      .then((cache) => {
        if (cancelled) return;
        setShowWelcome(shouldShowWelcomeOnStart(cache));
        setHasSeenWelcome(true);
      })
      .catch(() => {
        if (cancelled) return;
        setShowWelcome(true);
        setHasSeenWelcome(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSeenWelcome]);

  // ── B0: bootstrap de proyecto — hidratar la sesion y activar la capa ──
  // `isAppLoaded` solo se elevaba aqui; antes ningun setter se invocaba, asi que
  // `AppProjectBootstrapLayer` retornaba null siempre y el flujo de proyecto
  // (elegir ubicacion del `.loxar`) estaba muerto en runtime.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cache = await loadSessionCache();
        if (cancelled) return;
        let hasLexicons = false;
        try {
          const names = await listLexiconNames();
          hasLexicons = names.length > 0;
        } catch (e) {
          // En modo no-Tauri (tests) no hay backend SQL: no es un error de usuario.
          console.error('[App] No se pudo consultar los léxicos locales:', e);
        }
        if (cancelled) return;
        const plan = buildSessionHydrationPlan({ cache, hasLexicons });
        // El hook solo recibe `SessionCache` reales; el modelo lo tipa como su
        // subconjunto estructural `SessionCacheLike`, asi que el cast es seguro.
        setSessionCacheData(plan.sessionCacheData as SessionCache | null);
        setProjectPath(plan.projectPath);
        setExportPath(plan.exportPath);
        setExportFormats(plan.exportFormats);
        setBootstrapDismissed(plan.bootstrapDismissed);
        setHasLocalData(plan.hasLocalData);
        setShowProjectBootstrap(plan.showProjectBootstrap);
        setIsAppLoaded(true);
      } catch (e) {
        console.error('[App] No se pudo cargar la sesión:', e);
        if (!cancelled) setIsAppLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setters = useMemo(
    () => ({
      setProjectPath,
      setExportPath,
      setExportFormats,
      setBootstrapDismissed,
      setHasLocalData,
      setShowProjectBootstrap,
      setIsAppLoaded,
      setShowWelcome,
    }),
    [],
  );

  return useMemo(
    () => ({
      showWelcome,
      sessionCacheData,
      projectPath,
      exportPath,
      exportFormats,
      bootstrapDismissed,
      hasLocalData,
      showProjectBootstrap,
      hasSeenWelcome,
      isAppLoaded,
      ...setters,
    }),
    [
      showWelcome,
      sessionCacheData,
      projectPath,
      exportPath,
      exportFormats,
      bootstrapDismissed,
      hasLocalData,
      showProjectBootstrap,
      hasSeenWelcome,
      isAppLoaded,
      setters,
    ],
  );
}
