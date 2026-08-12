/* src/components/SyntaxCanvasAST.tsx
 *
 * Minimal component that renders the diagram description produced by
 * `astToDiagram(ast)`.  It uses an SVG layer for connectors and absolutely
 * positioned divs for nodes (matching the approach of the legacy canvas)
 * but works on plain node/edge data instead of internal SyntaxNode model.
 *
 * Kept separate so new visual features can be added without touching the
 * legacy SyntaxCanvas.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DiagramNode, DiagramEdge } from '../services/grammar/ast-view';

type Props = {
  diagram: { nodes: DiagramNode[]; edges: DiagramEdge[] };
  nodeIconUrl?: string;
  onInspect?: (nodeId: string) => void;
};

const defaultIcon = '/icons/node-default.svg';

export default function SyntaxCanvasAST({
  diagram,
  nodeIconUrl = defaultIcon,
  onInspect,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  /** Rough layout: grid spread based on node index (depth‑first not required yet). */
  const positions = useMemo(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    diagram.nodes.forEach((n, i) => {
      layout[n.id] = { x: (i % 10) * 90 + 20, y: Math.floor(i / 10) * 70 + 20 };
    });
    return layout;
  }, [diagram.nodes]);

  // Inject arrowhead marker into DOM once
  useEffect(() => {
    const svgId = 'syntax-ast-svg-defs';
    if (!document.getElementById(svgId)) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = svgId;
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      svg.innerHTML = `
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#666" />
          </marker>
        </defs>`;
      document.body.appendChild(svg);
    }
  }, []);

  return (
    <div
      id="syntax-ast-container"
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 180 }}
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {diagram.edges.map((e, i) => {
          const from = positions[e.fromId];
          const to = positions[e.toId];
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x + 30}
              y1={from.y + 20}
              x2={to.x + 30}
              y2={to.y + 20}
              stroke="#666"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>

      {diagram.nodes.map((n) => {
        const pos = positions[n.id] || { x: 0, y: 0 };
        return (
          <div
            key={n.id}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            onDoubleClick={() => onInspect?.(n.id)}
            title={`${n.label} (${n.role})`}
            className="syntax-node"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              padding: '4px 10px',
              borderRadius: 8,
              background: hovered === n.id ? '#6366f1' : '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {n.label}
          </div>
        );
      })}
    </div>
  );
}
