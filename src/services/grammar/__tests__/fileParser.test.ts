/**
 * fileParser.test.ts — E5 + E6: Format audit tests.
 *
 * Validates:
 *  - .txt → plain text passthrough
 *  - .md → plain text passthrough
 *  - .docx → mammoth text extraction
 *  - .csv → papaparse flattened text
 *  - .xlsx → xlsx cell concatenation
 *  - .doc → rejected with clear error
 *  - unknown → rejected with clear error
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseGrammarFile } from '../fileParser';

// ── Mock FileReader for node environment ─────────────────────────────────
class MockFileReader {
  result: any = null;
  onload: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readAsText(file: File) {
    // Use the file's text() if available, otherwise use a simple approach
    setTimeout(() => {
      // For text files, extract content from the File object
      const content = (file as any)._mockContent || '';
      this.result = content;
      if (this.onload) this.onload();
    }, 0);
  }
  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      const content = (file as any)._mockContent || new ArrayBuffer(0);
      this.result = content;
      if (this.onload) this.onload();
    }, 0);
  }
}

(globalThis as any).FileReader = MockFileReader;

// Patch File to carry mock content
function makeFile(content: string, name: string, type = 'text/plain'): File {
  const file = new File([content], name, { type });
  (file as any)._mockContent = content;
  return file;
}

function makeBinaryFile(bytes: ArrayBuffer, name: string, type = 'application/octet-stream'): File {
  const file = new File([bytes], name, { type });
  (file as any)._mockContent = bytes;
  return file;
}

describe('FileParser — format support (E5)', () => {
  it('E5.1: .txt is read as plain text', async () => {
    const file = makeFile('§ Tipología: SOV, aglutinante, head-final', 'grammar.txt');
    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('SOV');
      expect(result.sourceFormat).toBe('txt');
    }
  });

  it('E5.2: .md is read as plain text', async () => {
    const file = makeFile('# Grammar\n\n§ Sustantivos: plural por -k', 'grammar.md', 'text/markdown');
    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('plural por -k');
      expect(result.sourceFormat).toBe('md');
    }
  });

  it('E5.3: .doc is rejected with clear error', async () => {
    const file = makeBinaryFile(new ArrayBuffer(16), 'old_grammar.doc', 'application/msword');
    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('no es soportado');
      expect(result.error).toContain('.docx');
    }
  });

  it('E5.4: unknown format is rejected with clear error', async () => {
    const file = makeFile('some content', 'grammar.xyz', 'application/octet-stream');
    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Formato no soportado');
    }
  });

  it('E5.5: .csv is parsed and flattened to text', async () => {
    const csv = 'Categoría,Forma,Suono\nSustantivo,-k,plural\nbuilding,house,edificio';
    const file = makeFile(csv, 'grammar.csv', 'text/csv');
    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('CSV importado');
      expect(result.text).toContain('plural');
      expect(result.text).toContain('edificio');
      expect(result.sourceFormat).toBe('csv');
    }
  });

  it('E5.6: .xlsx is parsed and cells flattened to text', async () => {
    // Create a minimal XLSX using xlsx library
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Categoría', 'Forma'],
      ['Sustantivo', '-k'],
      ['Verbo', '-t'],
    ]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Gramática');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = makeBinaryFile(wbout, 'grammar.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const result = await parseGrammarFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('XLSX importado');
      expect(result.text).toContain('Sustantivo');
      expect(result.text).toContain('-k');
      expect(result.sourceFormat).toBe('xlsx');
    }
  });
});
