/**
 * DashboardTab.tsx
 * ────────────────
 * Pantalla principal (tab `dashboard`): monta `LanguageHomeCanvas` con los
 * datos vivos del proyecto y centraliza la navegación módulo → tab.
 *
 * Extraído de `App.tsx` (P1) para seguir reduciendo el God Component. La
 * lógica de enrutado es idéntica a la que existía inline: los identificadores
 * de sub-módulo de gramática abren el tab `grammar` con el módulo activo, y
 * el resto de nodos navegan al tab que corresponda.
 */

import React from 'react';
import type { LexiconEntry } from '../types';
import type { AppTabId } from '../utils/appTabs';
import type { GrammarModule } from '../utils/grammarTabModel';
import { resolveDashboardNavigation } from '../utils/dashboardNavigation';
import LanguageHomeCanvas from './LanguageHomeCanvas';

type CanvasStats = NonNullable<React.ComponentProps<typeof LanguageHomeCanvas>['stats']>;
type PragmaticSummary = NonNullable<
  React.ComponentProps<typeof LanguageHomeCanvas>['pragmaticEngine']
>;

export interface DashboardTabProps {
  conlangName?: string | null;
  conlangNames: string[];
  onSelectConlang: (name: string) => void;
  lexicon: LexiconEntry[];
  grammar?: React.ComponentProps<typeof LanguageHomeCanvas>['grammar'];
  stats: CanvasStats;
  pragmaticEngine?: PragmaticSummary;
  /** Navega a un tab de primer nivel. */
  onOpenTab: (tab: AppTabId) => void;
  /** Abre el tab de gramática en un sub-módulo concreto (validado por `resolveDashboardNavigation`). */
  onOpenGrammarModule: (moduleId: GrammarModule) => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  conlangName,
  conlangNames,
  onSelectConlang,
  lexicon,
  grammar,
  stats,
  pragmaticEngine,
  onOpenTab,
  onOpenGrammarModule,
}) => {
  const handleModuleClick = (moduleId: string) => {
    const target = resolveDashboardNavigation(moduleId);
    if (!target) return;
    if (target.kind === 'grammar') {
      onOpenGrammarModule(target.module);
    } else {
      onOpenTab(target.tab);
    }
  };

  const handleZoomToNode = (moduleId: string) => {
    // Zoom desde un nodo del grafo → abrir el panel correspondiente.
    const target = resolveDashboardNavigation(moduleId);
    if (!target) return;
    if (target.kind === 'grammar') {
      onOpenGrammarModule(target.module);
    } else {
      onOpenTab(target.tab);
    }
  };

  return (
    <div className="h-full w-full">
      <LanguageHomeCanvas
        conlangName={conlangName}
        activeModule="dashboard"
        conlangNames={conlangNames}
        onSelectConlang={onSelectConlang}
        lexicon={lexicon}
        grammar={grammar}
        stats={stats}
        onModuleClick={handleModuleClick}
        pragmaticEngine={pragmaticEngine}
        onZoomToNode={handleZoomToNode}
      />
    </div>
  );
};

export default DashboardTab;
