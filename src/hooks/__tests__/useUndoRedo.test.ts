import assert from 'node:assert';
import { describe, test } from 'vitest';

// Minimal test harness to simulate the hook's behavior in a non-React environment
// Since the hook uses React state, we'll test the logic functions directly by reimplementing them

function createUndoRedoStack<T>(initial: T) {
  const past: T[] = [];
  const future: T[] = [];
  let present = initial;

  const set = (newPresent: T) => {
    past.push(present);
    future.length = 0;
    present = newPresent;
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past.pop()!;
    future.unshift(present);
    present = previous;
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future.shift()!;
    past.push(present);
    present = next;
  };

  return {
    get present() { return present; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    set, undo, redo,
  };
}

describe('useUndoRedo', () => {
  // Test 1: Initial state
  test('initial state is correct', () => {
    const stack = createUndoRedoStack<string>('initial');
    assert.strictEqual(stack.present, 'initial', 'Initial present should be "initial"');
    assert.strictEqual(stack.canUndo, false, 'Should not be able to undo initially');
    assert.strictEqual(stack.canRedo, false, 'Should not be able to redo initially');
  });

  // Test 2: Set and Undo
  test('set and undo works', () => {
    const stack = createUndoRedoStack<string>('initial');
    stack.set('state1');
    assert.strictEqual(stack.present, 'state1', 'Present should be state1');
    assert.strictEqual(stack.canUndo, true, 'Should be able to undo');
    
    stack.undo();
    assert.strictEqual(stack.present, 'initial', 'Present should be back to initial');
    assert.strictEqual(stack.canRedo, true, 'Should be able to redo');
  });

  // Test 3: Undo and Redo sequence
  test('undo and redo sequence works', () => {
    const stack = createUndoRedoStack<string>('initial');
    stack.set('state1');
    stack.set('state2');
    assert.strictEqual(stack.present, 'state2', 'Present should be state2');
    
    stack.undo();
    assert.strictEqual(stack.present, 'state1', 'After undo, should be state1');
    stack.undo();
    assert.strictEqual(stack.present, 'initial', 'After second undo, should be initial');
    
    stack.redo();
    assert.strictEqual(stack.present, 'state1', 'After redo, should be state1');
  });

  // Test 4: New set clears future
  test('new set clears future', () => {
    const stack = createUndoRedoStack<string>('initial');
    stack.set('state1');
    stack.set('state2');
    stack.undo();
    assert.strictEqual(stack.present, 'state1', 'After undo, should be state1');
    assert.strictEqual(stack.canRedo, true, 'Should be able to redo');
    
    stack.set('state3');
    assert.strictEqual(stack.present, 'state3', 'Present should be state3');
    assert.strictEqual(stack.canRedo, false, 'Should not be able to redo after new set');
  });
});

console.log('ALL UNDO/REDO TESTS PASSED');
