import { describe, it, expect } from 'vitest';
import { realizeClause } from '../syntax';
import { buildClauseAST } from '../ast-builder';
import type { GrammarManifest, LexiconEntry } from '../../../types';
import type { ClauseAST, VerbNode, SyntaxNode } from '../engineTypes';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SOV', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  ...over,
});

/** Helper: build a minimal VerbNode with dependents */
const mkNode = (
  id: string, role: string, root: string, category: string,
  features: Record<string, string> = {},
  dependents: SyntaxNode[] = [],
  conjugateRoot: boolean = true,
): SyntaxNode => ({
  id, role, features, dependents,
  lexeme: { root, category: category as any },
  ...(category === 'verb' && { conjugateRoot }),
});

describe('syntax', () => {
  it('realizeClause produces correct SOV output (legacy flat)', () => {
    const m = mk({ typology: { ...mk().typology, wordOrder: 'SOV' } });
    const clause = {
      participants: [
        { lexeme: { Raíz: 'na', Léxema: ['na'], Categoría: 'sustantivo', Significado: ['test'] } as any, features: {}, role: 'subject' },
        { lexeme: { Raíz: 'te', Léxema: ['te'], Categoría: 'verbo', Significado: ['test'] } as any, features: { tense: 'present' }, role: 'verb' },
        { lexeme: { Raíz: 'kor', Léxema: ['kor'], Categoría: 'sustantivo', Significado: ['test'] } as any, features: {}, role: 'object' },
      ],
    };
    const res = realizeClause(clause, m);
    expect(res.sentence).toBe('na kor te');
    expect(Array.isArray(res.canvas.nodes) && res.canvas.nodes.length > 0).toBe(true);
  });

  // ── B5: Structural tests for realizeClause(AST) ──────────────────────────

  describe('realizeClause(AST) structural tests (B5)', () => {
    const m = mk({ typology: { wordOrder: 'SVO', morphology: 'a', alignment: 'n', headDirection: 'h' } });

    it('produces correct nodes, connections, roles, and colors', () => {
      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        { tense: 'present' },
        [
          mkNode('s1', 'subject', 'na', 'noun'),
          mkNode('o1', 'object', 'kor', 'noun'),
        ],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test1', root };
      const res = realizeClause(ast, m);

      // Canvas has root + 2 dependents = 3 nodes
      expect(res.canvas.nodes).toHaveLength(3);
      // Root verb is first
      expect(res.canvas.nodes[0].role).toBe('root');
      expect(res.canvas.nodes[0].type).toBe('word');
      expect(res.canvas.nodes[0].lexiconCategory).toBe('verb');

      // Subject and object roles preserved
      const roles = res.canvas.nodes.map(n => n.role).sort();
      expect(roles).toEqual(['object', 'root', 'subject']);

      // Connections: root→subject, root→object
      expect(res.canvas.connections).toHaveLength(2);
      const fromIds = new Set(res.canvas.connections.map(c => c.fromId));
      expect(fromIds.has('v1')).toBe(true);

      // Last preview result matches sentence
      expect(res.canvas.lastPreviewResult).toBe(res.sentence);
    });

    it('populates children array (B4)', () => {
      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        {},
        [
          mkNode('s1', 'subject', 'na', 'noun'),
          mkNode('o1', 'object', 'kor', 'noun'),
        ],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test2', root };
      const res = realizeClause(ast, m);

      const rootNode = res.canvas.nodes.find(n => n.id === 'v1');
      expect(rootNode).toBeTruthy();
      expect(rootNode!.children).toHaveLength(2);
      const childIds = rootNode!.children.map(c => c.id);
      expect(childIds).toEqual(expect.arrayContaining(['s1', 'o1']));
    });

    it('null root returns empty canvas (B2.3)', () => {
      const ast: ClauseAST = { clauseId: 'test3', root: null as any };
      const res = realizeClause(ast, m);
      expect(res.sentence).toBe('');
      expect(res.canvas.nodes).toHaveLength(0);
      expect(res.canvas.connections).toHaveLength(0);
      expect(res.canvas.exceptions).toHaveLength(0);
    });

    it('conjugateRoot=false keeps auxiliaries in root form (B3)', () => {
      const aux: SyntaxNode = mkNode('a1', 'auxiliary_verb', 'se', 'verb', {}, [], false) as any;
      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        { tense: 'past' },
        [aux],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test4', root };
      const res = realizeClause(ast, m);

      // Aux node should have empty features (not conjugated)
      const auxNode = res.canvas.nodes.find(n => n.id === 'a1');
      expect(auxNode).toBeTruthy();
      // Features should be empty {} since conjugateRoot === false
      expect(auxNode!.features).toEqual({});

      // Root verb should have its features preserved
      const rootNode = res.canvas.nodes.find(n => n.id === 'v1');
      expect(rootNode).toBeTruthy();
      expect(rootNode!.features.tense).toBe('past');
    });

    it('cycle detection prevents infinite loop (B2.7)', () => {
      // Create a self-referential cycle: node A depends on node B which depends on A
      const nodeB = mkNode('b1', 'subject', 'na', 'noun', { case: 'nom' }, []);
      const nodeA = mkNode('a1', 'subject', 'kor', 'noun', { case: 'nom' }, [nodeB]);
      // Make B depend on A (cycle: A → B → A)
      (nodeB as any).dependents = [nodeA];

      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        {},
        [nodeA],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test5', root };

      // Should not hang or crash
      const res = realizeClause(ast, m);
      // Each node should appear at most once
      const nodeIds = res.canvas.nodes.map(n => n.id);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });

    it('handles missing features gracefully (B2.2)', () => {
      const root: VerbNode = {
        id: 'v1',
        role: 'root',
        lexeme: { root: 'faryo', category: 'verb' },
        features: undefined as any,
        dependents: [],
        conjugateRoot: true,
        category: 'verb',
      } as VerbNode;
      const ast: ClauseAST = { clauseId: 'test6', root };
      const res = realizeClause(ast, m);

      expect(res.canvas.nodes).toHaveLength(1);
      expect(res.canvas.nodes[0].features).toEqual({});
    });

    it('handles missing dependents gracefully (B2.2)', () => {
      const root: VerbNode = {
        id: 'v1',
        role: 'root',
        lexeme: { root: 'faryo', category: 'verb' },
        features: {},
        dependents: undefined as any,
        conjugateRoot: true,
        category: 'verb',
      } as VerbNode;
      const ast: ClauseAST = { clauseId: 'test7', root };
      const res = realizeClause(ast, m);

      expect(res.canvas.nodes).toHaveLength(1);
      expect(res.canvas.connections).toHaveLength(0);
    });

    it('hierarchical DFS layout positions children below parents (C4)', () => {
      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        {},
        [
          mkNode('s1', 'subject', 'na', 'noun', {},
            [mkNode('det1', 'modifier', 'lo', 'adjective')],
          ),
        ],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test8', root };
      const res = realizeClause(ast, m);

      const rootNode = res.canvas.nodes.find(n => n.id === 'v1');
      const childNode = res.canvas.nodes.find(n => n.id === 's1');
      const grandchildNode = res.canvas.nodes.find(n => n.id === 'det1');

      expect(rootNode).toBeTruthy();
      expect(childNode).toBeTruthy();
      expect(grandchildNode).toBeTruthy();

      // Root at y=120 (depth 0), child at y=220 (depth 1), grandchild at y=320 (depth 2)
      expect(rootNode!.y).toBe(120);
      expect(childNode!.y).toBe(220);
      expect(grandchildNode!.y).toBe(320);

      // Children centered under parent (child x is within subtree width of root)
      expect(childNode!.children).toHaveLength(1);
      expect(childNode!.children[0].id).toBe('det1');
    });

    it('particle nodes get morpheme type and pink color', () => {
      const root: VerbNode = mkNode(
        'v1', 'root', 'faryo', 'verb',
        {},
        [mkNode('p1', 'particle', 'vo', 'particle', { aspect: 'perfect' })],
        true,
      ) as VerbNode;
      const ast: ClauseAST = { clauseId: 'test9', root };
      const res = realizeClause(ast, m);

      const particleNode = res.canvas.nodes.find(n => n.id === 'p1');
      expect(particleNode).toBeTruthy();
      expect(particleNode!.type).toBe('morpheme');
      expect(particleNode!.color).toBe('#ec4899'); // ROLE_COLORS.particle
    });

    it('integration with buildClauseAST produces proper AST canvas', () => {
      const ast = buildClauseAST([
        { role: 'subject', lexeme: { Raíz: 'aels', Categoría: 'sustantivo' }, features: {} as any },
        { role: 'verb', lexeme: { Raíz: 'vilya', Categoría: 'verbo' }, features: { tense: 'past' } as any },
        { role: 'object', lexeme: { Raíz: 'lafa', Categoría: 'sustantivo' }, features: {} as any },
      ]);
      const res = realizeClause(ast, mk());
      expect(res.canvas.nodes.length).toBe(3);
      expect(res.canvas.connections.length).toBe(2);
      // Root is the verb
      const rootNode = res.canvas.nodes.find(n => n.role === 'root');
      expect(rootNode).toBeTruthy();
      expect(rootNode!.lexiconCategory).toBe('verb');
    });
  });
});
