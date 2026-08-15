import React, { useState, useCallback, useEffect, useMemo } from 'react';

type ModuleId = 'grammar' | 'phonology' | 'syntax' | 'lexicon' | 'neography' | 'semantics' | 'translator' | 'workbench' | 'collections';

type ModuleNode = {
  id: ModuleId;
  label: string;
  icon: string;
  status: 'complete' | 'partial' | 'empty';
  description: string;
  x: number;
  y: number;
};

type LanguageHomeCanvasProps = {
  conlangName?: string | null;
  activeModule?: string;
  stats?: {
    grammar?: { rules?: number; categories?: number };
    phonology?: { sounds?: number; rules?: number };
    syntax?: { rules?: number };
    lexicon?: { entries?: number };
    neography?: { glyphs?: number };
    semantics?: { fields?: number };
  };
  onModuleClick?: (moduleId: ModuleId) => void;
};

const MODULE_NODES: ModuleNode[] = [
  { id: 'grammar', label: 'Gramática', icon: '📐', status: 'empty', description: 'Categorías, reglas y excepciones', x: 50, y: 22 },
  { id: 'phonology', label: 'Fonología', icon: '🔊', status: 'empty', description: 'Inventario fonético y reglas', x: 22, y: 38 },
  { id: 'syntax', label: 'Sintaxis', icon: '🧩', status: 'empty', description: 'Estructura de oraciones', x: 78, y: 38 },
  { id: 'lexicon', label: 'Léxico', icon: '📚', status: 'empty', description: 'Entradas y significados', x: 22, y: 62 },
  { id: 'neography', label: 'Neografía', icon: '✍️', status: 'empty', description: 'Glifos y sistema de escritura', x: 50, y: 78 },
  { id: 'semantics', label: 'Semántica', icon: '💡', status: 'empty', description: 'Campos semánticos y relaciones', x: 78, y: 62 },
  { id: 'translator', label: 'Traductor', icon: '🔁', status: 'empty', description: 'Traducción y glosado interlineal', x: 8, y: 50 },
  { id: 'workbench', label: 'Workbench', icon: '🛠️', status: 'empty', description: 'Cola de trabajo y completado', x: 92, y: 50 },
];

const EDGES = [
  { from: 'center', to: 'grammar', label: 'normas' },
  { from: 'center', to: 'phonology', label: 'sonido' },
  { from: 'center', to: 'syntax', label: 'estructura' },
  { from: 'center', to: 'lexicon', label: 'vocabulario' },
  { from: 'center', to: 'neography', label: 'grafía' },
  { from: 'center', to: 'semantics', label: 'sentido' },
  { from: 'center', to: 'translator', label: 'puente' },
  { from: 'center', to: 'workbench', label: 'flujo' },
];

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

const LanguageHomeCanvas: React.FC<LanguageHomeCanvasProps> = ({
  conlangName,
  activeModule,
  stats,
  onModuleClick,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const enrichedNodes = useMemo(() => {
    return MODULE_NODES.map((node) => {
      let status: ModuleNode['status'] = 'empty';
      const moduleStats = stats?.[node.id as keyof typeof stats];
      if (moduleStats) {
        const hasData = Object.values(moduleStats).some((v) => typeof v === 'number' && v > 0);
        if (hasData) status = 'partial';
      }
      if (node.id === 'lexicon' && moduleStats && typeof (moduleStats as any).entries === 'number' && (moduleStats as any).entries > 10) status = 'complete';
      if (node.id === 'grammar' && moduleStats && typeof (moduleStats as any).rules === 'number' && typeof (moduleStats as any).categories === 'number' && (moduleStats as any).rules > 0 && (moduleStats as any).categories > 0) status = 'complete';
      return { ...node, status };
    });
  }, [stats]);

  const handleNodeClick = useCallback((id: ModuleId) => {
    onModuleClick?.(id);
  }, [onModuleClick]);

  const centerX = 50;
  const centerY = 50;

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden">
      {/* SVG Edges */}
      <svg className="absolute inset-0 w-full h-full opacity-70 pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="homeEdgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
          </linearGradient>
          <marker id="homeArrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.5)" />
          </marker>
        </defs>
        {EDGES.map((edge) => {
          const targetNode = enrichedNodes.find((n) => n.id === edge.to);
          if (!targetNode) return null;
          const isActive = activeModule === edge.to;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={`${centerX}%`}
                y1={`${centerY}%`}
                x2={`${targetNode.x}%`}
                y2={`${targetNode.y}%`}
                stroke="url(#homeEdgeGradient)"
                strokeWidth={isActive ? 2.5 : 1.2}
                className={isActive ? 'text-accent' : 'text-white/20'}
                strokeDasharray={isActive ? 'none' : '4 4'}
                markerEnd="url(#homeArrowhead)"
              />
              <text
                x={`${(centerX + targetNode.x) / 2}%`}
                y={`${(centerY + targetNode.y) / 2}%`}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-all duration-500 ${isActive ? 'text-accent/80' : 'text-white/30'}`}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                {edge.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Central Language Node */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-accent/60 bg-accent/10 backdrop-blur-md px-8 py-6 shadow-[0_0_40px_rgba(99,102,241,0.15)] transition-all duration-700 pointer-events-auto"
        style={{ left: `${centerX}%`, top: `${centerY}%`, zIndex: 10 }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl">🌐</div>
          <div className="text-sm font-bold tracking-widest text-accent/90 uppercase">
            {conlangName || 'Sin nombre'}
          </div>
          <div className="text-[10px] text-white/50">Lengua central</div>
        </div>
      </div>

      {/* Module Nodes */}
      {enrichedNodes.map((node) => {
        const colors = STATUS_COLORS[node.status];
        const isActive = activeModule === node.id;
        const isHovered = hoveredNode === node.id;

        return (
          <div
            key={node.id}
            data-node-id={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all duration-500 pointer-events-auto cursor-pointer select-none ${
              colors.border
            } ${colors.bg} ${
              isActive
                ? `${colors.glow} scale-110 z-20`
                : isHovered
                ? 'scale-105 z-10'
                : 'scale-100 z-10'
            }`}
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              zIndex: isActive ? 20 : isHovered ? 10 : 5,
            }}
            onClick={() => handleNodeClick(node.id)}
            onPointerEnter={() => setHoveredNode(node.id)}
            onPointerLeave={() => setHoveredNode(null)}
            title={node.description}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{node.icon}</span>
              <div>
                <div className={`text-xs font-bold tracking-wide ${colors.text}`}>{node.label}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{node.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${STATUS_DOT[node.status]}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${STATUS_DOT[node.status]}`} />
              </span>
              <span className="text-[9px] text-white/40 capitalize">{node.status === 'complete' ? 'Completo' : node.status === 'partial' ? 'Parcial' : 'Vacío'}</span>
            </div>
          </div>
        );
      })}

      {/* Empty state hint */}
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

export default LanguageHomeCanvas;
