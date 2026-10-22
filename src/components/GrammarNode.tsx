/**
 * GrammarNode.tsx
 * ═══════════════
 * Nodo visual "Grammar Engine" para el GraphCanvas.
 *
 * Diseño Cyber/Neon tipo tarjeta:
 *   - Encabezado: "GRAMMAR ENGINE" + indicador de estado
 *   - Sección central: "RULE SUB-ENGINES"
 *   - Sub-tarjetas: [E] Alignment (case) y [X] Syntactic Strategy (head direction)
 *   - Footer: "Status: X Rules Compiled" + botón Zoom
 *
 * Se renderiza dentro del sistema de nodos custom de GraphCanvas.
 */

import React from 'react';

export interface GrammarNodeProps {
  /** Etiqueta tipológica del conlang (ej: 'flexive', 'agglutinative', 'isolating') */
  typologyLabel?: string;
  /** Número de reglas compiladas */
  rulesCount?: number;
  /** Estado del motor */
  status?: 'active' | 'inactive' | 'compiling';
  /** Alignment type from typology (e.g. 'ergative', 'nominative', 'accusative') */
  alignment?: string;
  /** Word order from typology (e.g. 'SOV', 'SVO', 'VSO') */
  wordOrder?: string;
  /**
   * Estrategia sintáctica real del conlang: la directionality de cabeza derivada
   * de la tipología (e.g. 'head_initial', 'head_final'). Data-driven: la etiqueta
   * de la sub-tarjeta X sale de este valor con un fallback razonable ('X-Bar').
   */
  headDirection?: string;
  /** Callback para zoom — abre el GrammarPragmaticPanel */
  onZoom?: () => void;
  /** Callback para swap engine */
  onSwap?: () => void;
  /** Indica si está conectado al root */
  connected?: boolean;
}

const GrammarNode: React.FC<GrammarNodeProps> = ({
  typologyLabel,
  rulesCount = 0,
  status = 'inactive',
  alignment,
  wordOrder,
  headDirection,
  onZoom,
  onSwap,
  connected = false,
}) => {
  const statusColor =
    status === 'active' ? 'bg-emerald-400' : status === 'compiling' ? 'bg-amber-400' : 'bg-white/30';
  const statusLabel = status === 'active' ? 'Active AST' : status === 'compiling' ? 'Compiling...' : 'Idle';

  // H1: la etiqueta de la sub-tarjeta X es data-driven — sale de la directionality
  // de cabeza real del conlang. Fallback razonable 'X-Bar' cuando no hay datos.
  const syntaxLabel = headDirection
    ? headDirection.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'X-Bar';

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-3 py-2 border-b border-cyan-400/30 flex items-center justify-between bg-white/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_6px_currentColor]`} />
          <span className="text-[10px] font-mono font-black tracking-widest text-white uppercase">
            Grammar Engine
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 uppercase">
          {statusLabel}
        </span>
      </div>

      {/* ── Central: Rule Sub-Engines ── */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Rule Sub-Engines:</span>
          {connected && (
            <span className="text-[8px] font-mono text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
              LINKED
            </span>
          )}
        </div>

        {/* Sub-tarjetas E y X */}
        <div className="grid grid-cols-2 gap-2">
          {/* E - Alignment / case */}
          <div className="bg-white/5 border border-cyan-400/40 hover:border-cyan-400 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] group">
            <span className="text-2xl font-black font-mono text-cyan-400 group-hover:scale-110 transition-transform">E</span>
            <span className="text-[9px] font-mono text-white/60 font-semibold uppercase mt-0.1">
              {(alignment ? alignment.charAt(0).toUpperCase() + alignment.slice(1) : 'Ergative')} Case
            </span>
            <span className="text-[8px] font-mono text-cyan-300/60">{typologyLabel ? typologyLabel.charAt(0).toUpperCase() + typologyLabel.slice(1) : '—'}</span>
          </div>

          {/* X - Syntactic Strategy (data-driven from head directionality) */}
          <div className="bg-white/5 border border-cyan-400/40 hover:border-cyan-400 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] group">
            <span className="text-2xl font-black font-mono text-cyan-400 group-hover:scale-110 transition-transform">X</span>
            <span className="text-[9px] font-mono text-white/60 font-semibold uppercase mt-0.1">{syntaxLabel} Syntax</span>
            <span className="text-[8px] font-mono text-white/30">{wordOrder ? `${wordOrder} Specifier` : 'SOV Specifier'}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-3 py-2 border-t border-white/10 flex items-center justify-between bg-white/5 rounded-b-lg">
        <span className="text-[9px] font-mono text-white/40">
          Status: <span className="text-cyan-300 font-semibold">{rulesCount} Rules Compiled</span>
        </span>
        <div className="flex items-center gap-1.5">
          {onSwap && (
            <button
              onClick={(e) => { e.stopPropagation(); onSwap(); }}
              className="text-[8px] font-mono bg-white/5 hover:bg-cyan-400/20 text-white/50 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 px-1.5 py-0.5 rounded transition-all uppercase tracking-wider"
              title="Swap engine"
            >
              ⇄
            </button>
          )}
          {onZoom && (
            <button
              onClick={(e) => { e.stopPropagation(); onZoom(); }}
              className="text-[8px] font-mono bg-cyan-400/15 hover:bg-cyan-400/30 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded transition-all uppercase tracking-wider font-semibold"
              title="Zoom into grammar"
            >
              Zoom
            </button>
          )}
        </div>
      </div>

      {/* ── Connection Handles (visual indicators) ── */}
      {/* Left: Target (input from root) */}
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-surface-dark border-2 border-cyan-400/60 shadow-[0_0_8px_rgba(0,240,255,0.4)] cursor-pointer hover:scale-125 transition-transform"
        title="Input (from root)"
      />
      {/* Right: Source (output to other nodes) */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-surface-dark border-2 border-violet-400/60 shadow-[0_0_8px_rgba(140,82,255,0.4)] cursor-pointer hover:scale-125 transition-transform"
        title="Output (to other nodes)"
      />
    </div>
  );
};

GrammarNode.displayName = 'GrammarNode';

export default GrammarNode;
