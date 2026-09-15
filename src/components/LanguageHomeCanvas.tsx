/**
 * LanguageHomeCanvas.tsx
 * ────────────────
 * Wrapper que monta el GraphCanvas como pantalla principal del dashboard.
 * Conecta los datos reales de conlangs y léxico con el canvas.
 */

import React, { useCallback } from 'react';
import GraphCanvas from './GraphCanvas';

type LanguageHomeCanvasProps = {
  conlangName?: string | null;
  activeModule?: string;
  stats?: {
    grammar?: { rules?: number; categories?: number; strategies?: number; roles?: number };
    phonology?: { sounds?: number; rules?: number };
    syntax?: { rules?: number; trees?: number };
    lexicon?: { entries?: number; categories?: number };
    neography?: { glyphs?: number; rules?: number };
    semantics?: { fields?: number; relations?: number };
    translator?: { translations?: number };
    workbench?: { pending?: number; completed?: number };
    collections?: { collections?: number };
  };
  onModuleClick?: (moduleId: string) => void;
  conlangNames?: string[];
  onSelectConlang?: (name: string) => void;
  lexicon?: Array<{ ID: string; Raíz: string; Léxema: string[]; Categoría: string; Significado: string[] }>;
};

const LanguageHomeCanvas: React.FC<LanguageHomeCanvasProps> = ({
  conlangName,
  activeModule,
  stats,
  onModuleClick,
  conlangNames = [],
  onSelectConlang,
  lexicon = [],
}) => {
  const handleNavigate = useCallback((tab: string) => {
    const tabMap: Record<string, string> = {
      lexicon: 'table',
      workbench: 'workbench',
      collections: 'collections',
      neography: 'writing',
      translator: 'translator',
    };
    onModuleClick?.(tabMap[tab] ?? tab);
  }, [onModuleClick]);

  return (
    <GraphCanvas
      conlangName={conlangName}
      activeModule={activeModule}
      stats={stats}
      onModuleClick={onModuleClick}
      onNavigate={handleNavigate}
      conlangNames={conlangNames}
      onSelectConlang={onSelectConlang}
      lexicon={lexicon}
    />
  );
};

export default LanguageHomeCanvas;
