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
 *    `hasLocalData` queda en `false`, sin tumbar el arranque;
 *  - los `.loxar` del equipo se escanean una sola vez y solo cuando el modal de
 *    bootstrap va a ofrecerse (`availableProjects` alimenta la lista "Proyectos
 *    encontrados en este equipo"); el scan fallido degrada a `[]`.
 */

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { loadSessionCache, type SessionCache } from '../services/sessionCache';
import { listLexiconNames } from '../services/sqlStorage';
import { scanForLoxarProjects } from '../services/projectDiscovery';
import { DEFAULT_EXPORT_FORMATS, type ExportFormat } from '../utils/lexiconExport';
import {
  buildSessionHydrationPlan,
  shouldOfferProjectBootstrap,
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
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);

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
        // Solo se escanean `.loxar` cuando el modal de bootstrap va a ofrecerse:
        // con proyecto configurado o con el descarte previo no tiene sentido
        // tocar el sistema de archivos en cada arranque. En modo no-Tauri
        // `scanForLoxarProjects` devuelve `[]` sin efectos.
        const offerBootstrap = shouldOfferProjectBootstrap(cache);
        let foundProjects: string[] = [];
        if (offerBootstrap) {
          foundProjects = await scanForLoxarProjects().catch(() => [] as string[]);
        }
        if (cancelled) return;
        const plan = buildSessionHydrationPlan({ cache, hasLexicons, foundProjects });
        // El hook solo recibe `SessionCache` reales; el modelo lo tipa como su
        // subconjunto estructural `SessionCacheLike`, asi que el cast es seguro.
        setSessionCacheData(plan.sessionCacheData as SessionCache | null);
        setProjectPath(plan.projectPath);
        setExportPath(plan.exportPath);
        setExportFormats(plan.exportFormats);
        setBootstrapDismissed(plan.bootstrapDismissed);
        setHasLocalData(plan.hasLocalData);
        setShowProjectBootstrap(plan.showProjectBootstrap);
        setAvailableProjects(plan.availableProjects);
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
      availableProjects,
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
      availableProjects,
      hasSeenWelcome,
      isAppLoaded,
      setters,
    ],
  );
}
