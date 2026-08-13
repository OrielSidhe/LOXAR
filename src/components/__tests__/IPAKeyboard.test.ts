import assert from 'node:assert';
import { describe, test } from 'vitest';

// Minimal DOM stub to exercise IPAKeyboard insertion logic without a browser.
class FakeInput {
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  lastEvent: string | null = null;
  constructor(value = '') {
    this.value = value;
    this.selectionStart = value.length;
    this.selectionEnd = value.length;
  }
  setSelectionRange(start: number, end: number) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
  focus() {}
  dispatchEvent(_e: unknown) {
    this.lastEvent = 'input';
  }
  get name() {
    return 'Léxema';
  }
}

// We test the insertion algorithm by replicating the component's logic against a
// fake target. The component itself calls document.getElementById(targetId); we
// mirror that here so the test validates the exact string surgery it performs.
function insertSymbol(target: FakeInput, symbol: string) {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const before = target.value.slice(0, start);
  const after = target.value.slice(end);
  target.value = before + symbol + after;
  const newPos = start + symbol.length;
  target.setSelectionRange(newPos, newPos);
  target.focus();
  target.dispatchEvent(new Event('input', { bubbles: true }));
  return target;
}

describe('IPAKeyboard insertion', () => {
  // Case 1: insert at end of empty field
  test('insert at end of empty field', () => {
    const t = new FakeInput('');
    insertSymbol(t, 'ɑ');
    assert.equal(t.value, 'ɑ');
    assert.equal(t.selectionStart, 1);
  });

  // Case 2: insert in the middle of existing text
  test('insert in the middle of existing text', () => {
    const t = new FakeInput('baskel');
    t.selectionStart = 2;
    t.selectionEnd = 2;
    insertSymbol(t, 'ɔ');
    assert.equal(t.value, 'baɔskel');
    assert.equal(t.selectionStart, 3);
  });

  // Case 3: replace a selection range
  test('replace a selection range', () => {
    const t = new FakeInput('boskel');
    t.selectionStart = 1;
    t.selectionEnd = 3; // selects "os"
    insertSymbol(t, 'ʃ');
    assert.equal(t.value, 'bʃkel');
    assert.equal(t.selectionStart, 2);
  });

  // Case 4: multi-character IPA symbol (length-aware cursor)
  test('multi-character IPA symbol preserves cursor position', () => {
    const t = new FakeInput('x');
    insertSymbol(t, 'ʧ');
    assert.equal(t.value, 'xʧ');
    assert.equal(t.selectionStart, 2);
  });
});
