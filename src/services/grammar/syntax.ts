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

/**
 * Recorre el AST de forma recursiva y produce la superficie lineal de la cláusula.
 * Mantiene `realizeLexeme()` intacto para la morfología dura (afijos).
 *
 * Reglas implementadas (Phase 3):
 *  - Partículas preverbales independientes (isIndependentWord=true) se imprimen
 *    separadas por espacio INMEDIATAMENTE ANTES del verbo que modifican.
 *  - Cadenas verbales: los VerbNode con role 'auxiliary_verb' y conjugateRoot=false
 *    se dejan en raíz (sin features de conjugación); solo el root se conjuga.
 *  - Calificadores (role 'modifier') se resuelven recursivamente como dependents
 *    del núcleo al que modifican (sujeto/objeto/verbo).
 */
const linearizeAst = (root: VerbNode, manifest: GrammarManifest): string => {
  // 1) Partículas preverbales independientes se imprimen ANTES del verbo.
  const preParticles = root.dependents.filter(
    (d): d is ParticleNode => d.role === 'particle' && (d as ParticleNode).isIndependentWord
  );
  const particlePrefix = preParticles
    .map((p) => p.lexeme.root)
    .join(' ');

  // 2) El verbo principal se conjuga; los auxiliares (cadena) quedan en raíz.
  const verbEntry: LexiconEntry = {
    ID: root.id, Raíz: root.lexeme.root, Léxema: [root.lexeme.root],
    Categoría: 'verbo', Significado: [root.lexeme.root], extraData: {},
  } as LexiconEntry;
  const verbSF = realizeLexeme(
    verbEntry,
    root.conjugateRoot ? root.features : {},
    manifest
  );

  // 3) Resolución recursiva de un nodo cualquiera (sujeto/objeto/modificador/auxiliar).
  const linearOf = (node: SyntaxNode): string => {
    const catMap: Record<string, string> = { verb: 'verbo', noun: 'sustantivo', adjective: 'adjetivo', particle: 'partícula' };
    const category = catMap[node.lexeme.category] || 'sustantivo';

    // VerbNode auxiliar en cadena: NO conjugar (dejar en raíz).
    if (node.role === 'auxiliary_verb') {
      const bare = node.lexeme.root; // raíz pura, sin conjugar
      const childBits = node.dependents.map(linearOf);
      return [bare, ...childBits].join(' ').trim();
    }

    const entry: LexiconEntry = {
      ID: node.id, Raíz: node.lexeme.root, Léxema: [node.lexeme.root],
      Categoría: category, Significado: [node.lexeme.root], extraData: {},
    } as LexiconEntry;
    const sf = realizeLexeme(entry, node.features, manifest);
    const childBits = node.dependents.map(linearOf);
    return [sf.form, ...childBits].join(' ').trim();
  };

  // 4) Sujeto / objeto / modificadores como dependents del root.
  const argumentsBits = root.dependents
    .filter((d) => d.role === 'subject' || d.role === 'object' || d.role === 'modifier')
    .map(linearOf);

  // 4b) Verbos auxiliares en cadena (se dejan en raíz, antes del verbo principal).
  const auxBits = root.dependents
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
      const subj = root.dependents.find((d) => d.role === 'subject');
      if (subj) pieces.push(linearOf(subj));
    } else if (slot === 'O') {
      const obj = root.dependents.find((d) => d.role === 'object');
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

const CAT_MAP: Record<string, string> = {
  verb: 'verbo',
  noun: 'sustantivo',
  adjective: 'adjetivo',
  particle: 'partícula',
};

const buildAstCanvas = (
  root: VerbNode,
  manifest: GrammarManifest
): { nodes: CanvasNode[]; connections: CanvasConnection[] } => {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];
  let counter = 0;

  const walk = (node: SyntaxNode, parentId: string | null, depth: number) => {
    const nodeId = node.id || `ast_${counter++}`;
    const category = CAT_MAP[node.lexeme.category] || 'sustantivo';
    const entry: LexiconEntry = {
      ID: nodeId, Raíz: node.lexeme.root, Léxema: [node.lexeme.root],
      Categoría: category, Significado: [node.lexeme.root], extraData: {},
    } as LexiconEntry;

    // Root verb is conjugated; auxiliaries and particles stay in root form.
    const feat = node.role === 'auxiliary_verb' || node.lexeme.category === 'particle'
      ? {} : node.features;
    const sf = realizeLexeme(entry, feat, manifest);

    const role = node.role || 'root';
    const nodeType = node.lexeme.category === 'particle' ? 'morpheme' : 'word';

    nodes.push({
      id: nodeId,
      type: nodeType,
      role,
      label: sf.form,
      x: 0,
      y: depth * 100 + 120,
      children: [],
      lexiconCategory: node.lexeme.category,
      literalForm: sf.form,
      color: ROLE_COLORS[role] || '#6366f1',
      lexeme: entry,
      features: node.features,
      morphemes: sf.segments,
    });

    if (parentId) {
      connections.push({
        id: `conn_${counter++}`,
        fromId: parentId,
        toId: nodeId,
        connectionType: 'dependency',
      });
    }

    for (const child of node.dependents) {
      walk(child, nodeId, depth + 1);
    }
  };

  walk(root, null, 0);

  // Horizontal layout: distribute nodes at each depth evenly across canvas.
  const depthGroups: Record<number, CanvasNode[]> = {};
  for (const n of nodes) {
    const depth = n.y === 120 ? 0 : Math.round((n.y - 120) / 100);
    (depthGroups[depth] ||= []).push(n);
  }

  for (const depthStr in depthGroups) {
    const depth = Number(depthStr);
    const group = depthGroups[depth];
    const margin = depth === 0 ? 0 : 40;
    const canvasWidth = 760;
    const spacing = group.length > 1
      ? (canvasWidth - 2 * margin) / (group.length - 1)
      : 0;
    group.forEach((n, i) => {
      n.x = margin + i * spacing;
    });
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
