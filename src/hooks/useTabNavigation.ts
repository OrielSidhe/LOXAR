/**
 * useTabNavigation — navegacion por tabs de `App.tsx` (P1 God Component).
 *
 * Sustituye al estado `tabHistory`, al `activeTab` derivado y a las flechas
 * inline de navegacion del `App.tsx` (`setActiveTab`, `goBack`, `goHome`,
 * `handleOpenGrammarModule`, `handleQuickNav`), mas las flechas
 * `() => setActiveTab('writing'|'grammar'|'translator'|'dashboard')` que
 * estaban repetidas en los modales y en `ToolsTab`.
 *
 * Contratos preservados:
 *  - `setActiveTab` mantiene la firma `Dispatch<SetStateAction<AppTabId>>` que
 *    reciben `useProjectOperations`, `useAppHandlers`, `useAiHandlers` y
 *    `useWorkQueue` (acepta tab o funcion sobre el tab previo);
 *  - el tab activo es el ultimo del historial y nunca se duplica;
 *  - `goBack` no puede dejar el historial vacio y `goHome` lo reinicia;
 *  - `handleOpenGrammarModule` abre el tab de gramatica y fija el sub-modulo
 *    (mismo orden que antes: tab primero, modulo despues).
 */

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { AppTabId } from '../utils/appTabs';
import { DEFAULT_GRAMMAR_MODULE, type GrammarModule } from '../utils/grammarTabModel';
import {
  DEFAULT_TAB,
  popTab,
  pushTab,
  resetTabHistory,
  resolveActiveTab,
  type QuickNavTarget,
} from '../utils/tabNavigationModel';

/** Firma del setter que consumen los hooks de `App.tsx`. */
export type SetActiveTab = Dispatch<SetStateAction<AppTabId>>;

export interface UseTabNavigationResult {
  tabHistory: AppTabId[];
  activeTab: AppTabId;
  setActiveTab: SetActiveTab;
  goBack: () => void;
  goHome: () => void;
  activeGrammarModule: GrammarModule;
  setActiveGrammarModule: Dispatch<SetStateAction<GrammarModule>>;
  handleOpenGrammarModule: (moduleId: GrammarModule) => void;
  handleQuickNav: (target: QuickNavTarget) => void;
  /** Atajos de tab usados por los modales y por `ToolsTab`. */
  openDashboard: () => void;
  openWriting: () => void;
  openGrammar: () => void;
  openTranslator: () => void;
}

export function useTabNavigation(): UseTabNavigationResult {
  const [tabHistory, setTabHistory] = useState<AppTabId[]>(resetTabHistory);
  const [activeGrammarModule, setActiveGrammarModule] = useState<GrammarModule>(
    DEFAULT_GRAMMAR_MODULE,
  );

  const activeTab = resolveActiveTab(tabHistory);

  const setActiveTab = useCallback<SetActiveTab>((tab) => {
    setTabHistory((prev) =>
      pushTab(prev, typeof tab === 'function' ? tab(resolveActiveTab(prev)) : tab),
    );
  }, []);

  const goBack = useCallback(() => {
    setTabHistory((prev) => popTab(prev));
  }, []);

  const goHome = useCallback(() => {
    setTabHistory(resetTabHistory());
  }, []);

  const openDashboard = useCallback(() => {
    setActiveTab(DEFAULT_TAB);
  }, [setActiveTab]);

  const openWriting = useCallback(() => {
    setActiveTab('writing');
  }, [setActiveTab]);

  const openGrammar = useCallback(() => {
    setActiveTab('grammar');
  }, [setActiveTab]);

  const openTranslator = useCallback(() => {
    setActiveTab('translator');
  }, [setActiveTab]);

  /** Abre el tab de gramatica en un sub-modulo concreto (consume `DashboardTab`). */
  const handleOpenGrammarModule = useCallback(
    (moduleId: GrammarModule) => {
      setActiveTab('grammar');
      setActiveGrammarModule(moduleId);
    },
    [setActiveTab],
  );

  /** Salto rapido Workbench <-> Léxico (FASE NAV del gauntlet v3.14). */
  const handleQuickNav = useCallback(
    (target: QuickNavTarget) => {
      setActiveTab(target);
    },
    [setActiveTab],
  );

  return useMemo(
    () => ({
      tabHistory,
      activeTab,
      setActiveTab,
      goBack,
      goHome,
      activeGrammarModule,
      setActiveGrammarModule,
      handleOpenGrammarModule,
      handleQuickNav,
      openDashboard,
      openWriting,
      openGrammar,
      openTranslator,
    }),
    [
      tabHistory,
      activeTab,
      setActiveTab,
      goBack,
      goHome,
      activeGrammarModule,
      handleOpenGrammarModule,
      handleQuickNav,
      openDashboard,
      openWriting,
      openGrammar,
      openTranslator,
    ],
  );
}
