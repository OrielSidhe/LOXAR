import React from 'react';

type TreeNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  status: 'complete' | 'partial' | 'empty';
  icon?: React.ReactNode;
  description?: string;
};

type LanguageTreeCanvasProps = {
  activeModule?: string;
  onNodeClick?: (nodeId: string) => void;
};

const NODES: TreeNode[] = [
  { id: 'phonology', label: 'Fonología', x: 50, y: 15, status: 'complete', description: 'Sonidos, inventario fonético y reglas fonotácticas' },
  { id: 'morphology', label: 'Morfología', x: 20, y: 35, status: 'partial', description: 'Afijos, flexión y formación de palabras' },
  { id: 'syntax', label: 'Sintaxis', x: 80, y: 35, status: 'partial', description: 'Estructura de oraciones y reglas gramaticales' },
  { id: 'lexicon', label: 'Léxico', x: 20, y: 60, status: 'complete', description: 'Entradas, raíces y significados' },
  { id: 'semantics', label: 'Semántica', x: 80, y: 60, status: 'empty', description: 'Significado, campos semánticos y relaciones' },
  { id: 'neography', label: 'Neografía', x: 50, y: 85, status: 'partial', description: 'Escritura, glifos y sistema de escritura' },
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

const LanguageTreeCanvas: React.FC<LanguageTreeCanvasProps> = ({ activeModule, onNodeClick }) => {
  const nodeMap = React.useMemo(() => {
    const map: Record<string, TreeNode> = {};
    NODES.forEach((n) => { map[n.id] = n; });
    return map;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* SVG Edges */}
      <svg className="absolute inset-0 w-full h-full opacity-60" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>
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
      </svg>

      {/* Nodes */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {NODES.map((node) => {
          const colors = STATUS_COLORS[node.status];
          const isActive = activeModule === node.id;

          return (
            <div
              key={node.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all duration-500 pointer-events-auto cursor-pointer ${colors.border} ${colors.bg} ${isActive ? `${colors.glow} scale-105` : 'hover:scale-105'}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
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
    </div>
  );
};

export default LanguageTreeCanvas;
