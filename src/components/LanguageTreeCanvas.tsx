import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

type TreeNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'complete' | 'partial' | 'empty';
  description?: string;
};

type GraphNode = TreeNode & { kind: 'category' | 'rule' | 'exception' | 'lexicon'; count?: number };
type GraphEdge = { from: string; to: string; label?: string };

type LanguageTreeCanvasProps = {
  activeModule?: string;
  grammar?: any;
  lexicon?: any[];
  profile?: any;
  onNodeClick?: (nodeId: string) => void;
  canvasNodes?: any[];
  canvasEdges?: any[];
  onCanvasChange?: (nodes: any[], edges: any[]) => void;
};

const NODES: TreeNode[] = [
  { id: 'phonology', label: 'Fonología', x: 50, y: 12, status: 'complete', description: 'Sonidos, inventario fonético y reglas fonotácticas' },
  { id: 'morphology', label: 'Morfología', x: 18, y: 32, status: 'partial', description: 'Afijos, flexión y formación de palabras' },
  { id: 'syntax', label: 'Sintaxis', x: 82, y: 32, status: 'partial', description: 'Estructura de oraciones y reglas gramaticales' },
  { id: 'lexicon', label: 'Léxico', x: 18, y: 62, status: 'complete', description: 'Entradas, raíces y significados' },
  { id: 'semantics', label: 'Semántica', x: 82, y: 62, status: 'empty', description: 'Significado, campos semánticos y relaciones' },
  { id: 'neography', label: 'Neografía', x: 50, y: 88, status: 'partial', description: 'Escritura, glifos y sistema de escritura' },
];

const EDGES = [
  { from: 'phonology', to: 'morphology', label: 'forma' },
  { from: 'phonology', to: 'syntax', label: 'sonido' },
  { from: 'phonology', to: 'neography', label: 'grafía' },
  { from: 'morphology', to: 'lexicon', label: 'raíz' },
  { from: 'morphology', to: 'syntax', label: 'género' },
  { from: 'syntax', to: 'semantics', label: 'predicado' },
  { from: 'lexicon', to: 'semantics', label: 'significado' },
  { from: 'lexicon', to: 'neography', label: 'etimología' },
  { from: 'semantics', to: 'neography', label: 'glosa' },
];

