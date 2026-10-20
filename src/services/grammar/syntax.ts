import type {
  GrammarManifest,
  LexiconEntry,
  SyntaxNode as CanvasNode,
  SyntaxConnection as CanvasConnection,
} from '../../types';
import type {
  ClauseFeatures,
  ClauseAST,
  RealizeClauseResult,
  SyntaxNode,
  VerbNode,
  ParticleNode,
} from './engineTypes';
import { realizeLexeme } from './morphology';

const ROLE_ORDER: Record<string, string> = { S: 'subject', V: 'verb', O: 'object' };

// ──── Shared category + conjugateRoot helpers ────────────────────
// Deduplicated: linearizeAst used to define its own inline catMap (Finding 1.2).
const CAT_MAP: Record<string, string> = {
  verb: 'verbo', noun: 'sustantivo', adjective: 'adjetivo', particle: 'partícula',
};

/**
 * Recorre el AST de forma recursiva y produce la superficie lineal de la cláusula.
 * Mantiene `realizeLexeme()` intacto para la morfología dura (afijos).
 *
 * Guard B2: null/undefined root, missing lexeme, missing dependents,
 *           missing features — all guarded with optional chaining.
 * Guard B2.7: cycle detection via visited Set.
 *
 * Reglas implementadas (Phase 3):
 *  - Partículas preverbales independientes (isIndependentWord=true) se imprimen
 *    separadas por espacio INMEDIATAMENTE ANTES del verbo que modifican.
 *  - Cadenas verbales: los VerbNode con role 'auxiliary_verb' y conjugateRoot=false
 *    se dejan en raíz (sin features de conjugación); solo el root se conjuga.
 *  - Calificadores (role 'modifier') se resuelven recursivamente como dependents
 *    del núcleo al que modifican (sujeto/objeto/verbo).
 */
const linearizeAst = (root: VerbNode | null | undefined, manifest: GrammarManifest): string => {
  // B2.3: guard against null/undefined root
  if (!root || !root.lexeme || !root.lexeme.root) return '';

  // B2.7: cycle detection
  const visited = new Set<string>();

  // 1) Partículas preverbales independientes se imprimen ANTES del verbo.
  const preParticles = (root.dependents ?? []).filter(
    (d): d is ParticleNode => d.role === 'particle' && (d as ParticleNode).isIndependentWord
  );
  const particlePrefix = preParticles
    .map((p) => p.lexeme.root)
    .join(' ');

  // 2) El verbo principal se conjuga; los auxiliares (cadena) quedan en raíz.
  // B3: use conjugateRoot flag (not role heuristic) — matches buildAstCanvas.
  const verbEntry: LexiconEntry = {
    ID: root.id, Raíz: root.lexeme.root, Léxema: [root.lexeme.root],
    Categoría: 'verbo', Significado: [root.lexeme.root], extraData: {},
  } as LexiconEntry;
  const verbSF = realizeLexeme(
    verbEntry,
    root.conjugateRoot ? (root.features ?? {}) : {},
    manifest
  );

  // 3) Resolución recursiva de un nodo cualquiera (sujeto/objeto/modificador/auxiliar).
  const linearOf = (node: SyntaxNode | null | undefined): string => {
    if (!node || !node.lexeme) return '';
    if (visited.has(node.id)) return '';  // B2.7: cycle break
    visited.add(node.id);

    const category = CAT_MAP[node.lexeme.category] || 'sustantivo';

    // VerbNode auxiliar en cadena: NO conjugar (dejar en raíz).
    if (node.role === 'auxiliary_verb') {
      const bare = node.lexeme.root; // raíz pura, sin conjugar
      const childBits = (node.dependents ?? []).map(linearOf);
      return [bare, ...childBits].join(' ').trim();
    }

    const entry: LexiconEntry = {
      ID: node.id, Raíz: node.lexeme.root, Léxema: [node.lexeme.root],
      Categoría: category, Significado: [node.lexeme.root], extraData: {},
    } as LexiconEntry;
    // B2.2: guard node.features undefined
    const sf = realizeLexeme(entry, node.features ?? {}, manifest);
    const childBits = (node.dependents ?? []).map(linearOf);
    return [sf.form, ...childBits].join(' ').trim();
  };

  // 4) Sujeto / objeto / modificadores como dependents del root.
  const rootDeps = root.dependents ?? [];
  const argumentsBits = rootDeps
    .filter((d) => d.role === 'subject' || d.role === 'object' || d.role === 'modifier')
    .map(linearOf);

  // 4b) Verbos auxiliares en cadena (se dejan en raíz, antes del verbo principal).
  const auxBits = rootDeps
    .filter((d) => d.role === 'auxiliary_verb')
    .map(linearOf);

  // 5) Orden topológico dictado por la tipología del manifiesto.
  const order = ((manifest.typology?.wordOrder) || 'SVO').toUpperCase().replace('LIBRE', 'SVO').replace('FREE', 'SVO');
  const slots = (order.match(/[SVO]/g) || ['S', 'V', 'O']);

  const pieces: string[] = [];
  for (const slot of slots) {
    if (slot === 'V') {
      if (particlePrefix) pieces.push(particlePrefix);
      // Auxiliares primero (cadena: TIET Vlent DWA), luego el verbo principal conjugado.
      pieces.push(...auxBits);
      pieces.push(verbSF.form);
    } else if (slot === 'S') {
      const subj = rootDeps.find((d) => d.role === 'subject');
      if (subj) pieces.push(linearOf(subj));
    } else if (slot === 'O') {
      const obj = rootDeps.find((d) => d.role === 'object');
      if (obj) pieces.push(linearOf(obj));
    }
  }
  // Cualquier argumento no colocado explícitamente se anexa al final.
  for (const bit of argumentsBits) {
    if (bit && !pieces.includes(bit)) pieces.push(bit);
  }
  return pieces.join(' ').trim();
};

