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
export interface BuildParticipant {
  role: string;
  lexeme: any;
  features: Record<string, string>;
}

export interface GenericNode {
  id: string;
  role: string;
  lexeme: { root: string; category: string };
  features: Record<string, string>;
  dependents: GenericNode[];
  conjugateRoot: boolean;
  category: string;
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
export function buildClauseAST(participants: BuildParticipant[]): any {
  // 1) Identify the main verb (the only entry with role 'verb' or 'root')
  const verbEntry = participants.find((p) => p.role === 'verb' || p.role === 'root');
  if (!verbEntry) throw new Error('No verb participant found in clause build');

  // 2) Create the root VerbNode
  const root: GenericNode = {
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
  const makeNode = (role: string, entry: BuildParticipant): GenericNode => {
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
    const node: GenericNode = {
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
    if (Array.isArray((entry as any).dependents)) {
      node.dependents = (entry as any).dependents.map((d: any) => makeNode(d.role, d));
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
