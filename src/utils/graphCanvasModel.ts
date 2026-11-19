/**
 * graphCanvasModel.ts
 * ───────────────────
 * Modelo puro del GraphCanvas de LOXAR: tipos de dominio, grafos de nivel
 * (root / grammar / lexicon), conversión a nodos y aristas de React Flow y
 * utilidades de presentación de nodos.
 *
 * No contiene componentes ni estado de UI: el `.tsx` es el orquestador de
 * estado y render, y re-exporta estos símbolos para no tocar los tests.
 */

import { Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';

// ── Types ──────────────────────────────────────────────
export type LevelId = 'root' | 'grammar' | 'lexicon' | 'syntax';

export type NodePort = { id: string; label: string; side: 'left' | 'right'; color?: string };

/** Tipos de módulo arrastrables desde la paleta (logo compartido con ModulePalette). */
export type ModuleNodeType =
  | 'grammar'
  | 'syntax'
  | 'lexicon'
  | 'phonology'
  | 'morphology'
  | 'semantics'
  | 'neography'
  | 'translator';

export type GraphNode = {
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
  /** D3: módulos que son PANTALLA (acción de navegación) viven como botón, no como nodo de datos. */
  isScreen?: boolean;
};

export type GraphEdge = {
  from: { node: string; port: string };
  to: { node: string; port: string };
  label?: string;
  color?: string;
};

/** Estado del motor pragmático (para mostrar datos reales en GrammarNode). */
export type PragmaticEngineState = {
  typologyLabel?: string;
  rulesCount?: number;
  alignment?: string;
  wordOrder?: string;
  headDirection?: string;
  activeClauseType?: string | null;
};

export interface NodeCallbacks {
  activeModule?: string;
  onModuleClick?: (id: string) => void;
  onNavigate?: (tab: string) => void;
  onZoom?: (nodeId: string) => void;
  level: LevelId;
  pragmaticEngine?: PragmaticEngineState;
  onZoomToGrammar?: () => void;
}

/** Default ports for dynamically created nodes (dragged from palette).
 *  A1 fix: must include BOTH 'in' (left) and 'out' (right) so that
 *  ModuleNodeComponent renders both Handle source + Handle target. */
export const DYNAMIC_NODE_PORTS: NodePort[] = [
  { id: 'in', label: 'In', side: 'left', color: 'cyan' },
  { id: 'out', label: 'Out', side: 'right', color: 'cyan' },
];

// ── Level Data ─────────────────────────────────────────
/** ID del nodo raíz del conlang (centrado del árbol). */
export const ROOT_NODE_ID = 'conlang-root';

/** Árbol estrella: conlang-root → cada módulo de datos (D1).
 *  Los módulos PANTALLA (workbench) están plegados como botones dentro de su
 *  nodo padre (D3), por lo que no aparecen como hijos del árbol. */
export const ROOT_NODES: GraphNode[] = [
  { id: 'grammar',    label: 'Gramática',  icon: '📐', x: 500, y: 20,  w: 260, h: 140, level: 'root', status: 'partial', description: 'Motor gramatical', ports: [{ id: 'in', label: 'Root', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syntax', side: 'right', color: 'cyan' }], stats: [{ label: 'Reglas', value: 0 }] },
  { id: 'phonology',  label: 'Fonología',  icon: '🔊', x: 120, y: 180, w: 240, h: 120, level: 'root', status: 'empty', description: 'Inventario fonético', ports: [{ id: 'in', label: 'Phon In', side: 'left', color: 'cyan' }, { id: 'out', label: 'Phon Out', side: 'right', color: 'cyan' }] },
  { id: 'syntax',     label: 'Sintaxis',   icon: '🧩', x: 860, y: 180, w: 240, h: 120, level: 'root', status: 'empty', description: 'Estructura oracional', ports: [{ id: 'in', label: 'Gram In', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syntax', side: 'right', color: 'cyan' }] },
  { id: 'lexicon',    label: 'Léxico',     icon: '📚', x: 120, y: 400, w: 240, h: 120, level: 'root', status: 'empty', description: 'Diccionario', ports: [{ id: 'in', label: 'Morph', side: 'left', color: 'purple' }, { id: 'out', label: 'Lex Out', side: 'right', color: 'purple' }] },
  { id: 'neography',  label: 'Neografía',  icon: '✍️', x: 860, y: 400, w: 240, h: 120, level: 'root', status: 'empty', description: 'Sistema de escritura', ports: [{ id: 'in', label: 'Surface', side: 'left', color: 'cyan' }] },
  { id: 'semantics',  label: 'Semántica',  icon: '💡', x: 300, y: 580, w: 240, h: 120, level: 'root', status: 'empty', description: 'Campos semánticos', ports: [{ id: 'in', label: 'Syntax', side: 'left', color: 'cyan' }] },
  { id: 'translator', label: 'Traductor',  icon: '🔁', x: 680, y: 580, w: 240, h: 120, level: 'root', status: 'empty', description: 'Traducción', ports: [{ id: 'in', label: 'Lex', side: 'left', color: 'purple' }] },
];

/**
 * D1: árbol estrella. Cada arista va de conlang-root (fuente) a un módulo (sumidero 'in').
 * El sourceHandle indica el lado de anclaje del nodo central según la posición del módulo.
 */
export const ROOT_EDGES: GraphEdge[] = [
  { from: { node: ROOT_NODE_ID, port: 'right' }, to: { node: 'grammar',    port: 'in' }, label: 'grammar',    color: 'cyan' },
  { from: { node: ROOT_NODE_ID, port: 'left' },  to: { node: 'phonology',  port: 'in' }, label: 'phonology',  color: 'cyan' },
  { from: { node: ROOT_NODE_ID, port: 'right' }, to: { node: 'syntax',     port: 'in' }, label: 'syntax',     color: 'cyan' },
  { from: { node: ROOT_NODE_ID, port: 'left' },  to: { node: 'lexicon',    port: 'in' }, label: 'lexical',    color: 'purple' },
  { from: { node: ROOT_NODE_ID, port: 'bottom' }, to: { node: 'neography', port: 'in' }, label: 'surface',    color: 'cyan' },
  { from: { node: ROOT_NODE_ID, port: 'bottom' }, to: { node: 'semantics', port: 'in' }, label: 'semantics',  color: 'purple' },
  { from: { node: ROOT_NODE_ID, port: 'bottom' }, to: { node: 'translator', port: 'in' }, label: 'translation', color: 'cyan' },
];

export const GRAMMAR_NODES: GraphNode[] = [
  { id: 'phonology',  label: 'Fonología',  icon: '🔊', x: 120, y: 100, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Inventario, fonotáctica', ports: [{ id: 'out', label: 'Phon Out', side: 'right', color: 'cyan' }] },
  { id: 'typology',   label: 'Tipología',  icon: '🧬', x: 400, y: 100, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Tipo morfológico', ports: [{ id: 'in', label: 'Phon', side: 'left', color: 'cyan' }, { id: 'out', label: 'Typ Out', side: 'right', color: 'cyan' }] },
  { id: 'morphology', label: 'Morfología', icon: '🔧', x: 120, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Afijos, reglas', ports: [{ id: 'in', label: 'Typ', side: 'left', color: 'cyan' }, { id: 'out', label: 'Morph', side: 'right', color: 'cyan' }] },
  { id: 'syntax',     label: 'Sintaxis',   icon: '🧩', x: 400, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Estructura oracional', ports: [{ id: 'in', label: 'Morph', side: 'left', color: 'cyan' }, { id: 'out', label: 'Syn', side: 'right', color: 'cyan' }] },
  { id: 'semantics',  label: 'Semántica',  icon: '💡', x: 680, y: 280, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Campos semánticos', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'purple' }] },
  { id: 'roles',      label: 'Roles',      icon: '🎭', x: 120, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Roles sintácticos', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'cyan' }, { id: 'out', label: 'Roles', side: 'right', color: 'cyan' }] },
  { id: 'strategies', label: 'Estrategias', icon: '⚙️', x: 400, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Estrategias morfosintácticas', ports: [{ id: 'in', label: 'Roles', side: 'left', color: 'cyan' }, { id: 'out', label: 'Strat', side: 'right', color: 'cyan' }] },
  { id: 'pragmatic',  label: 'Pragmática', icon: '🧭', x: 680, y: 460, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Intención de oración', ports: [{ id: 'in', label: 'Syn', side: 'left', color: 'purple' }] },
  { id: 'notes',      label: 'Notas',      icon: '📝', x: 400, y: 640, w: 220, h: 110, level: 'grammar', status: 'empty', description: 'Anotaciones', ports: [{ id: 'in', label: 'Strat', side: 'left', color: 'cyan' }] },
];

export const GRAMMAR_EDGES: GraphEdge[] = [
  { from: { node: 'phonology', port: 'out' }, to: { node: 'typology', port: 'in' }, color: 'cyan' },
  { from: { node: 'typology', port: 'out' }, to: { node: 'morphology', port: 'in' }, color: 'cyan' },
  { from: { node: 'morphology', port: 'out' }, to: { node: 'syntax', port: 'in' }, color: 'cyan' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'semantics', port: 'in' }, color: 'purple' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'roles', port: 'in' }, color: 'cyan' },
  { from: { node: 'roles', port: 'out' }, to: { node: 'strategies', port: 'in' }, color: 'cyan' },
  { from: { node: 'syntax', port: 'out' }, to: { node: 'pragmatic', port: 'in' }, color: 'purple' },
  { from: { node: 'strategies', port: 'out' }, to: { node: 'notes', port: 'in' }, color: 'cyan' },
];

export const LEXICON_NODES: GraphNode[] = [
  { id: 'wordtypes', label: 'Tipos de palabra', icon: '🏷️', x: 120, y: 100, w: 240, h: 120, level: 'lexicon', status: 'partial', description: 'Sustantivo, verbo, adjetivo...', ports: [{ id: 'out', label: 'Types', side: 'right', color: 'cyan' }], stats: [{ label: 'Tipos', value: 10 }] },
  { id: 'roots',     label: 'Raíces',          icon: '🌱', x: 420, y: 100, w: 240, h: 120, level: 'lexicon', status: 'empty', description: 'Raíces léxicas', ports: [{ id: 'in', label: 'Types', side: 'left', color: 'cyan' }, { id: 'out', label: 'Roots', side: 'right', color: 'cyan' }] },
  { id: 'entries',   label: 'Entradas',        icon: '📖', x: 720, y: 100, w: 240, h: 120, level: 'lexicon', status: 'empty', description: 'Entradas del diccionario', ports: [{ id: 'in', label: 'Roots', side: 'left', color: 'cyan' }, { id: 'out', label: 'Out', side: 'right', color: 'cyan' }], stats: [{ label: 'Entradas', value: 0 }] },
  // D3: Importar/Exportar es una PANTALLA → botón, no nodo de datos.
  { id: 'import', label: 'Importar/Exportar', icon: '📦', x: 420, y: 300, w: 240, h: 100, level: 'lexicon', status: 'empty', description: 'Importar y exportar datos', isScreen: true, ports: [{ id: 'in', label: 'Data', side: 'left', color: 'purple' }] },
];

export const LEXICON_EDGES: GraphEdge[] = [
  { from: { node: 'wordtypes', port: 'out' }, to: { node: 'roots', port: 'in' }, color: 'cyan' },
  { from: { node: 'roots', port: 'out' }, to: { node: 'entries', port: 'in' }, color: 'cyan' },
  { from: { node: 'entries', port: 'out' }, to: { node: 'import', port: 'in' }, label: 'data', color: 'purple' },
];

// ── Helpers ────────────────────────────────────────────
export const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  complete: { border: 'border-emerald-400/60', bg: 'bg-emerald-500/10', text: 'text-emerald-300', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]' },
  partial: { border: 'border-amber-400/60', bg: 'bg-amber-500/10', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]' },
  empty: { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white/60', glow: 'shadow-none' },
};

export const STATUS_DOT: Record<string, string> = {
  complete: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  partial: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  empty: 'bg-white/40',
};

// ── Module labels for palette-created nodes ────────────
export const MODULE_LABELS: Record<ModuleNodeType, { label: string; icon: string; description: string }> = {
  grammar:    { label: 'Gramática',  icon: '📐', description: 'Motor gramatical' },
  syntax:     { label: 'Sintaxis',   icon: '🧩', description: 'Estructura oracional' },
  lexicon:    { label: 'Léxico',     icon: '📚', description: 'Diccionario' },
  phonology:  { label: 'Fonología',  icon: '🔊', description: 'Inventario fonético' },
  morphology: { label: 'Morfología', icon: '🔧', description: 'Afijos y reglas de formación' },
  semantics:  { label: 'Semántica',  icon: '💡', description: 'Campos semánticos' },
  neography:  { label: 'Neografía',  icon: '✍️', description: 'Sistema de escritura' },
  translator: { label: 'Traductor',  icon: '🔁', description: 'Traducción y corpus' },
};

// ── React Flow conversion helpers ─────────────────────
/** D6: 'grammar' (root) and dinámicos 'dyn_grammar_*' usan el mismo
 *  GrammarEngineNodeComponent → un solo sistema de nodos. */
export const grammarNodeType = (id: string): boolean => id === 'grammar' || id.startsWith('dyn_grammar_');

export const toRfNodes = (src: GraphNode[], callbacks: NodeCallbacks): Node[] =>
  src.map(n => ({
    id: n.id,
    type: grammarNodeType(n.id) ? 'grammarNode' : 'moduleNode',
    data: { node: n, ...callbacks },
    position: { x: n.x, y: n.y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    connectable: true,
  }));

/** B3-B4: Override hardcoded node `stats` with real values from the stats prop. */
export function withStats(nodes: GraphNode[], statMap: Record<string, { label: string; value: string | number }[]>): GraphNode[] {
  return nodes.map(n => {
    if (statMap[n.id]) {
      return { ...n, stats: statMap[n.id], status: statMap[n.id].some(s => Number(s.value) > 0) ? 'partial' : n.status };
    }
    return n;
  });
}

/** D1/D4: edges marcados como `static` son estructurales (no eliminables) y
 *  preservados por la regeneración de nivel; las dinámicas (user-drawn) no lo son. */
export const toRfEdges = (src: GraphEdge[], isStatic = true): Edge[] =>
  src.map((e, i) => ({
    id: `e-${e.from.node}-${e.to.node}-${i}`,
    type: 'deletable',
    source: e.from.node,
    target: e.to.node,
    sourceHandle: e.from.port,
    targetHandle: e.to.port,
    label: e.label,
    animated: true,
    data: { color: e.color, static: isStatic },
    style: { stroke: e.color === 'purple' ? '#a855f7' : '#00f0ff' },
  }));

// ── Utility ────────────────────────────────────────────
export const safeShortId = (id: string): string => {
  const m = id.match(/^(\w{0,3})\w*/);
  return (m?.[1] ?? id.slice(0, 3)).toUpperCase();
};
