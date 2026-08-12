/* src/components/ASTEditor.tsx
 *
 * Interactive flow-diagram editor for the clause AST. This is the visual
 * surface the user asked for: a tree of nodes connected by arrows (the
 * "diagrama de flujo con conectores") that can be reshaped live.
 *
 * Features:
 *   - SVG connector layer with arrowheads (parent → dependent)
 *   - Layered tree layout (root at left, dependents flow to the right)
 *   - Drag a node to reposition it
 *   - Pan (drag background) + zoom (wheel)
 *   - Click to select; add a dependent; delete a node; relabel
 *   - Emits the edited ClauseAST up via `onChange` so GrammarTab can
 *     re-realize the sentence immediately.
 *
 * The component is fully controlled by its `ast` prop and never mutates
 * the engine's data — all edits produce new ClauseAST objects.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDependent,
  makeNode,
  removeNode,
  updateNode,
  type DiagramNode,
} from '../services/grammar/ast-view';

interface Props {
  /** Editable clause AST produced by `buildClauseAST`. */
  ast: any;
  /** Called whenever the user reshapes the tree. */
  onChange: (ast: any) => void;
  /** Optional callback to inspect (e.g. open a feature panel). */
  onInspect?: (nodeId: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  root: '#6366f1',
  subject: '#10b981',
  object: '#f59e0b',
  modifier: '#ec4899',
  particle: '#06b6d4',
  auxiliary_verb: '#a855f7',
  unknown: '#64748b',
};

const NODE_W = 120;
const NODE_H = 40;
const LEVEL_GAP_X = 180;
const SIBLING_GAP_Y = 64;

type PositionMap = Record<string, { x: number; y: number }>;

function layoutTree(ast: any): PositionMap {
  const positions: PositionMap = {};
  let leafCursor = 0;

  const place = (node: any, depth: number) => {
    if (!node) return;
    const kids = node.dependents || [];
    if (kids.length === 0) {
      const y = leafCursor * SIBLING_GAP_Y + 20;
      leafCursor += 1;
      positions[node.id] = { x: depth * LEVEL_GAP_X + 20, y };
    } else {
      kids.forEach((k: any) => place(k, depth + 1));
      const ys = kids.map((k: any) => positions[k.id]?.y ?? 0);
      const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
      positions[node.id] = { x: depth * LEVEL_GAP_X + 20, y: midY };
    }
  };

  if (ast?.root) place(ast.root, 0);
  return positions;
}

function collectNodes(ast: any): DiagramNode[] {
  const out: DiagramNode[] = [];
  const walk = (node: any) => {
    if (!node) return;
    out.push({
      id: node.id,
      label: node.lexeme?.root || node.lexeme?.Raíz || '?',
      role: node.role || 'unknown',
      form: node.lexeme?.root || '?',
      features: node.features,
    });
    (node.dependents || []).forEach(walk);
  };
  if (ast?.root) walk(ast.root);
  return out;
}

function collectEdges(ast: any): { fromId: string; toId: string }[] {
  const edges: { fromId: string; toId: string }[] = [];
  const walk = (node: any) => {
    if (!node) return;
    (node.dependents || []).forEach((child: any) => {
      edges.push({ fromId: node.id, toId: child.id });
      walk(child);
    });
  };
  if (ast?.root) walk(ast.root);
  return edges;
}

