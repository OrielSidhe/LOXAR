/**
 * tabNavigationModel — logica pura de la navegacion por tabs de `App.tsx`.
 *
 * `App.tsx` guardaba el tab activo como un historial (`AppTabId[]`) y resolvía
 * `activeTab` como el ultimo elemento, con `setActiveTab` (que apila sin duplicar
 * el tab actual), `goBack` (desapila) y `goHome` (vuelve a `['dashboard']`).
 * Esas tres operaciones eran flechas inline sobre `setTabHistory`; este modelo
 * las concentra en funciones puras para que el hook solo hidrate estado y los
 * tests puedan recorrer cada transicion sin montar React.
 *
 * Contratos preservados del `App.tsx` original:
 *  - el estado inicial es `['dashboard']` y `activeTab` nunca es `undefined`
 *    (fallback `DEFAULT_TAB` si el historial viene vacio);
 *  - `pushTab` NO apila el tab actual (devuelve el mismo array, sin re-render);
 *  - `popTab` no puede dejar el historial vacio (minimo un elemento);
 *  - `resetTabHistory` siempre devuelve un historial nuevo con solo `dashboard`.
 */

import type { AppTabId } from './appTabs';

export const DEFAULT_TAB: AppTabId = 'dashboard';

export type TabHistory = AppTabId[];

/**
 * Destino del salto rapido Workbench <-> Lexico (FASE NAV del gauntlet v3.14).
 * Ambos tabs permanecen montados en el arbol, asi que el salto no destruye el
 * borrador del editor ni los filtros de la tabla.
 */
export type QuickNavTarget = 'table' | 'workbench';

export const QUICK_NAV_TARGETS: readonly QuickNavTarget[] = ['table', 'workbench'];

/** Type guard de frontera para el destino del salto rapido. */
export function isQuickNavTarget(value: string): value is QuickNavTarget {
  return QUICK_NAV_TARGETS.some(target => target === value);
}

/** Tab activo: el ultimo del historial, con fallback a `dashboard`. */
export function resolveActiveTab(history: readonly AppTabId[]): AppTabId {
  return history[history.length - 1] ?? DEFAULT_TAB;
}

/** Apila `next` salvo que ya sea el tab activo (evita re-render redundante). */
export function pushTab(history: TabHistory, next: AppTabId): TabHistory {
  if (resolveActiveTab(history) === next) return history;
  return [...history, next];
}

/** Desapila el ultimo tab; nunca deja el historial vacio. */
export function popTab(history: TabHistory): TabHistory {
  if (history.length <= 1) return history;
  return history.slice(0, -1);
}

/** Vuelve al estado inicial de navegacion. */
export function resetTabHistory(): TabHistory {
  return [DEFAULT_TAB];
}

/** `true` si el historial es exactamente el estado inicial. */
export function isAtHome(history: readonly AppTabId[]): boolean {
  return history.length === 1 && history[0] === DEFAULT_TAB;
}
