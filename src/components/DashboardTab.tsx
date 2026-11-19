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
import LanguageHomeCanvas from './LanguageHomeCanvas';

/** Tabs de primer nivel de la app (mismo conjunto que `tabHistory` en `App.tsx`). */
export type AppTabId =
  | 'dashboard'
  | 'table'
  | 'workbench'
  | 'collections'
  | 'writing'
  | 'grammar'
  | 'translator'
  | 'tools';

/** Sub-módulos del módulo de gramática: cada uno es una sección dentro de `GrammarTab`. */
const GRAMMAR_SUB_MODULES: readonly string[] = [
  'overview',
  'phonology',
  'typology',
  'morphology',
  'syntax',
  'semantics',
  'roles',
  'strategies',
  'pragmatic',
  'notes',
];

const isGrammarSubModule = (moduleId: string): boolean =>
  GRAMMAR_SUB_MODULES.includes(moduleId);

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
  /** Abre el tab de gramática en un sub-módulo concreto. */
  onOpenGrammarModule: (moduleId: string) => void;
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
    if (isGrammarSubModule(moduleId)) {
      onOpenGrammarModule(moduleId);
    } else if (moduleId === 'lexicon') {
      onOpenTab('table');
    } else if (moduleId === 'workbench') {
      onOpenTab('workbench');
    } else if (moduleId === 'collections') {
      onOpenTab('collections');
    } else if (moduleId === 'neography') {
      onOpenTab('writing');
    } else if (moduleId === 'translator') {
      onOpenTab('translator');
    } else {
      // El canvas puede emitir ids de módulo no contemplados; se conserva el
      // comportamiento original de navegar al tab con ese identificador.
      onOpenTab(moduleId as AppTabId);
    }
  };

  const handleZoomToNode = (moduleId: string) => {
    // Zoom desde un nodo del grafo → abrir el panel correspondiente
    if (isGrammarSubModule(moduleId)) {
      onOpenGrammarModule(moduleId);
    } else if (moduleId === 'lexicon') {
      onOpenTab('table');
    } else if (moduleId === 'phonology') {
      onOpenGrammarModule('phonology');
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
