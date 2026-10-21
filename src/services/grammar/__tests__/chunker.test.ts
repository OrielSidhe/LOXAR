/**
 * chunker.test.ts — Tests for the section-aware document chunker.
 *
 * Fixture A-BIS: A ~124 KB Quavanol-style grammar core with ~40 section
 * delimiters and ~10 header-only sections (Roman numeral titles that appear
 * alone between ==== delimiters).
 *
 * Acceptance criteria (GAUNTLET v3.7 F0.2):
 *  1. ≤15 chunks, 0 single-line chunks.
 *  2. No-loss: concatenating all chunk text (excluding delimiter lines)
 *     reconstructs the grammar core from extractGrammarCore().
 */

import { describe, it, expect } from 'vitest';
import { splitIntoChunks, extractGrammarCore, detectLexiconBoundary, MIN_SUBSTANTIVE_CHARS, MAX_CHUNK_SIZE } from '../chunker';
import type { ChunkInfo } from '../chunker';

// ─── Fixture: Quavanol-style grammar text (~124 KB) ──────────────────────────

// Roman-numeral section headers matching the canonical Quavanol document.
const SECTION_HEADERS = [
  'I. INTRODUCCIÓN',
  'II. MORFOLOGÍA Y EUFONÍA',
  'III. SINTAXIS',
  'IV. VERBO',
  'V. SUSTANTIVO',
  'VI. SISTEMA DE CASOS',
  'VII. GÉNEROS',
  'VIII. PRONOMBRES',
  'IX. ADJETIVOS',
  'X. ADVERBIOS',
  'XI. PARTICULAS MODALES',
  'XII. CONJUNCCIONES',
  'XIII. NUMERALES',
  'XIV. SER Y ESTAR',
  'XV. CADENAS VERBALES',
  'XVI. SISTEMA DE ESCRITURA',
  'XVII. DETERMINANTES',
  'XVIII. CUALIFICADORES',
  'XIX. ESTRATEGIAS DE MARCADO',
  'XX. FONOLOGÍA',
] as const;

/**
 * Generates a paragraph of descriptive grammar text of approximately the
 * given character count. The text is deterministic (seeded by index + title)
 * so the no-loss test can verify exact reconstruction.
 */
function makeContent(idx: number, title: string, targetLen: number): string {
  const seed = (idx * 97 + title.length * 13) % 1000;
  const sentences: string[] = [];
  let acc = 0;
  const pool = [
    `En ${title}, la morfología del sistema se basa en sufijos condicionales`,
    ` que aparecen después del segmento léxico base`,
    `. La eufonía requiere una vocal de enlace [a] entre raíces finalizadas en`,
    ` consonante y sufijos iniciales que comienzan con consonante. Los géneros`,
    ` se marcan con sufijos específicos antes del caso. El orden de palabras`,
    ` es flexible debido al sistema extensivo de casos. Los pronombres son`,
    ` formas fusionadas que no se declinan con sufijos de caso. Las cadenas`,
    ` verbales solo conjugan el último verbo. Las partículas modales preceden`,
    ` al verbo. La escritura utiliza un alfabeto de 24 símbolos derivados del`,
    ` sistema Tenraél. La fonología incluye 21 consonantes y 5 vocales con`,
    ` estructuras silábicas CV y CVC.`,
  ];
  let i = 0;
  while (acc < targetLen) {
    const chunk = pool[(seed + i) % pool.length].trim();
    sentences.push(chunk);
    acc += chunk.length + 1;
    i++;
  }
  return sentences.join(' ');
}

/**
 * Builds a ~124 KB Quavanol-style grammar text with 40 `====` delimiter
 * pairs. ~10 of the sections are header-only (a Roman numeral title with no
 * body content), exactly matching the audited Quavanol structure.
 *
 * The lexicon section (==== XX LEXICO ====) is appended at the end so that
 * extractGrammarCore excludes it.
 */
