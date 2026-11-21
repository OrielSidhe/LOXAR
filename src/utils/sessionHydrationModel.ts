/**
 * sessionHydrationModel — logica pura de la hidratacion de sesion de `App.tsx`.
 *
 * `App.tsx` tenia dos `useEffect` grandes (bienvenida + bootstrap de proyecto) que
 * resolvian a mano, con flechas inline, que debia mostrarse o no la bienvenida y si
 * debia ofrecerse la ubicacion del `.loxar`. Este modelo concentra esas decisiones
 * en funciones puras, de modo que el hook solo hidrata estado y los tests pueden
 * recorrer cada rama sin montar React.
 *
 * Contratos preservados del `App.tsx` original:
 *  - `showWelcomeOnStart` por defecto es `true` (la bienvenida se muestra si el
 *    cache no lo desactivo explicitamente).
 *  - El bootstrap de proyecto se ofrece solo si no hay `projectPath` y el usuario
 *    no lo descarto antes (`bootstrapDismissed !== true`).
 *  - Los formatos de exportacion persistidos se normalizan a los que tienen
 *    exportador real (`normalizeExportFormats`).
 */

import { normalizeExportFormats, type ExportFormat } from './lexiconExport';

/**
 * Subconjunto estructural de `SessionCache` que el modelo necesita. Se declara
 * aca para que el modelo sea puro (sin importar `@tauri-apps/api/core`) y los
 * tests puedan construir caches a mano.
 */
export interface SessionCacheLike {
  projectPath?: string | null;
  exportPath?: string | null;
  exportFormats?: string[];
  bootstrapDismissed?: boolean;
  showWelcomeOnStart?: boolean;
  tourCompleted?: boolean;
}

export interface SessionHydrationInput {
  cache: SessionCacheLike | null;
  hasLexicons: boolean;
  /**
   * Rutas `.loxar` descubiertas en el equipo. El modelo no las escanea (seria un
   * efecto con `@tauri-apps/plugin-fs`); solo las conserva en el plan para que
   * el hook decida cuando pedirlas y los tests puedan recorrer el flujo sin
   * tocar el sistema de archivos.
   */
  foundProjects?: string[];
}

export interface SessionHydrationPlan {
  showWelcome: boolean;
  sessionCacheData: SessionCacheLike | null;
  projectPath: string | null;
  exportPath: string | null;
  exportFormats: ExportFormat[];
  bootstrapDismissed: boolean;
  hasLocalData: boolean;
  showProjectBootstrap: boolean;
  /** Proyectos `.loxar` ofrecidos en el modal de bootstrap. */
  availableProjects: string[];
}

/** `true` si la bienvenida debe mostrarse (default: true salvo opt-out explicito). */
export function shouldShowWelcomeOnStart(cache: SessionCacheLike | null): boolean {
  return cache?.showWelcomeOnStart !== false;
}

/**
 * `true` si debe ofrecerse la ubicacion del proyecto: sin `projectPath` y sin un
 * descarte previo registrado en el cache.
 */
export function shouldOfferProjectBootstrap(cache: SessionCacheLike | null): boolean {
  return !cache?.projectPath && cache?.bootstrapDismissed !== true;
}

/** Resuelve el plan completo de hidratacion a partir del cache y los lexicos locales. */
export function buildSessionHydrationPlan(input: SessionHydrationInput): SessionHydrationPlan {
  const { cache, hasLexicons, foundProjects } = input;
  return {
    showWelcome: shouldShowWelcomeOnStart(cache),
    sessionCacheData: cache,
    projectPath: cache?.projectPath ?? null,
    exportPath: cache?.exportPath ?? null,
    exportFormats: normalizeExportFormats(cache?.exportFormats),
    bootstrapDismissed: cache?.bootstrapDismissed === true,
    hasLocalData: hasLexicons,
    showProjectBootstrap: shouldOfferProjectBootstrap(cache),
    availableProjects: foundProjects ?? [],
  };
}

/** Plan por defecto: bienvenida visible, sin proyecto, formatos por defecto. */
export const DEFAULT_SESSION_HYDRATION: SessionHydrationPlan = buildSessionHydrationPlan({
  cache: null,
  hasLexicons: false,
});
