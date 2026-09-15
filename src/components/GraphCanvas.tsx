/**
 * GraphCanvas.tsx
 * ────────────────
 * Canvas infinito con deep-zoom multinivel para LOXAR.
 *
 * Niveles:
 *   root     → Conlang central + módulos (vista principal)
 *   grammar  → Sub-módulos de gramática (grafo de nodos)
 *   lexicon  → Componentes del léxico (tipos, raíces, entradas)
 *   syntax   → Arnés AST con slots + preview
 *
 * Reutiliza datos existentes: taxonomy.ts, LexiconEntry, GrammarManifest.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import SyntaxFlowline from './SyntaxFlowline';

// ── Types ──────────────────────────────────────────────
type LevelId = 'root' | 'grammar' | 'lexicon' | 'syntax';

type NodePort = { id: string; label: string; side: 'left' | 'right'; color?: string };

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

type Transform = { x: number; y: number; zoom: number };

type GraphCanvasProps = {
  conlangName?: string | null;
  activeModule?: string;
  stats?: {
    grammar?: { rules?: number; categories?: number };
    lexicon?: { entries?: number; categories?: number };
    phonology?: { sounds?: number };
  };
  onModuleClick?: (moduleId: string) => void;
  onNavigate?: (tab: string) => void;
  conlangNames?: string[];
  onSelectConlang?: (name: string) => void;
  lexicon?: Array<{ ID: string; Raíz: string; Léxema: string[]; Categoría: string; Significado: string[] }>;
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

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ── Component ──────────────────────────────────────────
const GraphCanvas: React.FC<GraphCanvasProps> = ({
  conlangName,
  activeModule,
  stats,
  onModuleClick,
  onNavigate,
  conlangNames = [],
  onSelectConlang,
  lexicon = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<LevelId>('root');
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, zoom: 1 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ type: 'pan' | 'node'; nodeId?: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  const NODES = level === 'root' ? ROOT_NODES : level === 'grammar' ? GRAMMAR_NODES : level === 'lexicon' ? LEXICON_NODES : [];
  const EDGES = level === 'root' ? ROOT_EDGES : level === 'grammar' ? GRAMMAR_EDGES : level === 'lexicon' ? LEXICON_EDGES : [];

  const getNodePosition = useCallback((node: GraphNode) => {
    return nodePositions[node.id] ?? { x: node.x, y: node.y };
  }, [nodePositions]);

  // ── Pan / Zoom ──────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, zoom: Math.min(3, Math.max(0.2, t.zoom * delta)) }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
    setDragging({ type: 'pan', startX: e.clientX - transform.x, startY: e.clientY - transform.y, origX: transform.x, origY: transform.y });
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    if (dragging.type === 'pan') {
      setTransform(t => ({ ...t, x: e.clientX - dragging.startX, y: e.clientY - dragging.startY }));
    } else if (dragging.type === 'node' && dragging.nodeId) {
      const dx = (e.clientX - dragging.startX) / transform.zoom;
      const dy = (e.clientY - dragging.startY) / transform.zoom;
      setNodePositions(prev => ({ ...prev, [dragging.nodeId!]: { x: dragging.origX + dx, y: dragging.origY + dy } }));
    }
  }, [dragging, transform.zoom]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  // ── Node Drag ───────────────────────────────────────
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const pos = getNodePosition(node);
    setDragging({ type: 'node', nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y });
  }, [getNodePosition]);

  // ── Level Navigation ───────────────────────────────
  const navigateToLevel = useCallback((targetLevel: LevelId) => {
    setTransform({ x: 0, y: 0, zoom: 1 });
    setLevel(targetLevel);
  }, []);

  const zoomIntoNode = useCallback((nodeId: string) => {
    const node = NODES.find(n => n.id === nodeId);
    if (!node) return;
    const pos = getNodePosition(node);
    setTransform({
      x: -(pos.x + node.w / 2) * 1.6 + (containerRef.current?.clientWidth ?? 800) / 2,
      y: -(pos.y + node.h / 2) * 1.6 + (containerRef.current?.clientHeight ?? 600) / 2,
      zoom: 1.6,
    });
    setTimeout(() => {
      if (nodeId === 'grammar') setLevel('grammar');
      else if (nodeId === 'lexicon') setLevel('lexicon');
      else if (nodeId === 'syntax') setLevel('syntax');
    }, 250);
  }, [NODES, getNodePosition]);

  // ── Port positions ──────────────────────────────────
  const getPortPosition = useCallback((node: GraphNode, port: NodePort) => {
    const pos = getNodePosition(node);
    return port.side === 'right'
      ? { x: pos.x + node.w, y: pos.y + node.h * 0.3 }
      : { x: pos.x, y: pos.y + node.h * 0.3 };
  }, [getNodePosition]);

  // ── Syntax Preview ─────────────────────────────────
  // ── Breadcrumb ─────────────────────────────────────
  const breadcrumb = useMemo(() => {
    const items = [{ id: 'root', label: conlangName ?? 'Proyecto' }];
    if (level === 'grammar') items.push({ id: 'grammar', label: 'Gramática' });
    if (level === 'lexicon') items.push({ id: 'lexicon', label: 'Léxico' });
    if (level === 'syntax') items.push({ id: 'grammar', label: 'Gramática' }, { id: 'syntax', label: 'Sintaxis' });
    return items;
  }, [level, conlangName]);

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden bg-background" ref={containerRef}>
      {/* Top Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/10 shadow-xl">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={item.id}>
              {i > 0 && <span className="text-white/20 text-xs">›</span>}
              <button
                onClick={() => item.id === 'root' ? navigateToLevel('root') : undefined}
                className={`text-[10px] font-semibold uppercase tracking-wider ${i === breadcrumb.length - 1 ? 'text-accent' : 'text-white/50 hover:text-white/80'} transition-colors`}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-xl px-2 py-1 rounded-lg border border-white/10">
            <input type="range" min="20" max="300" value={transform.zoom * 100}
              onChange={(e) => setTransform(t => ({ ...t, zoom: Number(e.target.value) / 100 }))}
              className="w-16 accent-accent h-1 bg-white/20 rounded cursor-pointer" />
            <span className="text-[10px] text-accent font-mono w-8 text-right">{Math.round(transform.zoom * 100)}%</span>
          </div>
          <button onClick={() => setTransform({ x: 0, y: 0, zoom: 1 })}
            className="w-7 h-7 rounded bg-surface/90 backdrop-blur-xl border border-white/10 text-white/60 hover:text-accent flex items-center justify-center text-xs transition-colors" title="Reset">⊡</button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: `${32 * transform.zoom}px ${32 * transform.zoom}px`, backgroundPosition: `${transform.x}px ${transform.y}px` }} />

        {/* Stage */}
        <div className="absolute origin-top-left" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`, transition: dragging ? 'none' : 'transform 0.3s ease-out' }}>
          {/* Edges */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: 2000, height: 1400, overflow: 'visible' }}>
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {EDGES.map((edge, i) => {
              const fromNode = NODES.find(n => n.id === edge.from.node);
              const toNode = NODES.find(n => n.id === edge.to.node);
              if (!fromNode || !toNode) return null;
              const fromPort = fromNode.ports.find(p => p.id === edge.from.port);
              const toPort = toNode.ports.find(p => p.id === edge.to.port);
              if (!fromPort || !toPort) return null;
              const from = getPortPosition(fromNode, fromPort);
              const to = getPortPosition(toNode, toPort);
              const color = edge.color === 'purple' ? '#a855f7' : '#00f0ff';
              return (
                <g key={i}>
                  <path d={bezierPath(from.x, from.y, to.x, to.y)} fill="none" stroke={color} strokeWidth={2} filter={edge.color === 'purple' ? 'url(#glow-purple)' : 'url(#glow-cyan)'} opacity={0.8} />
                  <path d={bezierPath(from.x, from.y, to.x, to.y)} fill="none" stroke="#ffffff" strokeWidth={1} strokeDasharray="6 8" opacity={0.5}>
                    <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
                  </path>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {NODES.map((node) => {
            const pos = getNodePosition(node);
            const colors = STATUS_COLORS[node.status];
            const isActive = activeModule === node.id;
            const isHovered = hoveredNode === node.id;
            const hasChildren = ['grammar', 'lexicon', 'syntax'].includes(node.id);

            return (
              <div key={node.id} data-node-id={node.id}
                className={`absolute rounded-xl border backdrop-blur-xl transition-all duration-300 pointer-events-auto cursor-pointer select-none ${colors.border} ${colors.bg} ${isActive ? `${colors.glow} scale-[1.03] z-20` : isHovered ? 'scale-[1.02] z-10' : 'z-10'}`}
                style={{ left: pos.x, top: pos.y, width: node.w, minHeight: node.h, zIndex: isActive ? 20 : isHovered ? 15 : 10 }}
                onPointerEnter={() => setHoveredNode(node.id)} onPointerLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}>
                {/* Header */}
                <div className="h-8 px-3 flex items-center justify-between border-b border-white/10 rounded-t-xl bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{node.label}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono border border-accent/20">{node.id.toUpperCase().slice(0, 3)}</span>
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
                  {/* Zoom Button */}
                  {hasChildren && (
                    <button onClick={(e) => { e.stopPropagation(); zoomIntoNode(node.id); }}
                      className="mt-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent transition-colors w-full justify-center">
                      <span>🔍</span><span>Zoom</span>
                    </button>
                  )}
                  {/* Navigate Button (for nodes that map to existing tabs) */}
                  {['lexicon', 'workbench', 'phonology', 'neography', 'semantics', 'translator'].includes(node.id) && level === 'root' && (
                    <button onClick={(e) => { e.stopPropagation(); onNavigate?.(node.id === 'lexicon' ? 'table' : node.id); }}
                      className="mt-1 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors w-full justify-center">
                      <span>→</span><span>Ir a pantalla</span>
                    </button>
                  )}
                  {/* Status + Ports */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <span className={`relative flex h-1.5 w-1.5`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT[node.status]}`} />
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${STATUS_DOT[node.status]}`} />
                      </span>
                      <span className="text-[8px] text-white/40 capitalize">{node.status === 'complete' ? 'Completo' : node.status === 'partial' ? 'Parcial' : 'Vacío'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {node.ports.filter(p => p.side === 'left').map(p => (<span key={p.id} className="w-1.5 h-1.5 rounded-full bg-accent border border-white/20 shadow-[0_0_4px_rgba(0,240,255,0.5)]" title={p.label} />))}
                      {node.ports.filter(p => p.side === 'right').map(p => (<span key={p.id} className="w-1.5 h-1.5 rounded-full bg-purple-400 border border-white/20 shadow-[0_0_4px_rgba(168,85,247,0.5)]" title={p.label} />))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center Node: Conlang Selector (root level only) */}
          {level === 'root' && (
            <div className="absolute" style={{ left: 420, top: 300, width: 240 }}>
              <div className="rounded-xl border-2 border-accent/60 bg-accent/10 backdrop-blur-md px-4 py-4 shadow-[0_0_30px_rgba(13,185,242,0.2)] text-center">
                <div className="text-3xl mb-2">🌐</div>
                <div className="text-xs font-bold tracking-widest text-accent uppercase mb-2">
                  {conlangName || 'Sin conlang'}
                </div>
                <div className="text-[10px] text-white/50 mb-3">Lengua central</div>
                {conlangNames.length > 1 && (
                  <select
                    value={conlangName ?? ''}
                    onChange={(e) => onSelectConlang?.(e.target.value)}
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50 cursor-pointer"
                  >
                    {conlangNames.map(name => (
                      <option key={name} value={name} className="bg-background text-white">{name}</option>
                    ))}
                  </select>
                )}
                {conlangNames.length === 1 && (
                  <div className="text-[10px] text-white/40">{conlangNames[0]}</div>
                )}
              </div>
            </div>
          )}

          {/* Syntax Level: Flowline Constructor */}
          {level === 'syntax' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="w-full max-w-3xl h-[90%] pointer-events-auto">
                <SyntaxFlowline lexicon={lexicon} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      {level !== 'root' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <button onClick={() => navigateToLevel('root')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface/95 backdrop-blur-xl border border-accent/40 text-accent hover:bg-accent/10 transition-colors shadow-xl">
            <span>↩️</span><span className="text-xs font-semibold">Volver al árbol principal</span>
          </button>
        </div>
      )}

      {/* Empty state */}
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
