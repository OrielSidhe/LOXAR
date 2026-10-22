import { describe, it, expect } from 'vitest';
import {
  ROOT_NODE_ID,
  ROOT_NODES,
  ROOT_EDGES,
  DYNAMIC_NODE_PORTS,
  grammarNodeType,
  toRfEdges,
} from '../GraphCanvas';

/**
 * Gauntlet D — "El Árbol de Verdad".
 * Tests de contrato de datos para el canvas. No requieren renderizar React Flow:
 * validan la estructura que la UI consume (áram, puertos, flags de edge, unificación).
 */
describe('D1: Árbol jerárquico estrella en root', () => {
  it('ROOT_EDGES es un árbol estrella: todas las aristas salen de conlang-root', () => {
    expect(ROOT_EDGES.length).toBeGreaterThan(0);
    for (const e of ROOT_EDGES) {
      expect(e.from.node).toBe(ROOT_NODE_ID);
    }
  });

  it('cada módulo del árbol es hoja única (sin duados de root a root)', () => {
    const targets = ROOT_EDGES.map(e => e.to.node);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('todo módulo del árbol expone un puerto "in" para recibir la arista del root', () => {
    for (const n of ROOT_NODES) {
      expect(n.ports.some(p => p.id === 'in' && p.side === 'left'), `${n.id} needs an 'in' left port`).toBe(true);
    }
  });

  it('Workbench se dobla dentro del nodo Léxico (no es nodo raíz)', () => {
    const ids = ROOT_NODES.map(n => n.id);
    expect(ids).not.toContain('workbench');
    expect(ids).toContain('lexicon');
  });

  it('el árbol conecta con los 7 módulos de datos (workbench plegado)', () => {
    expect(ROOT_EDGES.length).toBe(7);
  });
});

describe('D2: Puertos nominales como Handles', () => {
  it('DYNAMIC_NODE_PORTS tiene in (left) y out (right) — base para handles nombrados', () => {
    expect(DYNAMIC_NODE_PORTS).toHaveLength(2);
    expect(DYNAMIC_NODE_PORTS.find(p => p.id === 'in')?.side).toBe('left');
    expect(DYNAMIC_NODE_PORTS.find(p => p.id === 'out')?.side).toBe('right');
  });

  it('ROOT_NODES módulos expresan puertos con ids nominales (no genéricos)', () => {
    for (const n of ROOT_NODES) {
      const ids = n.ports.map(p => p.id);
      expect(ids.length).toBeGreaterThan(0);
      // cada puerto tiene un id distintivo, no solo 'in'/'out' genéricos repetidos
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('D4/D5: Edges convertidos con flag estático', () => {
  it('toRfEdges marca edges estructurales como static:true y tipo deletable', () => {
    const rf = toRfEdges(ROOT_EDGES, true);
    expect(rf.length).toBe(ROOT_EDGES.length);
    for (const e of rf) {
      expect(e.type).toBe('deletable');
      expect(e.data?.static).toBe(true);
    }
  });

  it('toRfEdges respeta static:false para conexiones dinámicas', () => {
    const rf = toRfEdges(ROOT_EDGES, false);
    expect(rf.every(e => e.data?.static === false)).toBe(true);
  });

  it('las aristas del árbol referencian handles nominales (sourceHandle/targetHandle)', () => {
    const rf = toRfEdges(ROOT_EDGES, true);
    for (const e of rf) {
      expect(e.sourceHandle).toBeTruthy();
      expect(e.targetHandle).toBe('in');
    }
  });
});

describe('D6: Unificación de nodos Grammar Engine', () => {
  it('grammarNodeType=true para root "grammar" y dinámicos "dyn_grammar_*"', () => {
    expect(grammarNodeType('grammar')).toBe(true);
    expect(grammarNodeType('dyn_grammar_123')).toBe(true);
  });

  it('grammarNodeType=false para el resto de módulos', () => {
    expect(grammarNodeType('lexicon')).toBe(false);
    expect(grammarNodeType('phonology')).toBe(false);
    expect(grammarNodeType('dyn_lexicon_1')).toBe(false);
  });

  it('ROOT_NODES contiene un nodo grammar (usa GrammarEngineNodeComponent unificado)', () => {
    const g = ROOT_NODES.find(n => n.id === 'grammar');
    expect(g).toBeTruthy();
    expect(grammarNodeType(g!.id)).toBe(true);
  });
});
