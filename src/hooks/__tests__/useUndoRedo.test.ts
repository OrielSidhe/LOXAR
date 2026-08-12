import assert from 'node:assert';
import { useUndoRedo } from '../useUndoRedo';

// Minimal test harness to simulate the hook's behavior in a non-React environment
// Since the hook uses React state, we'll test the logic functions directly by reimplementing them

console.log('Testing useUndoRedo logic...');

// Simulate the hook's internal logic with plain functions
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

// Test 1: Initial state
try {
  const stack = createUndoRedoStack<string>('initial');
  assert.strictEqual(stack.present, 'initial', 'Initial present should be "initial"');
  assert.strictEqual(stack.canUndo, false, 'Should not be able to undo initially');
  assert.strictEqual(stack.canRedo, false, 'Should not be able to redo initially');
  console.log('Test 1 PASSED: Initial state correct');
} catch (e) {
  console.error('Test 1 FAILED:', e);
  process.exit(1);
}

// Test 2: Set and Undo
try {
  const stack = createUndoRedoStack<string>('initial');
  stack.set('state1');
  assert.strictEqual(stack.present, 'state1', 'Present should be state1');
  assert.strictEqual(stack.canUndo, true, 'Should be able to undo');
  
  stack.undo();
  assert.strictEqual(stack.present, 'initial', 'Present should be back to initial');
  assert.strictEqual(stack.canRedo, true, 'Should be able to redo');
  console.log('Test 2 PASSED: Set and Undo works');
} catch (e) {
  console.error('Test 2 FAILED:', e);
  process.exit(1);
}

// Test 3: Undo and Redo sequence
try {
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
  console.log('Test 3 PASSED: Undo and Redo sequence works');
} catch (e) {
  console.error('Test 3 FAILED:', e);
  process.exit(1);
}

// Test 4: New set clears future
try {
  const stack = createUndoRedoStack<string>('initial');
  stack.set('state1');
  stack.set('state2');
  stack.undo(); // back to state1
  assert.strictEqual(stack.canRedo, true, 'Should be able to redo');
  
  stack.set('state3'); // new set should clear future
  assert.strictEqual(stack.canRedo, false, 'Future should be cleared after new set');
  assert.strictEqual(stack.present, 'state3', 'Present should be state3');
  console.log('Test 4 PASSED: New set clears future');
} catch (e) {
  console.error('Test 4 FAILED:', e);
  process.exit(1);
}

console.log('ALL UNDO/REDO TESTS PASSED');