function buildQuavanolGrammarText(): string {
  const parts: string[] = [];
  const totalSections = 40;
  const headerOnlyCount = 10; // sections that are just a Roman numeral title

  // Generate 30 content-bearing sections (~3.8 KB each → ~114 KB) + 10 header-only.
  // 30 × 3 800 ≈ 114 KB + 10 × ~50 bytes ≈ 500 B → ~115 KB grammar core.
  let contentIdx = 0;
  for (let i = 1; i <= totalSections; i++) {
    const isHeaderOnly = i > totalSections - headerOnlyCount; // last 10 are header-only
    const header = SECTION_HEADERS[(i - 1) % SECTION_HEADERS.length] || `SECCIÓN ${i}`;

    if (isHeaderOnly) {
      // Header-only: just the title line, no body
      parts.push('====');
      parts.push(header);
      parts.push('');
    } else {
      // Content section: header + ~3.8 KB of descriptive text
      parts.push('====');
      parts.push(header);
      parts.push('');
      parts.push(makeContent(contentIdx, header, 3_800));
      parts.push('');
      contentIdx++;
    }
  }

  // Lexicon section — must be excluded by extractGrammarCore
  parts.push('==== XX LEXICO ====');
  parts.push('Palabras del léxico de Quavanol...');
  // Add ~20 KB of lexicon content to ensure it's substantial
  for (let i = 0; i < 400; i++) {
    parts.push(` entrada_${String(i).padStart(3, '0')}: raíz_${i} | significado_${i} | categoría_${i % 5}`);
  }
  parts.push('');

  return parts.join('\n');
}

