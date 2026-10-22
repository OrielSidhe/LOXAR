/**
 * LanguageHomeCanvas.tsx
 * ────────────────
 * Wrapper que monta el GraphCanvas como pantalla principal del dashboard.
 * Conecta los datos reales de conlangs y léxico con el canvas.
 */

import React, { useCallback } from 'react';
import type { GrammarManifest, LexiconEntry } from '../types';
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
  lexicon?: LexiconEntry[];
  /** G1: Grammar manifest for manifest-driven syntax blocks */
  grammar?: GrammarManifest;
  /** Callback al hacer Zoom en un nodo del grafo — abre el panel correspondiente */
  onZoomToNode?: (moduleId: string) => void;
  /** B2: Live pragmatic engine state derived from activeGrammar */
  pragmaticEngine?: {
    typologyLabel?: string;
    rulesCount?: number;
    alignment?: string;
    wordOrder?: string;
    activeClauseType?: string | null;
  };
};

const LanguageHomeCanvas: React.FC<LanguageHomeCanvasProps> = ({
  conlangName,
  activeModule,
  stats,
  onModuleClick,
  conlangNames = [],
  onSelectConlang,
  lexicon = [],
  grammar,
  onZoomToNode,
  pragmaticEngine,
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

  // ── Minimal mode: conlang nuevo sin datos → solo nodo raíz ──
  const totalLexicon = stats?.lexicon?.entries ?? 0;
  const totalGrammar = (stats?.grammar?.rules ?? 0) + (stats?.grammar?.categories ?? 0) + (stats?.grammar?.strategies ?? 0) + (stats?.grammar?.roles ?? 0);
  const totalPhonology = (stats?.phonology?.sounds ?? 0) + (stats?.phonology?.rules ?? 0);
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
      grammar={grammar}
      pragmaticEngine={pragmaticEngine}
      onZoomToGrammar={() => onZoomToNode?.('pragmatic')}
    />
  );
};

export default LanguageHomeCanvas;
