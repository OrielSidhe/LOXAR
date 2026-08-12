/* Tests for the editable-tree helpers in ast-view.ts.
 * Verifies that add/remove/update operations on a ClauseAST are pure
 * (immutable) and that a reshaped tree re-realizes via the engine.
 */

import { describe, it, expect } from 'vitest';
import {
  addDependent,
  removeNode,
  updateNode,
  cloneClauseAST,
  realizeEditedTree,
} from '../ast-view';
import { buildClauseAST } from '../ast-builder';
import { realizeClause } from '../syntax';
import type { GrammarManifest } from '../../../types';

function makeParticipants() {
  return [
    { role: 'subject', lexeme: { root: 'ael', category: 'noun' as const }, features: {} },
    { role: 'verb', lexeme: { root: 'vilya', category: 'verb' as const }, features: {} },
    { role: 'object', lexeme: { root: 'dwa', category: 'noun' as const }, features: {} },
  ];
}

const manifest = {
  typology: { wordOrder: 'SVO' },
  phonology: { consonants: [], vowels: [], syllableStructures: ['CV'], maxCluster: 2, constraints: [] },
  paradigms: [],
  affixInventory: [],
  mutationRules: [],
  exceptions: [],
  roles: [],
  strategies: [],
  meta: { name: 't', lastUpdated: '' },
} as unknown as GrammarManifest;

describe('ast-editor', () => {
  it('buildClauseAST marks the verb as root with conjugateRoot', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    expect(ast.root.role).toBe('root');
    expect(ast.root.lexeme.root).toBe('vilya');
    expect(ast.root.conjugateRoot).toBe(true);
    expect(ast.root.dependents.length).toBe(2);
  });

  it('addDependent is pure and appends a child', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    const child = { id: 'c1', role: 'modifier', lexeme: { root: 'azul', category: 'adjective' as const }, features: {}, dependents: [] };
    const next = addDependent(ast, ast.root.id, child);

    expect(ast.root.dependents.length).toBe(2);
    const root = next.root;
    expect(root.dependents.length).toBe(3);
    expect(root.dependents.some((d: any) => d.id === 'c1')).toBeTruthy();
  });

  it('removeNode prunes a subtree immutably', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    const subject = ast.root.dependents.find((d: any) => d.role === 'subject');
    const next = removeNode(ast, subject.id);

    expect(ast.root.dependents.length).toBe(2);
    expect(next.root.dependents.length).toBe(1);
    expect(!next.root.dependents.some((d: any) => d.role === 'subject')).toBeTruthy();
  });

  it('updateNode relabels and changes category by role', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    const subject = ast.root.dependents.find((d: any) => d.role === 'subject');
    const next = updateNode(ast, subject.id, { label: 'ren', role: 'modifier' });

    const updated = next.root.dependents.find((d: any) => d.id === subject.id);
    expect(updated.lexeme.root).toBe('ren');
    expect(updated.role).toBe('modifier');
    expect(updated.lexeme.category).toBe('adjective');
    expect(subject.lexeme.root).toBe('ael');
  });

  it('cloneClauseAST produces an independent deep copy', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    const clone = cloneClauseAST(ast);
    clone.root.lexeme.root = 'MUT';
    expect(ast.root.lexeme.root).toBe('vilya');
  });

  it('realizeEditedTree reflects an added modifier in the sentence', () => {
    const ast = buildClauseAST(makeParticipants() as any);
    const child = { id: 'mod1', role: 'modifier', lexeme: { root: 'azul', category: 'adjective' as const }, features: {}, dependents: [] };
    const edited = addDependent(ast, ast.root.dependents.find((d: any) => d.role === 'subject').id, child);

    const direct = realizeClause(edited, manifest).sentence;
    const viaHelper = realizeEditedTree(edited, manifest);
    expect(viaHelper).toBe(direct);
    expect(direct).toMatch(/azul/);
  });
});