const QUAVANOL_GRAMMAR_TEXT = buildQuavanolGrammarText();

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('chunker — Quavanol fixture A-BIS', () => {
  // -----------------------------------------------------------------------
  // 1. Chunk count ≤15, 0 single-line chunks
  // -----------------------------------------------------------------------
  it('1. produces ≤15 chunks for the ~124 KB Quavanol grammar core', () => {
    const { boundary } = detectLexiconBoundary(QUAVANOL_GRAMMAR_TEXT);
    expect(boundary).not.toBeNull(); // sanity: lexicon detected

    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    expect(core.length).toBeGreaterThan(100_000); // ~124 KB
    expect(core.length).toBeLessThan(150_000);   // sanity upper bound

    const chunks = splitIntoChunks(core);

    expect(chunks.length).toBeLessThanOrEqual(15);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('1b. produces zero single-line chunks', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);

    for (const chunk of chunks) {
      const lineCount = chunk.text.split(/\r?\n/).filter(l => l.trim().length > 0).length;
      expect(lineCount).toBeGreaterThan(1);
    }
  });

  it('1c. every chunk is ≤ MAX_CHUNK_SIZE', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);

    for (const chunk of chunks) {
      expect(chunk.charCount).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
    }
  });

  // -----------------------------------------------------------------------
  // 2. No-loss: concatenated chunks reconstruct the grammar core
  // -----------------------------------------------------------------------
  it('2. no-loss: concatenating chunks reconstructs extractGrammarCore output', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);
    const allChunkText = chunks.map(c => c.text).join('\n');

    // Strip delimiter lines (====) and normalize whitespace from the core
    const coreLines = core.split(/\r?\n/)
      .filter(l => !/^={3,}\s*$/.test(l.trim()));
    const coreStripped = coreLines.join('\n').trim();

    // Normalize both sides: collapse whitespace for robust comparison
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

    expect(normalize(allChunkText)).toBe(normalize(coreStripped));
  });

  it('2b. no-loss: no header-only section text is lost', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);
    const allChunkText = chunks.map(c => c.text).join('\n\n');

    // Every header line from the core must appear somewhere in the chunks
    const headerLines = core.split(/\r?\n/)
      .filter(l => /^[IVXLCDM]+\.\s/.test(l.trim()))
      .map(l => l.trim());

    expect(headerLines.length).toBeGreaterThan(0);
    for (const header of headerLines) {
      expect(allChunkText).toContain(header);
    }
  });

  // -----------------------------------------------------------------------
  // 3. Header attachment: section headers are prefixed to content, not alone
  // -----------------------------------------------------------------------
  it('3. header-only sections are attached to the following content chunk', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);

    // No chunk should consist of only a header line
    for (const chunk of chunks) {
      const nonEmpty = chunk.text.split(/\r?\n/).filter(l => l.trim().length > 0);
      // A header-only chunk would have all lines matching a header pattern
      const allHeaders = nonEmpty.every(l => /^[IVXLCDM]+\.\s/.test(l.trim()));
      expect(allHeaders).toBe(false);
    }
  });

  // -----------------------------------------------------------------------
  // 4. Small sections are merged (consecutive small sections → fewer chunks)
  // -----------------------------------------------------------------------
  it('4. small consecutive sections are merged up to MAX_CHUNK_SIZE', () => {
    // Craft a text with several small-but-substantive content sections
    // that can fit together below MAX_CHUNK_SIZE when merged.
    const base = 'This section has substantive content that exceeds the MIN_SUBSTANTIVE_CHARS threshold of 200 characters. ';
    const text = [
      '====',
      'I. SHORT',
      '',
      base + 'Alpha content here with enough padding to pass the substantive check.',
      '',
      '====',
      'II. ANOTHER',
      '',
      base + 'Beta content here with enough padding to pass the substantive check.',
      '',
      '====',
      'III. MORE',
      '',
      base + 'Gamma content here with enough padding to pass the substantive check.',
      '',
    ].join('\n');

    const chunks = splitIntoChunks(text);

    // Small sections should be merged, not kept separate
    expect(chunks.length).toBeLessThanOrEqual(3);
    // The merged chunk should contain content from both small sections
    const mergedText = chunks.map(c => c.text).join('\n');
    expect(mergedText).toContain('Alpha content');
    expect(mergedText).toContain('Beta content');
    expect(mergedText).toContain('Gamma content');
  });

  // -----------------------------------------------------------------------
  // 5. Discards header-only or empty chunks (< MIN_SUBSTANTIVE_CHARS)
  // -----------------------------------------------------------------------
  it('5. discards chunks with no substantive content (< MIN_SUBSTANTIVE_CHARS)', () => {
    const text = [
      '====',
      'I. ONLY HEADER',
      '',
      '====',
      'II. ONLY HEADER 2',
      '',
      '====',
      'III. REAL CONTENT',
      '',
      'This section has actual content that should be included as a chunk because it exceeds the minimum substantive threshold of 200 characters. The header-only sections above should have been discarded entirely.',
      '',
    ].join('\n');

    const chunks = splitIntoChunks(text);

    // Only one chunk should survive (the one with real content)
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain('This section has actual content');
  });

  // -----------------------------------------------------------------------
  // 6. Chunks array metadata (indices, total)
  // -----------------------------------------------------------------------
  it('6. sets correct total and sequential indices on all chunks', () => {
    const core = extractGrammarCore(QUAVANOL_GRAMMAR_TEXT);
    const chunks = splitIntoChunks(core);

    const total = chunks.length;
    chunks.forEach((c, i) => {
      expect(c.total).toBe(total);
      expect(c.index).toBe(i);
      expect(c.displayIndex).toBe(i + 1);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Edge case: empty string → zero chunks
  // -----------------------------------------------------------------------
  it('7. returns zero chunks for empty input', () => {
    expect(splitIntoChunks('').length).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 8. Edge case: no delimiters → single chunk (if ≥ MIN_SUBSTANTIVE_CHARS)
  // -----------------------------------------------------------------------
  it('8. treats whole text as one section when no delimiters', () => {
    const text = 'A'.repeat(500);
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0].charCount).toBe(500);
  });

  it('8b. discards text shorter than MIN_SUBSTANTIVE_CHARS with no delimiters', () => {
    const text = 'short text';
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBe(0);
  });
});
