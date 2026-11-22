/* src/services/grammar/ast-builder.ts
 *
 * Utility that converts the legacy flat `ClauseFeatures` representation
 * used by the Grammar Tab into the new `ClauseAST` required by the
 * AST-enabled `realizeClause`.  The builder creates a tree where the
 * main verb (`verb` role) is the root and all participants
 * (subject, object, modifier, particle) become `dependents` of that
 * root.  This enables the later tree-walker to resolve modifiers,
 * independent particles, and chain-verb semantics.
 *
 * Keep this file lightweight - it only contains pure TypeScript
 * conversion logic, no side-effects.
 */
import type { ClauseAST, EditableClauseAST, EditableSyntaxNode } from './engineTypes';

/**
 * Lexema de entrada del builder. Acepta la forma canónica (`Raíz`/`Categoría`)
 * y la forma inglesa interna (`root`/`category`) que usan los tests y el editor.
 */
export interface BuildLexeme {
  root?: string;
  Raíz?: string;
  Categoría?: string;
  category?: string;
}

export interface BuildParticipant {
  role: string;
  lexeme: BuildLexeme;
  features: Record<string, string>;
  /** Subárbol pre-construido (cadenas verbales, calificadores anidados). */
  dependents?: BuildParticipant[];
}

/**
 * Converts the legacy flat `ClauseFeatures` (used in the Grammar Tab UI)
 * into a proper `ClauseAST` that can be fed to the AST-aware `realizeClause`.
 *
 * También soporta (Phase 3) la construcción directa de árboles más ricos
 * pasando participantes con `role: 'auxiliary_verb'` o con `dependents`
 * ya poblados (para cadenas verbales y calificadores anidados).
 *
 * @param participants flat array of participants as used by the UI
 * @returns a fresh ClauseAST whose root is the primary verb (conjugateRoot=true)
 */
export function buildClauseAST(participants: BuildParticipant[]): EditableClauseAST {
  // 1) Identify the main verb (the only entry with role 'verb' or 'root')
  const verbEntry = participants.find((p) => p.role === 'verb' || p.role === 'root');
  if (!verbEntry) throw new Error('No verb participant found in clause build');

  // 2) Create the root VerbNode
  const root: EditableSyntaxNode = {
    id: `v_${Date.now()}`,
    role: 'root',
    lexeme: {
      root: verbEntry.lexeme?.Raíz || verbEntry.lexeme?.root || 'unknown',
      category: 'verb',
    },
    features: { ...verbEntry.features },
    dependents: [],
    conjugateRoot: true,
    category: 'verb',
  };

  // 3) Helper to turn a participant into a generic node
  const makeNode = (role: string, entry: BuildParticipant): EditableSyntaxNode => {
    const categoryMap: Record<string, string> = {
      sustantivo: 'noun',
      adjetivo: 'adjective',
      partícula: 'particle',
      noun: 'noun',
      adjective: 'adjective',
      particle: 'particle',
      verb: 'verb',
    };
    const rawCat = entry.lexeme?.Categoría?.toLowerCase() || 'noun';
    const category = categoryMap[rawCat] || (role.includes('verb') ? 'verb' : 'noun');
    const node: EditableSyntaxNode = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role,
      lexeme: {
        root: entry.lexeme?.Raíz || entry.lexeme?.root || '',
        category,
      },
      features: { ...entry.features },
      dependents: [],
      conjugateRoot: role === 'auxiliary_verb' ? false : false,
      category,
    };
    // Si el participante ya trae dependents (árbol pre-construido), cópialos.
    if (Array.isArray(entry.dependents)) {
      node.dependents = entry.dependents.map((d) => makeNode(d.role, d));
    }
    return node;
  };

  // 4) Attach all other participants as dependents of the root
  participants.forEach((p) => {
    if (p.role === 'verb' || p.role === 'root') return; // skip the root itself
    root.dependents.push(makeNode(p.role, p));
  });

  // 5) Final ClauseAST wrapper
  return {
    clauseId: `clause_${Date.now()}`,
    root,
  };
}

/**
 * Boundary cast: el árbol editable permite roles/categorías de texto libre, así
 * que es un superconjunto estructural del `ClauseAST` del motor. El motor solo
 * lee `id`/`role`/`lexeme`/`dependents`/`features` como cadenas en runtime, por
 * lo que el cast es seguro y evita propagar `any` por los consumidores.
 */
export function toClauseAST(ast: EditableClauseAST): ClauseAST {
  return ast as unknown as ClauseAST;
}
