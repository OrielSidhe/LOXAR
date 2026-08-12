/* src/services/grammar/ast-view.ts
 *
 * Utility that extracts a pure diagram description from a ClauseAST.
 * The returned object is plain data:
 *   - nodes: [{ id, label, role, form, features? }]
 *   - edges: [{ fromId, toId }]
 * ready to be drawn by the canvas component (SyntaxCanvasAST).
 *
 * Keeping this separate means neither the canvas nor the builder depend
 * on React internals – they only consume plain data.
 */

export interface DiagramNode {
  id: string;
  label: string;
  role: string;
  form: string;
  features?: Record<string, string>;
}

export interface DiagramEdge {
  fromId: string;
  toId: string;
}

/**
 * Walk the AST and produce a node/edge list for visualization.
 * Every node becomes a diagram node; every dependent becomes an edge
 * from its parent to the child.
 */
export function astToDiagram(ast: any): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  const walk = (node: any, parentId?: string) => {
    if (!node) return;
    const id = node.id || `n_${Math.random().toString(36).slice(2, 9)}`;
    const label = node.lexeme?.root || node.lexeme?.Raíz || '?';
    nodes.push({
      id,
      label,
      role: node.role || 'unknown',
      form: node.form || label,
      features: node.features,
    });
    if (parentId) edges.push({ fromId: parentId, toId: id });

    const children = node.dependents || node.children || [];
    children.forEach((child: any) => walk(child, id));
  };

  if (ast?.root) walk(ast.root);
  return { nodes, edges };
}

/* ------------------------------------------------------------------ *
 * Editable-tree helpers
 *
 * The Árbol AST tab lets the user reshape the clause visually (add /
 * remove dependents, relabel nodes). These functions operate on the
 * same `ClauseAST` shape the engine consumes, so an edited tree can be
 * handed straight back to `realizeClause` without any translation layer.
 * Everything here is PURE: it returns new objects and never mutates the
 * input, keeping the editor reversible and the engine untouched.
 * ------------------------------------------------------------------ */

let astNodeCounter = 0;
function freshAstId(): string {
  astNodeCounter += 1;
  return `ast_${Date.now().toString(36)}_${astNodeCounter}`;
}

/** Deep clone a ClauseAST (structuredClone with a safe fallback). */
export function cloneClauseAST(ast: any): any {
  if (typeof structuredClone === 'function') return structuredClone(ast);
  return JSON.parse(JSON.stringify(ast));
}

/** Build a minimal SyntaxNode for a given role. */
export function makeNode(role: string, label: string): any {
  return {
    id: freshAstId(),
    role,
    lexeme: { root: label, category: guessCategory(role) },
    features: {},
    dependents: [],
  };
}

function guessCategory(role: string): 'verb' | 'noun' | 'adjective' | 'particle' {
  if (role === 'root' || role === 'auxiliary_verb') return 'verb';
  if (role === 'particle') return 'particle';
  if (role === 'modifier') return 'adjective';
  return 'noun';
}

/** Immutably add `child` as a dependent of the node identified by `parentId`. */
export function addDependent(ast: any, parentId: string, child: any): any {
  const next = cloneClauseAST(ast);
  const attach = (node: any): boolean => {
    if (!node) return false;
    if (node.id === parentId) {
      node.dependents = [...(node.dependents || []), child];
      return true;
    }
    return (node.dependents || []).some((d: any) => attach(d));
  };
  attach(next.root);
  return next;
}

/** Immutably remove the node identified by `nodeId` (and its subtree). */
export function removeNode(ast: any, nodeId: string): any {
  const next = cloneClauseAST(ast);
  const prune = (node: any): any => {
    if (!node) return node;
    node.dependents = (node.dependents || [])
      .filter((d: any) => d.id !== nodeId)
      .map((d: any) => prune(d));
    return node;
  };
  prune(next.root);
  return next;
}

/** Immutably update a node's label / role. */
export function updateNode(ast: any, nodeId: string, updates: { label?: string; role?: string }): any {
  const next = cloneClauseAST(ast);
  const walk = (node: any) => {
    if (!node) return;
    if (node.id === nodeId) {
      if (updates.label !== undefined) node.lexeme = { ...node.lexeme, root: updates.label };
      if (updates.role !== undefined) {
        node.role = updates.role;
        node.lexeme = { ...node.lexeme, category: guessCategory(updates.role) };
      }
    }
    (node.dependents || []).forEach(walk);
  };
  walk(next.root);
  return next;
}

/** Realize an edited tree back into a sentence using the engine. */
export function realizeEditedTree(ast: any, manifest: any): string {
  try {
    const result = realizeClause(ast, manifest);
    return result.sentence || '';
  } catch {
    return '';
  }
}

// Imported lazily to avoid a circular import at module-eval time.
import { realizeClause } from './syntax';