const ROLE_COLORS: Record<string, string> = {
  root: '#6366f1',
  subject: '#3b82f6',
  object: '#10b981',
  modifier: '#f59e0b',
  particle: '#ec4899',
  auxiliary_verb: '#8b5cf6',
  clitic: '#06b6d2',
  connector: '#6b7280',
};

const X_STEP = 200;

const treeWidth = (node: CanvasNode): number => {
  if (!node.children || node.children.length === 0) return X_STEP;
  return Math.max(X_STEP, node.children.reduce((sum, c) => sum + treeWidth(c), 0));
};

/**
 * Consolidated AST→canvas walker (B4).
 * B2   — null-guards node, dependents, features; cycle detection via visited Set
 * B3   — uses `VerbNode.conjugateRoot` instead of the `role` heuristic
 * B4   — populates `children` array with actual child nodes + single unified walker
 * C4   — hierarchical depth-first tree layout (children centered under parent)
 */
const buildAstCanvas = (
  root: VerbNode | null | undefined,
  manifest: GrammarManifest
): { nodes: CanvasNode[]; connections: CanvasConnection[] } => {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];
  let counter = 0;
  const visited = new Set<string>();

  const buildNode = (node: SyntaxNode | null | undefined, parentId: string | null, depth: number): CanvasNode | null => {
    // B2.3 / B2.7: null guard + cycle detection
    if (!node) return null;
    const nodeId = node.id || `ast_${counter++}`;
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const lex = node.lexeme ?? ({} as any);
    const category = CAT_MAP[lex.category ?? ''] || 'sustantivo';
    const entry: LexiconEntry = {
      ID: nodeId, Raíz: lex.root ?? '', Léxema: [lex.root ?? ''],
      Categoría: category, Significado: [lex.root ?? ''], extraData: {},
    } as LexiconEntry;

    // B3: use conjugateRoot flag. Root verb conjugates only if conjugateRoot !== false.
    //     Auxiliaries and particles stay in root form (no conjugation).
    const isVerb = lex.category === 'verb';
    const vn = node as VerbNode;
    const shouldConjugate = isVerb && vn.conjugateRoot !== false;
    const feat = shouldConjugate ? (node.features ?? {}) : {};
    const sf = realizeLexeme(entry, feat, manifest);

    const role = node.role || 'root';
    const nodeType = lex.category === 'particle' ? 'morpheme' : 'word';

    const canvasNode: CanvasNode = {
      id: nodeId,
      type: nodeType,
      role,
      label: sf.form,
      x: 0,
      y: depth * 100 + 120,
      children: [],
      lexiconCategory: lex.category ?? '',
      literalForm: sf.form,
      color: ROLE_COLORS[role] || '#6366f1',
      lexeme: entry,
      features: node.features ?? {},
      morphemes: sf.segments,
    };
    nodes.push(canvasNode);

    if (parentId) {
      connections.push({
        id: `conn_${counter++}`,
        fromId: parentId,
        toId: nodeId,
        connectionType: 'dependency',
      });
    }

    // B4: populate children with actual child nodes
    for (const child of (node.dependents ?? [])) {
      const childNode = buildNode(child, nodeId, depth + 1);
      if (childNode) canvasNode.children.push(childNode);
    }
    return canvasNode;
  };

  const rootNode = buildNode(root, null, 0);

  // C4: Hierarchical depth-first tree layout — children centered under parent
  if (rootNode) {
    const layoutDFS = (node: CanvasNode, x: number, depth: number) => {
      node.x = x;
      node.y = 120 + depth * 100;
      if (!node.children || node.children.length === 0) return;
      const totalWidth = treeWidth(node);
      let cursor = x;
      for (const child of node.children) {
        const cw = treeWidth(child);
        const childX = cursor + (cw - X_STEP) / 2;
        layoutDFS(child, childX, depth + 1);
        cursor += cw;
      }
    };
    layoutDFS(rootNode, 40, 0);
  }

  return { nodes, connections };
};