const STATUS_COLORS: Record<TreeNode['status'], { border: string; bg: string; text: string; glow: string }> = {
  complete: { border: 'border-emerald-400/60', bg: 'bg-emerald-500/10', text: 'text-emerald-300', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]' },
  partial: { border: 'border-amber-400/60', bg: 'bg-amber-500/10', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]' },
  empty: { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white/60', glow: 'shadow-none' },
};

const STATUS_DOT: Record<TreeNode['status'], string> = {
  complete: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  partial: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  empty: 'bg-white/40',
};

const GRAPH_COLORS: Record<GraphNode['kind'], { border: string; bg: string; text: string; line: string }> = {
  category: { border: 'border-sky-400/60', bg: 'bg-sky-500/10', text: 'text-sky-200', line: 'text-sky-300/70' },
  rule: { border: 'border-violet-400/60', bg: 'bg-violet-500/10', text: 'text-violet-200', line: 'text-violet-300/70' },
  exception: { border: 'border-rose-400/60', bg: 'bg-rose-500/10', text: 'text-rose-200', line: 'text-rose-300/70' },
  lexicon: { border: 'border-emerald-400/60', bg: 'bg-emerald-500/10', text: 'text-emerald-200', line: 'text-emerald-300/70' },
};

const safeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type Point = { x: number; y: number };
type DragState = { id: string; offsetX: number; offsetY: number };
type ConnectionState = { fromId: string; currentX: number; currentY: number };

const LanguageTreeCanvas: React.FC<LanguageTreeCanvasProps> = ({ activeModule, grammar, lexicon, onNodeClick, canvasNodes, canvasEdges, onCanvasChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [customNodes, setCustomNodes] = useState<GraphNode[]>(canvasNodes ?? []);
  const [customEdges, setCustomEdges] = useState<GraphEdge[]>(canvasEdges ?? []);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [connecting, setConnecting] = useState<ConnectionState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setCustomNodes(canvasNodes ?? []);
  }, [canvasNodes]);

  useEffect(() => {
    setCustomEdges(canvasEdges ?? []);
  }, [canvasEdges]);

  const emitCanvasChange = useCallback((nodes: GraphNode[], edges: GraphEdge[]) => {
    onCanvasChange?.(nodes, edges);
  }, [onCanvasChange]);

  const nodeMap = React.useMemo(() => {
    const map: Record<string, TreeNode> = {};
    NODES.forEach((n) => { map[n.id] = n; });
    return map;
  }, []);

  const graphData = React.useMemo(() => {
    if (!grammar && !lexicon) return null;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    if (grammar) {
      nodes.push({ id: 'grammar-root', label: 'Gramática', x: 50, y: 50, status: 'partial', kind: 'rule', description: 'Manifest activo del lenguaje' });

      const addCategories = (source: string, categories: string[] = []) => {
        categories.forEach((cat, idx) => {
          const id = `grammar-cat-${safeId(cat)}`;
          nodes.push({ id, label: cat, x: 15 + ((idx % 5) * 18), y: 22 + Math.floor(idx / 5) * 18, status: 'partial', kind: 'category', description: 'Categoría gramatical' });
          edges.push({ from: source, to: id, label: 'cat' });
        });
      };

      const cats = Array.isArray(grammar?.categories) ? grammar.categories : [];
      if (cats.length) addCategories('grammar-root', cats);

      const addRules = (source: string, rules: any[] = [], kind: GraphNode['kind']) => {
        rules?.forEach((rule, idx) => {
          const name = rule?.name || rule?.id || `Regla ${idx + 1}`;
          const id = `grammar-rule-${safeId(name)}`;
          nodes.push({ id, label: name, x: 55 + ((idx % 4) * 11), y: 24 + Math.floor(idx / 4) * 14, status: 'partial', kind, description: rule?.description || 'Regla/plantilla' });
          edges.push({ from: source, to: id, label: kind === 'exception' ? 'excepción' : 'regla' });
        });
      };

      addRules('grammar-root', grammar?.morphology?.rules, 'rule');
      addRules('grammar-root', grammar?.syntax?.rules, 'rule');
      addRules('grammar-root', grammar?.phonology?.rules, 'rule');
      addRules('grammar-root', grammar?.exceptions, 'exception');
    }

    if (lexicon && lexicon.length) {
      const categoryCounts: Record<string, number> = {};
      lexicon.forEach((entry) => {
        const cat = entry?.Categoría?.trim() || 'Sin categoría';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const entries = Object.entries(categoryCounts).slice(0, 12);
      entries.forEach(([cat, count], idx) => {
        const id = `lex-cat-${safeId(cat)}`;
        nodes.push({ id, label: `${cat}`, x: 8 + ((idx % 6) * 14), y: 72 + Math.floor(idx / 6) * 10, status: 'complete', kind: 'lexicon', description: `${count} entrada(s)` });
        edges.push({ from: 'lexicon', to: id, label: `${count}` });
      });
    }

    return { nodes, edges };
  }, [grammar, lexicon]);

  const getAllNodes = useCallback((source: GraphNode[]) => {
    const base = NODES.map((n) => ({ ...n, kind: 'category' as GraphNode['kind'] }));
    return [...base, ...graphData?.nodes ?? [], ...source];
  }, [graphData]);

  const getPosition = useCallback((e: React.PointerEvent | React.MouseEvent | MouseEvent): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const setCustomNodesWithSave = useCallback((updater: React.SetStateAction<GraphNode[]>) => {
    setCustomNodes((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: GraphNode[]) => GraphNode[])(prev) : updater;
      emitCanvasChange(next, customEdges);
      return next;
    });
  }, [customEdges, emitCanvasChange]);

  const setCustomEdgesWithSave = useCallback((updater: React.SetStateAction<GraphEdge[]>) => {
    setCustomEdges((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: GraphEdge[]) => GraphEdge[])(prev) : updater;
      emitCanvasChange(customNodes, next);
      return next;
    });
  }, [customNodes, emitCanvasChange]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const label = window.prompt('Nombre del nuevo elemento:', 'Nuevo nodo');
    if (!label?.trim()) return;
    const pos = getPosition(e);
    const newNode: GraphNode = {
      id: `custom-${safeId(label)}-${Date.now()}`,
      label,
      x: pos.x,
      y: pos.y,
      status: 'partial',
      kind: 'rule',
      description: 'Nodo personalizado',
    };
    setCustomNodesWithSave((prev) => [...prev, newNode]);
  }, [getPosition, setCustomNodesWithSave]);

  const handleNodePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getPosition(e);
    setDragging({ id, offsetX: pos.x, offsetY: pos.y });
    setContextMenu(null);
  }, [getPosition]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    const pos = getPosition(e);

    if (dragging) {
      setCustomNodesWithSave((prev) =>
        prev.map((node) =>
          node.id === dragging.id
            ? { ...node, x: Math.max(2, Math.min(98, pos.x)), y: Math.max(2, Math.min(98, pos.y)) }
            : node
        )
      );
      setDragging((prev) => (prev ? { ...prev, offsetX: pos.x, offsetY: pos.y } : prev));
    }

    if (connecting) {
      setConnecting({ ...connecting, currentX: pos.x, currentY: pos.y });
    }
  }, [dragging, connecting, getPosition, setCustomNodesWithSave]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    const nodeId = target?.closest('[data-node-id]')?.getAttribute('data-node-id');

    if (connecting && nodeId && nodeId !== connecting.fromId) {
      setCustomEdgesWithSave((prev) => [...prev, { from: connecting.fromId, to: nodeId, label: '' }]);
    }

    setDragging(null);
    setConnecting(null);
  }, [connecting, setCustomEdgesWithSave]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]')) return;
    const pos = getPosition(e);
    const label = window.prompt('Nombre del nuevo elemento:', 'Nuevo nodo');
    if (!label?.trim()) return;
    const newNode: GraphNode = {
      id: `custom-${safeId(label)}-${Date.now()}`,
      label,
      x: pos.x,
      y: pos.y,
      status: 'partial',
      kind: 'rule',
      description: 'Nodo personalizado',
    };
    setCustomNodesWithSave((prev) => [...prev, newNode]);
  }, [getPosition, setCustomNodesWithSave]);

  const startConnection = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getPosition(e);
    setConnecting({ fromId: id, currentX: pos.x, currentY: pos.y });
    setContextMenu(null);
  }, [getPosition]);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const deleteNode = useCallback((id: string) => {
    setCustomNodesWithSave((prev) => prev.filter((node) => node.id !== id));
    setCustomEdgesWithSave((prev) => prev.filter((edge) => edge.from !== id && edge.to !== id));
    setContextMenu(null);
  }, [setCustomNodesWithSave, setCustomEdgesWithSave]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    window.addEventListener('contextmenu', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [contextMenu, closeContextMenu]);

  const allDynamicEdges = useMemo(() => {
    const baseEdges = graphData?.edges ?? [];
    return [...baseEdges, ...customEdges];
  }, [graphData, customEdges]);

  const allDynamicNodes = useMemo(() => getAllNodes(customNodes), [getAllNodes, customNodes]);

  const baseNodeIds = useMemo(() => new Set(NODES.map((n) => n.id)), []);
  const dynamicNodeById = useMemo(() => {
    const map: Record<string, GraphNode> = {};
    allDynamicNodes.forEach((node) => {
      map[node.id] = node;
    });
    return map;
  }, [allDynamicNodes]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
      onDoubleClick={handleCanvasDoubleClick}
    >
      {/* SVG Edges */}
      <svg className="absolute inset-0 w-full h-full opacity-60" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.6)" />
          </marker>
        </defs>
        {EDGES.map((edge) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;

          const isActiveEdge = activeModule && (from.id === activeModule || to.id === activeModule);

          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke="url(#edgeGradient)"
                strokeWidth={isActiveEdge ? 2.5 : 1.2}
                className={isActiveEdge ? 'text-accent' : 'text-white/20'}
                strokeDasharray={isActiveEdge ? 'none' : '4 4'}
              />
              {isActiveEdge && (
                <text
                  x={`${(from.x + to.x) / 2}%`}
                  y={`${(from.y + to.y) / 2}%`}
                  textAnchor="middle"
                  className="fill-accent/80 text-[10px] font-medium"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {allDynamicEdges.map((edge, idx) => {
          const from = dynamicNodeById[edge.from];
          const to = dynamicNodeById[edge.to];
          if (!from || !to) return null;
          const kind = to.kind || 'rule';
          const colors = GRAPH_COLORS[kind] || GRAPH_COLORS.rule;
          return (
            <g key={`dynamic-edge-${idx}`}>
              <line
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke="url(#graphEdgeGradient)"
                strokeWidth={1.6}
                className={colors.line}
                strokeDasharray="3 3"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={`${(from.x + to.x) / 2}%`}
                  y={`${(from.y + to.y) / 2}%`}
                  textAnchor="middle"
                  className={`${colors.text} text-[9px] font-medium`}
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {connecting && (
          <line
            x1={`${dynamicNodeById[connecting.fromId]?.x ?? 0}%`}
            y1={`${dynamicNodeById[connecting.fromId]?.y ?? 0}%`}
            x2={`${connecting.currentX}%`}
            y2={`${connecting.currentY}%`}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1.6}
            strokeDasharray="4 4"
            markerEnd="url(#arrowhead)"
          />
        )}
      </svg>

      {/* Base Tree Nodes */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {NODES.map((node) => {
          const colors = STATUS_COLORS[node.status];
          const isActive = activeModule === node.id;

          return (
            <div
              key={node.id}
              data-node-id={node.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all duration-500 pointer-events-auto cursor-pointer ${colors.border} ${colors.bg} ${isActive ? `${colors.glow} scale-105` : 'hover:scale-105'}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              onClick={() => onNodeClick?.(node.id)}
              title={node.description || node.label}
            >
              <div className="flex items-center gap-2">
                <span className={`relative flex h-2.5 w-2.5`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT[node.status]}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${STATUS_DOT[node.status]}`} />
                </span>
                <div>
                  <div className={`text-xs font-bold tracking-wide ${colors.text}`}>{node.label}</div>
                  {isActive && (
                    <div className="text-[10px] text-white/60 mt-0.5">{node.description}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic graph overlay */}
      {graphData && (
        <>
          <svg className="absolute inset-0 w-full h-full opacity-80 pointer-events-none" style={{ zIndex: 2 }}>
            <defs>
              <linearGradient id="graphEdgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
              </linearGradient>
            </defs>
            {graphData.edges.map((edge: GraphEdge, idx: number) => {
              const from = graphData.nodes.find((n) => n.id === edge.from);
              const to = graphData.nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const kind = to.kind || 'rule';
              const colors = GRAPH_COLORS[kind] || GRAPH_COLORS.rule;
              return (
                <g key={`graph-edge-${idx}`}>
                  <line
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    stroke="url(#graphEdgeGradient)"
                    strokeWidth={1.6}
                    className={colors.line}
                    strokeDasharray="3 3"
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={`${(from.x + to.x) / 2}%`}
                      y={`${(from.y + to.y) / 2}%`}
                      textAnchor="middle"
                      className={`${colors.text} text-[9px] font-medium`}
                      style={{ transform: 'translate(-50%, -50%)' }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0" style={{ zIndex: 3 }}>
            {graphData.nodes.map((node: GraphNode) => {
              const colors = GRAPH_COLORS[node.kind || 'rule'] || GRAPH_COLORS.rule;
              const isActive = activeModule === node.id;

              return (
                <div
                  key={node.id}
                  data-node-id={node.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2.5 py-2 backdrop-blur-md transition-all duration-500 pointer-events-auto cursor-default ${colors.border} ${colors.bg} ${isActive ? 'shadow-[0_0_20px_rgba(255,255,255,0.08)] scale-105' : 'hover:scale-105'}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  onContextMenu={(e) => handleContextMenu(e, node.id)}
                  onClick={() => onNodeClick?.(node.id)}
                  title={node.description || node.label}
                >
                  <div className={`text-[11px] font-bold tracking-wide ${colors.text}`}>{node.label}</div>
                  {node.count != null && <div className="text-[10px] text-white/60">{node.count}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Custom nodes layer */}
      <div className="absolute inset-0" style={{ zIndex: 4 }}>
        {customNodes.map((node: GraphNode) => {
          const colors = GRAPH_COLORS[node.kind || 'rule'] || GRAPH_COLORS.rule;
          const isActive = activeModule === node.id;
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 backdrop-blur-md transition-all duration-200 pointer-events-auto cursor-grab active:cursor-grabbing ${colors.border} ${colors.bg} ${isActive ? 'shadow-[0_0_20px_rgba(255,255,255,0.08)] scale-105' : 'hover:scale-105'}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              onClick={() => onNodeClick?.(node.id)}
              title={node.description || node.label}
            >
              <div className={`text-[11px] font-bold tracking-wide ${colors.text}`}>{node.label}</div>
              {node.count != null && <div className="text-[10px] text-white/60">{node.count}</div>}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className="text-[10px] text-white/70 hover:text-white"
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); startConnection(e, node.id); }}
                >
                  Conectar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-white/10 bg-surface-dark/95 p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button type="button" className="w-full text-left text-xs text-white/80 hover:bg-white/10 px-2 py-1.5 rounded" onClick={() => {
            const node = customNodes.find((n) => n.id === contextMenu.id);
            if (node) {
              const next = window.prompt('Editar nombre:', node.label);
              if (next !== null && next.trim()) {
                setCustomNodes((prev) => prev.map((n) => n.id === contextMenu.id ? { ...n, label: next.trim() } : n));
              }
            }
            closeContextMenu();
          }}>Editar</button>
          <button type="button" className="w-full text-left text-xs text-white/80 hover:bg-white/10 px-2 py-1.5 rounded" onClick={() => {
            const pos = getPosition({ clientX: contextMenu.x, clientY: contextMenu.y } as any);
            const newNode: GraphNode = {
              id: `custom-${safeId('Nuevo')}-${Date.now()}`,
              label: 'Nuevo nodo',
              x: pos.x,
              y: pos.y,
              status: 'partial',
              kind: 'rule',
              description: 'Nodo personalizado',
            };
            setCustomNodes((prev) => [...prev, newNode]);
            closeContextMenu();
          }}>Duplicar cerca</button>
          <div className="my-1 border-t border-white/10" />
          <button type="button" className="w-full text-left text-xs text-danger hover:bg-danger/10 px-2 py-1.5 rounded" onClick={() => deleteNode(contextMenu.id)}>Eliminar</button>
        </div>
      )}
    </div>
  );
};

export default LanguageTreeCanvas;
