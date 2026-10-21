/**
 * GraphCanvas.tsx
 * ────────────────
 * Infinite canvas powered by React Flow for LOXAR.
 *
 * Niveles:
 *   root     → Conlang central + módulos (vista principal)
 *   grammar  → Sub-módulos de gramática (grafo de nodos)
 *   lexicon  → Componentes del léxico (tipos, raíces, entradas)
 *   syntax   → Arnés AST con slots + preview (overlay sobre React Flow)
 *
 * Tareas de React Flow:
 *   1. Interactividad: useNodesState / useEdgesState + onNodesChange /
 *     onEdgesChange / onConnect
 *   2. onConnect usa addEdge(params, eds) para crear conexiones por drag
 *   3. Estado inicial minimalista: initialEdges=[], initialNodes=[rootNode]
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes,
  NodeProps,
  Position,
  Handle,
  Background,
  BackgroundVariant,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import SyntaxFlowline from './SyntaxFlowline';
import ModulePalette, { type ModuleNodeType } from './ModulePalette';
import GrammarNode from './GrammarNode';

// ── Types ──────────────────────────────────────────────
type LevelId = 'root' | 'grammar' | 'lexicon' | 'syntax';

type NodePort = { id: string; label: string; side: 'left' | 'right'; color?: string };

/** Default ports for dynamically created nodes (dragged from palette).
 *  A1 fix: must include BOTH 'in' (left) and 'out' (right) so that
 *  ModuleNodeComponent renders both Handle source + Handle target. */
export const DYNAMIC_NODE_PORTS: NodePort[] = [
  { id: 'in', label: 'In', side: 'left', color: 'cyan' },
  { id: 'out', label: 'Out', side: 'right', color: 'cyan' },
];

type GraphNode = {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  level: LevelId;
  ports: NodePort[];
  status: 'complete' | 'partial' | 'empty';
  description?: string;
  stats?: { label: string; value: string | number }[];
  color?: string;
};

type GraphEdge = {
  from: { node: string; port: string };
  to: { node: string; port: string };
  label?: string;
  color?: string;
};

type GraphCanvasProps = {
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
  onNavigate?: (tab: string) => void;
  conlangNames?: string[];
  onSelectConlang?: (name: string) => void;
  lexicon?: Array<{ ID: string; Raíz: string; Léxema: string[]; Categoría: string; Significado: string[] }>;
  /** Si true, muestra solo el nodo raíz (lienzo en blanco para crecimiento orgánico) */
  // minimalMode removed (A3) — React Flow always renders root + dynamic nodes
  /** Estado del motor pragmático (para mostrar datos reales en GrammarNode) */
  pragmaticEngine?: {
    typologyLabel?: string;
    rulesCount?: number;
    alignment?: string;
    wordOrder?: string;
    activeClauseType?: string | null;
  };
  /** Callback al hacer clic en "Zoom" del nodo Gramática — abre el panel pragmático */
  onZoomToGrammar?: () => void;
};