export const realizeClause = (
  clause: ClauseFeatures | ClauseAST,
  manifest: GrammarManifest
): RealizeClauseResult => {
  // --- Fallback: lista plana legacy (ClauseFeatures) ---
  if (!('root' in clause)) {
    const order = ((manifest.typology?.wordOrder) || 'SVO').toUpperCase().replace('LIBRE', 'SVO').replace('FREE', 'SVO');
    const tokens = (order.match(/[SVO]/g) || ['S', 'V', 'O']);
    const nodes = clause.participants.map((p, i) => {
      const sf = realizeLexeme(p.lexeme, p.features, manifest);
      return {
        id: `n${i}`,
        type: 'word' as const,
        role: p.role,
        label: sf.form,
        x: 60 + i * 240,
        y: 120,
        children: [],
        lexiconCategory: p.lexeme.Categoría,
        literalForm: sf.form,
        color: '#6366f1',
        lexeme: p.lexeme,
        features: p.features,
        morphemes: sf.segments,
      };
    });
    const ordered = tokens
      .map((t) => nodes.find((n) => ROLE_ORDER[t] === n.role))
      .filter(Boolean) as typeof nodes;
    const sentence = ordered.map((n) => n.label).join(' ');
    const canvas = {
      level: 1 as const,
      typologySelected: true,
      nodes: ordered,
      connections: [],
      exceptions: [],
      lastPreviewResult: sentence,
    };
    return { sentence, canvas };
  }

  // --- Nuevo camino: AST ---
  // B2.3: guard against null root — return an empty canvas instead of crashing
  if (!clause.root) {
    return {
      sentence: '',
      canvas: {
        level: 1 as const,
        typologySelected: true,
        nodes: [],
        connections: [],
        exceptions: [],
        lastPreviewResult: '',
      },
    };
  }
  const sentence = linearizeAst(clause.root, manifest);
  const { nodes, connections } = buildAstCanvas(clause.root, manifest);
  const canvas = {
    level: 1 as const,
    typologySelected: true,
    nodes,
    connections,
    exceptions: [] as any[],
    lastPreviewResult: sentence,
  };
  return { sentence, canvas };
};
