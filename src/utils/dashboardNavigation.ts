/**
 * dashboardNavigation — resuelve a dónde navega un nodo del canvas del dashboard.
 *
 * `LanguageHomeCanvas`/`GraphCanvas` emiten `moduleId: string` (ids de nodo), no
 * tabs. Antes `DashboardTab` castiaba (`moduleId as AppTabId`) y los nodos del
 * nivel léxico (`wordtypes`, `roots`, `entries`, `import`) colaban un tab
 * inexistente al historial: la app quedaba en blanco. Ahora el mapeo es
 * explícito y los ids desconocidos se ignoran.
 */

import type { AppTabId } from './appTabs';
import { isAppTabId } from './appTabs';
import type { GrammarModule } from './grammarTabModel';
import { isGrammarModule } from './grammarTabModel';

export type DashboardNavigationTarget =
  | { kind: 'tab'; tab: AppTabId }
  | { kind: 'grammar'; module: GrammarModule };

/** Ids de nodo del canvas que abren un tab de primer nivel. */
const TAB_BY_MODULE_ID: Readonly<Record<string, AppTabId>> = {
  lexicon: 'table',
  wordtypes: 'table',
  roots: 'table',
  entries: 'table',
  import: 'table',
  workbench: 'workbench',
  collections: 'collections',
  neography: 'writing',
  translator: 'translator',
};

/**
 * Devuelve el destino de navegación de un id de nodo, o `null` si no es un
 * destino conocido (antes: `onOpenTab(id as AppTabId)` con un tab inválido).
 */
export function resolveDashboardNavigation(moduleId: string): DashboardNavigationTarget | null {
  if (isGrammarModule(moduleId)) {
    return { kind: 'grammar', module: moduleId };
  }
  const mappedTab = TAB_BY_MODULE_ID[moduleId];
  if (mappedTab) {
    return { kind: 'tab', tab: mappedTab };
  }
  if (isAppTabId(moduleId)) {
    return { kind: 'tab', tab: moduleId };
  }
  return null;
}