// ── Level Data ─────────────────────────────────────────
const ROOT_NODES: GraphNode[] = [
  { id: 'grammar', label: 'Gramática', icon: '📐', x: 500, y: 60, w: 260, h: 130, level: 'root', status: 'partial', description: 'Motor gramatical', ports: [{ id: 'in', label: 'Root', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syntax', side: 'right', color: 'cyan' }], stats: [{ label: 'Reglas', value: 0 }] },
  { id: 'phonology', label: 'Fonología', icon: '🔊', x: 160, y: 240, w: 240, h: 120, level: 'root', status: 'empty', description: 'Inventario fonético', ports: [{ id: 'out', label: 'Phon Out', side: 'right', color: 'cyan' }] },
  { id: 'syntax', label: 'Sintaxis', icon: '🧩', x: 840, y: 240, w: 240, h: 120, level: 'root', status: 'empty', description: 'Estructura oracional', ports: [{ id: 'in', label: 'Gram In', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syntax', side: 'right', color: 'cyan' }] },
  { id: 'lexicon', label: 'Léxico', icon: '📚', x: 160, y: 440, w: 240, h: 120, level: 'root', status: 'empty', description: 'Diccionario', ports: [{ id: 'in', label: 'Morph', side: 'left', color: 'purple' }, { id: 'out', label: 'Lex Out', side: 'right', color: 'purple' }] },
  { id: 'workbench', label: 'Workbench', icon: '🔨', x: 500, y: 440, w: 240, h: 120, level: 'root', status: 'empty', description: 'Cola de trabajo', ports: [{ id: 'in', label: 'Lex', side: 'left', color: 'purple' }, { id: 'out', label: 'Work', side: 'right', color: 'purple' }] },
  { id: 'neography', label: 'Neografía', icon: '✍️', x: 840, y: 440, w: 240, h: 120, level: 'root', status: 'empty', description: 'Sistema de escritura', ports: [{ id: 'in', label: 'Surface', side: 'left', color: 'cyan' }] },
  { id: 'semantics', label: 'Semántica', icon: '💡', x: 330, y: 640, w: 240, h: 120, level: 'root', status: 'empty', description: 'Campos semánticos', ports: [{ id: 'in', label: 'Syntax', side: 'left', color: 'cyan' }] },
  { id: 'translator', label: 'Traductor', icon: '🔁', x: 670, y: 640, w: 240, h: 120, level: 'root', status: 'empty', description: 'Traducción', ports: [{ id: 'in', label: 'Lex', side: 'left', color: 'purple' }] },
];

const ROOT_EDGES: GraphEdge[] = [
  { from: { node: 'phonology', port: 'out' }, to: { node: 'grammar', port: 'in' }, label: 'phonology', color: 'cyan' },
  { from: { node: 'grammar', port: 'out' }, to: { node: 'syntax', port: 'in' }, label: 'syntax', color: 'cyan' },
  { from: { node: 'lexicon', port: 'out' }, to: { node: 'workbench', port: 'in' }, label: 'lexical', color: 'purple' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'semantics', port: 'in' }, label: 'semantics', color: 'purple' },
  { from: { node: 'workbench', port: 'out' }, to: { node: 'neography', port: 'in' }, label: 'surface', color: 'cyan' },
];

const GRAMMAR_NODES: GraphNode[] = [
  { id: 'phonology', label: 'Fonología', icon: '🔊', x: 120, y: 100, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Inventario, fonotáctica', ports: [{ id: 'out', label: 'Phon Out', side: 'right', color: 'cyan' }] },
  { id: 'typology', label: 'Tipología', icon: '🧬', x: 400, y: 100, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Tipo morfológico', ports: [{ id: 'in', label: 'Phon', side: 'left', color: 'cyan' }, { id: 'out', label: 'Typ Out', side: 'right', color: 'cyan' }] },
  { id: 'morphology', label: 'Morfología', icon: '🔧', x: 120, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Afijos, reglas', ports: [{ id: 'in', label: 'Typ', side: 'left', color: 'cyan' }, { id: 'out', label: 'Morph', side: 'right', color: 'cyan' }] },
  { id: 'syntax', label: 'Sintaxis', icon: '🧩', x: 400, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Estructura oracional', ports: [{ id: 'in', label: 'Morph', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syn', side: 'right', color: 'cyan' }] },
  { id: 'semantics', label: 'Semántica', icon: '💡', x: 680, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Campos semánticos', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'purple' }] },
  { id: 'roles', label: 'Roles', icon: '🎭', x: 120, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Roles sintácticos', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'cyan' }, { id: 'out', label: 'Roles', side: 'right', color: 'cyan' }] },
  { id: 'strategies', label: 'Estrategias', icon: '⚙️', x: 400, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Estrategias morfosintácticas', ports: [{ id: 'in', label: 'Roles', side: 'left', color: 'cyan' }, { id: 'out', label: 'Strat', side: 'right', color: 'cyan' }] },
  { id: 'pragmatic', label: 'Pragmática', icon: '🧭', x: 680, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Intención de oración', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'purple' }] },
  { id: 'notes', label: 'Notas', icon: '📝', x: 400, y: 640, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Anotaciones', ports: [{ id: 'in', label: 'Strat', side: 'left', color: 'cyan' }] },
];

const GRAMMAR_EDGES: GraphEdge[] = [
  { from: { node: 'phonology', port: 'out' }, to: { node: 'typology', port: 'in' }, color: 'cyan' },
  { from: { node: 'typology', port: 'out' }, to: { node: 'morphology', port: 'in' }, color: 'cyan' },
  { from: { node: 'morphology', port: 'out' }, to: { node: 'syntax', port: 'in' }, color: 'cyan' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'semantics', port: 'in' }, color: 'purple' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'roles', port: 'in' }, color: 'cyan' },
  { from: { node: 'roles', port: 'out' }, to: { node: 'strategies', port: 'in' }, color: 'cyan' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'pragmatic', port: 'in' }, color: 'purple' },
  { from: { node: 'strategies', port: 'out' }, to: { node: 'notes', port: 'in' }, color: 'cyan' },
];

const LEXICON_NODES: GraphNode[] = [
  { id: 'wordtypes', label: 'Tipos de palabra', icon: '🏷️', x: 120, y: 100, w: 240, h: 120, level: 'lexicon', status: 'partial', description: 'Sustantivo, verbo, adjetivo...', ports: [{ id: 'out', label: 'Types', side: 'right', color: 'cyan' }], stats: [{ label: 'Tipos', value: 10 }] },
  { id: 'roots', label: 'Raíces', icon: '🌱', x: 420, y: 100, w: 240, h: 120, level: 'lexicon', status: 'empty', description: 'Raíces léxicas', ports: [{ id: 'in', label: 'Types', side: 'left', color: 'cyan' }, { id: 'out', label: 'Roots', side: 'right', color: 'cyan' }] },
  { id: 'entries', label: 'Entradas', icon: '📖', x: 720, y: 100, w: 240, h: 120, level: 'lexicon', status: 'empty', description: 'Entradas del diccionario', ports: [{ id: 'in', label: 'Roots', side: 'left', color: 'cyan' }], stats: [{ label: 'Entradas', value: 0 }] },
  { id: 'import', label: 'Importar/Exportar', icon: '📦', x: 420, y: 300, w: 240, h: 120, level: 'lexicon', status: 'empty', description: 'Importar y exportar datos', ports: [{ id: 'in', label: 'Data', side: 'left', color: 'purple' }] },
];

const LEXICON_EDGES: GraphEdge[] = [
  { from: { node: 'wordtypes', port: 'out' }, to: { node: 'roots', port: 'in' }, color: 'cyan' },
  { from: { node: 'roots', port: 'out' }, to: { node: 'entries', port: 'in' }, color: 'cyan' },
  { from: { node: 'entries', port: 'in' }, to: { node: 'import', port: 'in' }, label: 'data', color: 'purple' },
];

// ── Root node ID ───────────────────────────────────────
const ROOT_NODE_ID = 'conlang-root';

// ── Helpers ────────────────────────────────────────────
const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  complete: { border: 'border-emerald-400/60', bg: 'bg-emerald-500/10', text: 'text-emerald-300', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]' },
  partial: { border: 'border-amber-400/60', bg: 'bg-amber-500/10', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]' },
  empty: { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white/60', glow: 'shadow-none' },
};

const STATUS_DOT: Record<string, string> = {
  complete: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  partial: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  empty: 'bg-white/40',
};

// ── Module labels for palette-created nodes ────────────
const MODULE_LABELS: Record<ModuleNodeType, { label: string; icon: string; description: string }> = {
  grammar:    { label: 'Gramática',  icon: '📐', description: 'Motor gramatical' },
  syntax:     { label: 'Sintaxis',   icon: '🧩', description: 'Estructura oracional' },
  lexicon:    { label: 'Léxico',     icon: '📚', description: 'Diccionario' },
  phonology:  { label: 'Fonología',  icon: '🔊', description: 'Inventario fonético' },
  morphology: { label: 'Morfología', icon: '🔧', description: 'Afijos y reglas de formación' },
  semantics:  { label: 'Semántica',  icon: '💡', description: 'Campos semánticos' },
  neography:  { label: 'Neografía',  icon: '✍️', description: 'Sistema de escritura' },
  translator: { label: 'Traductor',  icon: '🔁', description: 'Traducción y corpus' },
};

// ── Node callback data interface ───────────────────────
interface NodeCallbacks {
  activeModule?: string;
  onModuleClick?: (id: string) => void;
  onNavigate?: (tab: string) => void;
  onZoom?: (nodeId: string) => void;
  level: LevelId;
  pragmaticEngine?: GraphCanvasProps['pragmaticEngine'];
  onZoomToGrammar?: () => void;
}

// ── React Flow conversion helpers ─────────────────────
const toRfNodes = (src: GraphNode[], callbacks: NodeCallbacks): Node[] =>
  src.map(n => ({
    id: n.id,
    type: n.id.startsWith('dyn_grammar_') ? 'grammarNode' : 'moduleNode',
    data: { node: n, ...callbacks },
    position: { x: n.x, y: n.y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    connectable: true,
  }));

/**
 * B3-B4: Override hardcoded node `stats` with real values from the stats prop.
 * Each node keeps its static layout (x, y, w, h, ports, etc.) but gets
 * live counts computed in App.tsx from grammarDb / lexiconDb.
 */
function withStats(nodes: GraphNode[], statMap: Record<string, { label: string; value: string | number }[]>): GraphNode[] {
  return nodes.map(n => {
    if (statMap[n.id]) {
      return { ...n, stats: statMap[n.id], status: statMap[n.id].some(s => Number(s.value) > 0) ? 'partial' : n.status };
    }
    return n;
  });
}

const toRfEdges = (src: GraphEdge[]): Edge[] =>
  src.map((e, i) => ({
    id: `e-${e.from.node}-${e.to.node}-${i}`,
    source: e.from.node,
    target: e.to.node,
    sourceHandle: e.from.port,
    targetHandle: e.to.port,
    label: e.label,
    animated: true,
    style: { stroke: e.color === 'purple' ? '#a855f7' : '#00f0ff' },
  }));

// ── Custom Node: Root (Conlang Selector) ──────────────
const RootNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as { conlangName?: string | null; conlangNames?: string[]; onSelectConlang?: (name: string) => void };
  return (
    <>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className={`
        rounded-xl border-2 border-accent/60 bg-accent/10 backdrop-blur-md
        px-4 py-4 shadow-[0_0_30px_rgba(13,185,242,0.2)] text-center
        transition-all duration-300
        ${selected ? 'border-accent shadow-[0_0_40px_rgba(13,185,242,0.4)] scale-105' : ''}
      `}>
        <div className="text-3xl mb-2">🌐</div>
        <div className="text-xs font-bold tracking-widest text-accent uppercase mb-2">
          {d.conlangName || 'Sin conlang'}
        </div>
        <div className="text-[10px] text-white/50 mb-3">Lengua central</div>
        {d.conlangNames && d.conlangNames.length > 1 && (
          <select
            value={d.conlangName ?? ''}
            onChange={(e) => { e.stopPropagation(); d.onSelectConlang?.(e.target.value); }}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            {d.conlangNames.map(name => (
              <option key={name} value={name} className="bg-background text-white">{name}</option>
            ))}
          </select>
        )}
        {d.conlangNames && d.conlangNames.length === 1 && (
          <div className="text-[10px] text-white/40">{d.conlangNames[0]}</div>
        )}
      </div>
    </>
  );
};

// ── Custom Node: Module (all non-grammar modules) ──────
const ModuleNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as ModuleCallbacks;
  const node: GraphNode = d.node;
  const colors = STATUS_COLORS[node.status];
  const isActive = d.activeModule === node.id || selected;
  const isHovered = false; // handled by React Flow hover
  const hasChildren = ['grammar', 'lexicon', 'syntax'].includes(node.id);

  const nodeClasses = `
    rounded-xl border backdrop-blur-xl transition-all duration-300
    pointer-events-auto cursor-pointer select-none
    ${colors.border} ${colors.bg}
    ${isActive ? `${colors.glow} scale-[1.03] z-20` : 'z-10'}
  `;

  return (
    <>
      {node.ports.some(p => p.side === 'left') && (
        <Handle type="target" position={Position.Left} />
      )}
      {node.ports.some(p => p.side === 'right') && (
        <Handle type="source" position={Position.Right} />
      )}
      <div className={nodeClasses} style={{ width: node.w, minHeight: node.h }}>
        {/* Header */}
        <div className="h-8 px-3 flex items-center justify-between border-b border-white/10 rounded-t-xl bg-white/5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{node.label}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">
            {safeShortId(node.id)}
          </span>
        </div>
        {/* Body */}
        <div className="p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{node.icon}</span>
            <span className="text-[10px] text-white/50">{node.description}</span>
          </div>
          {node.stats && (
            <div className="bg-black/20 rounded-lg p-1.5 space-y-0.5 border border-white/5">
              {node.stats.map((s, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-white/40">{s.label}:</span>
                  <span className="text-accent font-mono font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          )}
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); d.onZoom?.(node.id); }}
              className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent transition-colors w-full justify-center"
            >
              <span>🔍</span><span>Zoom</span>
            </button>
          )}
          {['lexicon', 'workbench', 'phonology', 'neography', 'semantics', 'translator'].includes(node.id) && d.level === 'root' && (
            <button
              onClick={(e) => { e.stopPropagation(); d.onNavigate?.(node.id === 'lexicon' ? 'table' : node.id); }}
              className="mt-1 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors w-full justify-center"
            >
              <span>→</span><span>Ir a pantalla</span>
            </button>
          )}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
            <div className="flex items-center gap-1">
              <span className={`relative flex h-1.5 w-1.5`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT[node.status]}`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${STATUS_DOT[node.status]}`} />
              </span>
              <span className="text-[8px] text-white/40 capitalize">
                {node.status === 'complete' ? 'Completo' : node.status === 'partial' ? 'Parcial' : 'Vacío'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {node.ports.filter(p => p.side === 'left').map(p => (
                <span key={p.id} className="w-1.5 h-1.5 rounded-full bg-accent border border-white/20 shadow-[0_0_4px_rgba(0,240,255,0.5)]" title={p.label} />
              ))}
              {node.ports.filter(p => p.side === 'right').map(p => (
                <span key={p.id} className="w-1.5 h-1.5 rounded-full bg-purple-400 border border-white/20 shadow-[0_0_4px_rgba(168,85,247,0.5)]" title={p.label} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Custom Node: Grammar Engine ────────────────────────
const GrammarEngineNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as { pragmaticEngine?: GraphCanvasProps['pragmaticEngine']; onZoom?: () => void; activeModule?: string };
  const isActive = d.activeModule === 'grammar' || selected;

  return (
    <div className={isActive
      ? "relative rounded-xl border border-cyan-400/50 bg-surface-dark/95 backdrop-blur-xl shadow-[0_0_25px_rgba(0,240,255,0.1)] transition-all duration-300 scale-[1.03]"
      : "relative"}>
      <Handle type="target" position={Position.Left} />
      <GrammarNode
        rulesCount={d.pragmaticEngine?.rulesCount ?? 0}
        typologyLabel={d.pragmaticEngine?.typologyLabel}
        alignment={d.pragmaticEngine?.alignment}
        wordOrder={d.pragmaticEngine?.wordOrder}
        status={d.pragmaticEngine?.activeClauseType ? 'active' : 'inactive'}
        onZoom={() => d.onZoom?.()}
        connected={false}
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

// ── Node types registration ────────────────────────────
const nodeTypes: NodeTypes = {
  rootNode: RootNodeComponent,
  moduleNode: ModuleNodeComponent,
  grammarNode: GrammarEngineNodeComponent,
};

// ── Utility ────────────────────────────────────────────
const safeShortId = (id: string): string => {
  const m = id.match(/^(\w{0,3})\w*/);
  return (m?.[1] ?? id.slice(0, 3)).toUpperCase();
};

// ── ModuleCallbacks alias for cleaner typing ───────────
type ModuleCallbacks = NodeCallbacks & { node: GraphNode };

// ── Main component ─────────────────────────────────────
const GraphCanvas: React.FC<GraphCanvasProps> = ({
  conlangName,
  activeModule,
  stats,
  onModuleClick,
  onNavigate,
  conlangNames = [],
  onSelectConlang,
  lexicon = [],
  // minimalMode removed (A3)
  pragmaticEngine,
  onZoomToGrammar,
}) => {
  const [level, setLevel] = useState<LevelId>('root');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggingPalette, setDraggingPalette] = useState<ModuleNodeType | null>(null);
  const [zoomValue, setZoomValue] = useState(100);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // ── Initial nodes & edges (Task 3: Minimal Clean Graph) ──
  // initialNodes contiene ÚNICAMENTE el nodo raíz del conlang.
  // initialEdges está completamente vacío.
  const initialNodes: Node[] = [
    {
      id: ROOT_NODE_ID,
      type: 'rootNode',
      data: { conlangName, conlangNames, onSelectConlang },
      position: { x: 400, y: 300 },
    },
  ];
  const initialEdges: Edge[] = [];

  // ── React Flow state (Task 1: Interactividad) ──
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ── onConnect (Task 2: addEdge) ──────────────────────────
  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  // ── Level navigation ──
  const navigateToLevel = useCallback((targetLevel: LevelId) => {
    setLevel(targetLevel);
  }, []);

  const zoomIntoNode = useCallback((nodeId: string) => {
    if (nodeId === 'grammar') setLevel('grammar');
    else if (nodeId === 'lexicon') setLevel('lexicon');
    else if (nodeId === 'syntax') setLevel('syntax');
  }, []);

  const handleNavigate = useCallback((tab: string) => {
    onNavigate?.(tab === 'lexicon' ? 'table' : tab);
  }, [onNavigate]);

  // ── B5: Ref to preserve palette-dropped nodes across level changes ──
  // When the user drags a module from the palette onto the root canvas and
  // then navigates to the grammar/lexicon level, those dynamic nodes must
  // survive the round-trip back to root.
  const rootDynNodesRef = useRef<Node[]>([]);

  // ── Node callbacks bundle ──
  const nodeCallbacks: NodeCallbacks = useMemo(() => ({
    activeModule,
    onModuleClick,
    onNavigate: handleNavigate,
    onZoom: zoomIntoNode,
    level,
    pragmaticEngine,
    onZoomToGrammar,
  }), [activeModule, onModuleClick, handleNavigate, zoomIntoNode, level, pragmaticEngine, onZoomToGrammar]);

  // ── B3-B4: Dynamic node arrays with live stats ──────────────────────
  // Each node keeps its static layout but gets real counts from the stats
  // prop (computed in App.tsx from grammarDb / lexiconDb). If stats is
  // unavailable, fall back to the static arrays.
  const rootNodesWithStats = useMemo(() => {
    if (!stats) return ROOT_NODES;
    return withStats(ROOT_NODES, {
      grammar: [
        { label: 'Reglas', value: (stats.grammar?.rules ?? 0)
          + (stats.grammar?.categories ?? 0)
          + (stats.grammar?.strategies ?? 0)
          + (stats.grammar?.roles ?? 0) },
      ],
      lexicon: [
        { label: 'Entradas', value: stats.lexicon?.entries ?? 0 },
      ],
      phonology: [
        { label: 'Sonidos', value: stats.phonology?.sounds ?? 0 },
      ],
    });
  }, [stats]);

  const grammarNodesWithStats = useMemo(() => {
    if (!stats) return GRAMMAR_NODES;
    return withStats(GRAMMAR_NODES, {
      typology:  [{ label: 'Morph', value: stats.grammar?.rules ?? 0 }],
      morphology:[{ label: 'Rules', value: stats.grammar?.rules ?? 0 }],
      syntax:    [{ label: 'Trees', value: stats.syntax?.trees ?? 0 }],
      roles:     [{ label: 'Roles', value: stats.grammar?.roles ?? 0 }],
      strategies:[{ label: 'Strats', value: stats.grammar?.strategies ?? 0 }],
    });
  }, [stats]);

  const lexiconNodesWithStats = useMemo(() => {
    if (!stats) return LEXICON_NODES;
    return withStats(LEXICON_NODES, {
      entries:   [{ label: 'Entradas', value: stats.lexicon?.entries ?? 0 }],
      wordtypes: [{ label: 'Tipos', value: stats.lexicon?.categories ?? 0 }],
    });
  }, [stats]);

  // ── Update nodes/edges when level changes ─────────────────────────
  useEffect(() => {
    if (level === 'root') {
      const rootNode: Node = {
        id: ROOT_NODE_ID,
        type: 'rootNode',
        data: { conlangName, conlangNames, onSelectConlang, onZoomToGrammar },
        position: { x: 400, y: 300 },
      };
      // B5: restore root node + ROOT_NODES (with live stats B3-B4) +
      // preserved dynamic palette nodes
      setNodes([rootNode, ...toRfNodes(rootNodesWithStats, { ...nodeCallbacks, level: 'root' }), ...rootDynNodesRef.current]);
      setEdges(toRfEdges(ROOT_EDGES));
    } else if (level === 'grammar') {
      // B5: save root-level dynamic nodes before swapping to grammar view
      setNodes(nds => {
        rootDynNodesRef.current = nds.filter(
          n => n.id.startsWith('dyn_') && n.id !== ROOT_NODE_ID
        );
        return toRfNodes(grammarNodesWithStats, { ...nodeCallbacks, level });
      });
      setEdges(toRfEdges(GRAMMAR_EDGES));
    } else if (level === 'lexicon') {
      setNodes(nds => {
        rootDynNodesRef.current = nds.filter(
          n => n.id.startsWith('dyn_') && n.id !== ROOT_NODE_ID
        );
        return toRfNodes(lexiconNodesWithStats, { ...nodeCallbacks, level });
      });
      setEdges(toRfEdges(LEXICON_EDGES));
    } else if (level === 'syntax') {
      setNodes([]);
      setEdges([]);
    }
  }, [level, conlangName, conlangNames, onSelectConlang, nodeCallbacks, onZoomToGrammar, rootNodesWithStats, grammarNodesWithStats, lexiconNodesWithStats, setNodes, setEdges]);

  // ── Fit view on level change ──
  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 300 });
    }, 50);
    return () => clearTimeout(timer);
  }, [level]);

  // ── React Flow init ──
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = instance;
    instance.fitView();
  }, []);

  // ── Handle React Flow move (for zoom slider sync) ──
  const onMove = useCallback(() => {
    if (reactFlowInstanceRef.current) {
      const zoom = reactFlowInstanceRef.current.getZoom();
      setZoomValue(Math.round(zoom * 100));
    }
  }, []);

  // ── Node click ──
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.id === ROOT_NODE_ID) return;
    const moduleId = node.id.replace('dyn_', '');
    onModuleClick?.(moduleId);
  }, [onModuleClick]);

  // ── Zoom slider ──
  const handleZoomSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    reactFlowInstanceRef.current?.zoomTo(pct / 100);
    setZoomValue(pct);
  }, []);

  // ── Reset view ──
  const handleReset = useCallback(() => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
    }
    setZoomValue(100);
  }, []);

  // ── Palette drag & drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/loxar-module') as ModuleNodeType;
    if (!type || level !== 'root') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = reactFlowInstanceRef.current?.project({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }) ?? { x: 0, y: 0 };

    const id = `dyn_${type}_${Date.now()}`;
    const info = MODULE_LABELS[type];

    const newNode: Node = {
      id,
      type: type === 'grammar' ? 'grammarNode' : 'moduleNode',
      data: type === 'grammar'
        ? { pragmaticEngine, onZoom: onZoomToGrammar, activeModule }
        : {
            node: {
              id,
              label: info.label,
              icon: info.icon,
              x: 0,
              y: 0,
              w: 260,
              h: 140,
              level: 'root',
              status: 'empty' as const,
              description: info.description,
              ports: DYNAMIC_NODE_PORTS,
            },
            ...nodeCallbacks,
          },
      position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
      selectable: true,
    };

    setNodes(nds => nds.concat(newNode));
    setDraggingPalette(null);
  }, [level, pragmaticEngine, onZoomToGrammar, activeModule, nodeCallbacks, setNodes]);

  // ── Prevent connections from a node to itself ──
  const isValidConnection = useCallback((connection: Connection) => {
    return connection.source !== connection.target;
  }, []);

  // ── Breadcrumb ──
  const breadcrumb = useMemo(() => {
    const items = [{ id: 'root', label: conlangName ?? 'Proyecto' }];
    if (level === 'grammar') items.push({ id: 'grammar', label: 'Gramática' });
    if (level === 'lexicon') items.push({ id: 'lexicon', label: 'Léxico' });
    if (level === 'syntax') items.push({ id: 'grammar', label: 'Gramática' }, { id: 'syntax', label: 'Sintaxis' });
    return items;
  }, [level, conlangName]);

  // ── Render ──
  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden bg-background">
      {/* ── Top Bar ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/10 shadow-xl">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={item.id}>
              {i > 0 && <span className="text-white/20 text-xs">›</span>}
              <button
                onClick={() => item.id === 'root' ? navigateToLevel('root') : undefined}
                className={`
                  text-[10px] font-semibold uppercase tracking-wider
                  ${i === breadcrumb.length - 1
                    ? 'text-accent'
                    : 'text-white/50 hover:text-white/80'}
                  transition-colors
                `}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-xl px-2 py-1 rounded-lg border border-white/10">
            <input
              type="range"
              min="20"
              max="300"
              value={zoomValue}
              onChange={handleZoomSliderChange}
              className="w-16 accent-accent h-1 bg-white/20 rounded cursor-pointer"
            />
            <span className="text-[10px] text-accent font-mono w-8 text-right">{zoomValue}%</span>
          </div>
          <button
            onClick={handleReset}
            className="w-7 h-7 rounded bg-surface/90 backdrop-blur-xl border border-white/10 text-white/60 hover:text-accent flex items-center justify-center text-xs transition-colors"
            title="Reset"
          >
            ⊡
          </button>
        </div>
      </div>

      {/* ── Module Palette ── */}
      {level === 'root' && (
        <ModulePalette
          onDragStart={(type) => setDraggingPalette(type)}
          onDragEnd={() => setDraggingPalette(null)}
        />
      )}

      {/* ── Canvas Viewport ── */}
      <div className="absolute inset-0">
        {level === 'syntax' ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-3xl h-[90%] pointer-events-auto">
              <SyntaxFlowline lexicon={lexicon} />
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onNodeMouseEnter={(_e, n) => setHoveredNode(n.id)}
            onNodeMouseLeave={() => setHoveredNode(null)}
            onPaneClick={() => setHoveredNode(null)}
            onInit={onInit}
            onMove={onMove}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            nodesDraggable={true}
            elementsSelectable={true}
            connectionLineStyle={{
              stroke: '#00f0ff',
              strokeWidth: 2,
              strokeDasharray: '6 8',
            }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#00f0ff' },
            }}
            snapToGrid={true}
            snapGrid={[15, 15]}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={32} color="#0db9f2" style={{ opacity: 0.15 }} />
          </ReactFlow>
        )}
      </div>

      {/* ── Back Button ── */}
      {level !== 'root' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => navigateToLevel('root')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/95 backdrop-blur-xl border border-accent/40 text-accent hover:bg-accent/10 transition-colors shadow-xl"
          >
            <span>↩️</span>
            <span className="text-xs font-semibold">Volver al árbol principal</span>
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!conlangName && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
          <div className="text-center text-white/40 text-sm">
            <div className="text-2xl mb-2">🌐</div>
            <div>Definí el nombre de tu lengua en Ajustes para ver el canvas</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphCanvas;