export default function ASTEditor({ ast, onChange, onInspect }: Props) {
  const baseLayout = useMemo(() => layoutTree(ast), [ast]);
  const [dragPos, setDragPos] = useState<PositionMap>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string | null; startX: number; startY: number; origin: { x: number; y: number } } | null>(null);
  const panState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  const nodes = useMemo(() => collectNodes(ast), [ast]);
  const edges = useMemo(() => collectEdges(ast), [ast]);

  const posOf = useCallback(
    (id: string) => dragPos[id] || baseLayout[id] || { x: 0, y: 0 },
    [dragPos, baseLayout],
  );

  // Reset transient drag overrides when the underlying tree is replaced.
  useEffect(() => {
    setDragPos({});
    setSelected(null);
  }, [ast]);

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const origin = posOf(id);
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origin };
    setSelected(id);
  };

  const onBackgroundMouseDown = (e: React.MouseEvent) => {
    panState.current = { startX: e.clientX, startY: e.clientY, origin: { ...pan } };
    setSelected(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragState.current) {
      const { id, startX, startY, origin } = dragState.current;
      const scale = zoom || 1;
      const nx = origin.x + (e.clientX - startX) / scale;
      const ny = origin.y + (e.clientY - startY) / scale;
      const nodeId = id as string;
      setDragPos((prev) => ({ ...prev, [nodeId]: { x: nx, y: ny } }));
    } else if (panState.current) {
      const { startX, startY, origin } = panState.current;
      setPan({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
    }
  };

  const endDrag = () => {
    dragState.current = null;
    panState.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(2, Math.max(0.4, zoom - e.deltaY * 0.001));
    setZoom(next);
  };

  const handleAdd = (parentId: string) => {
    const role = window.prompt(
      'Rol del nuevo nodo (subject, object, modifier, particle, auxiliary_verb):',
      'modifier',
    );
    if (!role) return;
    const label = window.prompt('Etiqueta / raíz de la palabra:', 'nuevo');
    if (!label) return;
    const child = makeNode(role, label);
    onChange(addDependent(ast, parentId, child));
  };

  const handleDelete = (nodeId: string) => {
    if (nodeId === ast?.root?.id) {
      window.alert('No puedes borrar la raíz (verbo).');
      return;
    }
    if (!window.confirm('¿Borrar este nodo y su subárbol?')) return;
    onChange(removeNode(ast, nodeId));
  };

  const handleRelabel = (nodeId: string, current: string) => {
    const label = window.prompt('Nueva raíz / etiqueta:', current);
    if (!label || label === current) return;
    onChange(updateNode(ast, nodeId, { label }));
  };

  const toScreen = (p: { x: number; y: number }) => ({
    x: pan.x + p.x * zoom,
    y: pan.y + p.y * zoom,
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={onBackgroundMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onWheel={onWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 280,
        overflow: 'hidden',
        borderRadius: 8,
        background:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0) 0 0 / 24px 24px',
        cursor: panState.current ? 'grabbing' : 'grab',
      }}
    >
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 30 }}>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="px-2 py-1 text-xs rounded bg-surface border border-border-dark text-white hover:bg-primary/30"
          title="Acercar"
        >
          ＋
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          className="px-2 py-1 text-xs rounded bg-surface border border-border-dark text-white hover:bg-primary/30"
          title="Alejar"
        >
          －
        </button>
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
          className="px-2 py-1 text-xs rounded bg-surface border border-border-dark text-white hover:bg-primary/30"
          title="Recentrar"
        >
          ⤢
        </button>
      </div>

      {/* Connector layer */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        <defs>
          <marker id="ast-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L9,3 L0,6 z" fill="#94a3b8" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = toScreen(posOf(e.fromId));
          const b = toScreen(posOf(e.toId));
          const ax = a.x + NODE_W * zoom;
          const ay = a.y + (NODE_H * zoom) / 2;
          const bx = b.x;
          const by = b.y + (NODE_H * zoom) / 2;
          const mx = (ax + bx) / 2;
          return (
            <path
              key={i}
              d={`M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
              markerEnd="url(#ast-arrow)"
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((n) => {
        const p = toScreen(posOf(n.id));
        const color = ROLE_COLORS[n.role] || ROLE_COLORS.unknown;
        const isSel = selected === n.id;
        return (
          <div
            key={n.id}
            onMouseDown={(e) => onNodeMouseDown(e, n.id)}
            onDoubleClick={() => {
              setEditingId(n.id);
              handleRelabel(n.id, n.label);
            }}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: NODE_W * zoom,
              height: NODE_H * zoom,
              transform: 'translate(0,0)',
              zIndex: isSel ? 20 : 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: `2px solid ${isSel ? '#fff' : color}`,
              background: '#0f172a',
              color: '#fff',
              fontSize: 12 * zoom,
              padding: '2px 4px',
              boxShadow: isSel ? `0 0 0 3px ${color}55` : 'none',
              cursor: 'move',
              userSelect: 'none',
            }}
            title={`${n.label} (${n.role}) — doble clic para renombrar`}
          >
            <span style={{ fontWeight: 700, lineHeight: 1.1 }}>{n.label}</span>
            <span style={{ fontSize: 9 * zoom, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{n.role}</span>
            {isSel && (
              <div
                style={{
                  position: 'absolute',
                  top: -34 * zoom,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 4,
                  zIndex: 25,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleAdd(n.id)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-primary text-white"
                  title="Añadir dependiente"
                >
                  ＋ hijo
                </button>
                <button
                  onClick={() => onInspect?.(n.id)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-surface border border-border-dark text-white"
                  title="Inspeccionar"
                >
                  🔍
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-danger text-white"
                  title="Borrar nodo"
                  disabled={n.id === ast?.root?.id}
                >
                  🗑
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
