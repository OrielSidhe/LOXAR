/**
 * appTabs — tipo único de los tabs de primer nivel de la app.
 *
 * La unión de literales estaba duplicada en `App.tsx` (`tabHistory`,
 * `setActiveTab`) y en `DashboardTab.tsx` (`AppTabId`), y `useAppHandlers.ts`
 * repetía la misma unión en dos props. Centralizarla permite validar en la
 * frontera (barra lateral, canvas) con un type guard en lugar de `as any`.
 */

export type AppTabId =
  | 'dashboard'
  | 'table'
  | 'workbench'
  | 'collections'
  | 'writing'
  | 'grammar'
  | 'translator'
  | 'tools';

export const APP_TAB_IDS: readonly AppTabId[] = [
  'dashboard',
  'table',
  'workbench',
  'collections',
  'writing',
  'grammar',
  'translator',
  'tools',
];

/** Type guard de frontera: acepta el `string` que emiten el canvas y la barra lateral. */
export function isAppTabId(value: string): value is AppTabId {
  return APP_TAB_IDS.some(tab => tab === value);
}
