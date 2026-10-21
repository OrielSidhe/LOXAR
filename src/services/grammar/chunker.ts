/**
 * chunker.ts — Section-aware document splitter + manifest merger for large
 * grammar documents.
 *
 * Responsibilities:
 *  1. Detect and EXCLUDE the lexicón section (§ XX LEXICO / "==== ... LEXICO ====")
 *     so the LLM only processes the ~124KB grammar core, not the ~70KB word list.
 *  2. Split the grammar core into chunks bounded by "====" section delimiters
 *     (tolerating Windows \r\n and \r line endings), each ≤ MAX_CHUNK_SIZE chars.
 *  3. Provide retry-on-429 backoff helper wrapping the LLM call.
 *  4. Merge multiple partial DeclarativeManifests into one (map-reduce).
 */

import type { DeclarativeManifest } from './declarativeFormat';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Target chunk size — keeps each LLM request well under free-tier rate limits. */
export const MAX_CHUNK_SIZE = 12_000;

/** Maximum retry attempts for a 429 (rate-limit) response. */
export const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff on 429. */
export const RETRY_BASE_DELAY = 1_000;

/** Regex matching various forms of "==== Section Headers ====" that delimit
 *  the document's major sections. Tolerates 3+ equals on each side. */
const SECTION_DELIMITER = /={3,}\s*\n/;

/** Patterns that identify the lexicon section header (case-insensitive, accents
 *  normalised). The lexicon is excluded from LLM induction. */
const LEXICON_HEADER_PATTERNS = [
  /^={3,}\s*XX\s*(LEXICO|LÉXICO|LEXICON)\s*={3,}\s*$/i,
  /^={3,}\s*(XX|20)\s*(LEXICO|LÉXICO|LEXICON)\s*={3,}\s*$/i,
  /^§\s*XX\s*(LEXICO|LÉXICO|LEXICON)\s*$/i,
  /^XX\s*(LEXICO|LÉXICO|LEXICON)\s*$/i,
  /^(LEXICO|LÉXICO|LEXICON)\s*$/i,
];

// ── Lexicon boundary detection ────────────────────────────────────────────────

export interface LexiconBoundary {
  /** Index in the original text where the lexicon section starts (line index). */
  startLine: number;
  /** Header text of the lexicon section. */
  header: string;
  /** Number of characters excluded (approximate). */
  excludedChars: number;
}

/**
 * Scan the raw text line-by-line for a lexicon section header.
 * Returns the boundary info, or null if no lexicon section is found.
 * Also reports a human-readable note for the UI.
 */
export function detectLexiconBoundary(text: string): { boundary: LexiconBoundary | null; note: string } {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    for (const pattern of LEXICON_HEADER_PATTERNS) {
      if (pattern.test(trimmed)) {
        const excludedChars = text.length - lines.slice(0, i).join('\n').length;
        return {
          boundary: {
            startLine: i,
            header: trimmed,
            excludedChars,
          },
          note: `Sección de léxico detectada ("${trimmed}") — excluida de la inducción gramatical. Usa la importación de léxico para ese contenido.`,
        };
      }
    }
  }
  return { boundary: null, note: '' };
}

/**
 * Returns the grammar-core portion of the text (lexicon excluded if present).
 */
export function extractGrammarCore(text: string): string {
  const { boundary } = detectLexiconBoundary(text);
  if (!boundary) return text;
  const lines = text.split(/\r?\n/);
  return lines.slice(0, boundary.startLine).join('\n');
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum net character count for a chunk to be considered substantive.
 *  Sections with less content than this (typically header-only sections
 *  like "II. MORFOLOGÍA Y EUFONÍA" between two delimiters) are merged into
 *  the next content-bearing section and never emitted as standalone chunks. */
export const MIN_SUBSTANTIVE_CHARS = 200;

// ── Chunk splitting ───────────────────────────────────────────────────────────

export interface ChunkInfo {
  /** 0-based chunk index. */
  index: number;
  /** 1-based display index for progress UI. */
  displayIndex: number;
  /** Total number of chunks. */
  total: number;
  /** The chunk text. */
  text: string;
  /** Starting line number in the original text. */
  startLine: number;
  /** Character count of this chunk. */
  charCount: number;
}

/**
 * Determine whether a section is "header-only" — i.e., it contains no
 * substantive body text, just a title/header line. These sections arise
 * when a Roman-numeral header like "II. MORFOLOGÍA Y EUFONÍA" appears
 * alone between two ==== delimiters.
 *
 * Heuristic:
 *  - Net text (non-empty, trimmed lines joined) is < MIN_SUBSTANTIVE_CHARS
 *  - No paragraph break (no blank line within the section)
 *  - At most 3 non-empty lines (a header + maybe a sub-header)
 */
function isHeaderOnlySection(section: string[]): boolean {
  const nonEmpty = section.map(l => l.trim()).filter(l => l.length > 0);
  if (nonEmpty.length === 0) return true;
  if (nonEmpty.length > 3) return false;
  const text = nonEmpty.join(' ');
  if (text.length >= MIN_SUBSTANTIVE_CHARS) return false;
  // No paragraph break → no substantive body text
  const joined = section.join('\n');
  return !joined.includes('\n\n') && !joined.includes('\n  \n');
}

/**
 * Split text into section-aware chunks.
 *
 * Algorithm:
 *  1. Find "====" section delimiters (tolerating \r\n and \r).
 *  2. Collect lines into sections bounded by delimiters.
 *  3. Attach header-only sections (short title-only sections) to the
 *     following content-bearing section so the header never travels alone.
 *  4. Merge consecutive small sections up to MAX_CHUNK_SIZE to reduce the
 *     number of LLM calls and avoid header-only chunks.
 *  5. Sub-split sections that exceed MAX_CHUNK_SIZE at paragraph boundaries.
 *  6. Discard any resulting chunk with < MIN_SUBSTANTIVE_CHARS of net content.
 *  7. Each chunk is at most MAX_CHUNK_SIZE chars.
 */
export function splitIntoChunks(text: string): ChunkInfo[] {
  const lines = text.split(/\r?\n/);
  const sections: string[][] = [];
  let currentSection: string[] = [];

  for (const line of lines) {
    if (SECTION_DELIMITER.test(line + '\n')) {
      // This line is a section delimiter — finalize current section
      if (currentSection.length > 0) {
        sections.push(currentSection);
      }
      currentSection = [];
    } else {
      currentSection.push(line);
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  // If no delimiters were found, treat the whole text as one section
  if (sections.length === 0) {
    sections.push(lines);
  }

  // ── Pass 1: Attach header-only sections to following content ──
  // A header-only section (e.g. "II. MORFOLOGÍA Y EUFONÍA" alone between
  // two ==== delimiters) is buffered and prepended to the next content-
  // bearing section. This ensures headers never travel as standalone chunks.
  const attached: string[][] = [];
  let headerBuffer: string[] = [];

  for (const section of sections) {
    if (isHeaderOnlySection(section)) {
      headerBuffer.push(...section);
      headerBuffer.push(''); // separator before following content
    } else {
      if (headerBuffer.length > 0) {
        attached.push([...headerBuffer, ...section]);
        headerBuffer = [];
      } else {
        attached.push([...section]);
      }
    }
  }
  // Remaining headers (no following content): attach to last content section
  if (headerBuffer.length > 0) {
    if (attached.length > 0) {
      attached[attached.length - 1].push(...headerBuffer);
    } else {
      // All sections were header-only — use original sections as-is
      attached.push(...sections);
    }
  }

  // ── Pass 2: Merge small consecutive sections up to MAX_CHUNK_SIZE ──
  // Small sections (< MAX_CHUNK_SIZE) that follow each other are combined
  // to approach the target chunk size, minimizing LLM round-trips.
  const merged: string[][] = [];
  let current: string[] = [];

  for (const section of attached) {
    if (current.length === 0) {
      current = [...section];
    } else {
      const combined = [...current, '', ...section];
      if (combined.join('\n').length <= MAX_CHUNK_SIZE) {
        current = combined;
      } else {
        merged.push(current);
        current = [...section];
      }
    }
  }
  if (current.length > 0) {
    merged.push(current);
  }

  // ── Pass 3: Build chunks (sub-split large sections, discard tiny ones) ──
  const chunks: ChunkInfo[] = [];
  let lineCursor = 0;

  for (const section of merged) {
    let sectionText = section.join('\n');

    // Discard sections with no substantive content (< MIN_SUBSTANTIVE_CHARS net)
    if (sectionText.trim().length < MIN_SUBSTANTIVE_CHARS) {
      lineCursor += section.length;
      continue;
    }

    if (sectionText.length <= MAX_CHUNK_SIZE) {
      chunks.push({
        index: chunks.length,
        displayIndex: chunks.length + 1,
        total: 0, // will be set after all chunks are collected
        text: sectionText,
        startLine: lineCursor,
        charCount: sectionText.length,
      });
      lineCursor += section.length;
    } else {
      // Sub-split the section at paragraph boundaries
      const paragraphs = sectionText.split(/\n\s*\n/);
      let currentPara: string[] = [];
      let currentLen = 0;

      for (const para of paragraphs) {
        const paraWithNewline = para + '\n\n';
        if (paraWithNewline.length > MAX_CHUNK_SIZE) {
          // Single paragraph too large — hard-split it
          if (currentPara.length > 0) {
            const chunkText = currentPara.join('\n\n');
            if (chunkText.trim().length >= MIN_SUBSTANTIVE_CHARS) {
              chunks.push({
                index: chunks.length,
                displayIndex: chunks.length + 1,
                total: 0,
                text: chunkText,
                startLine: lineCursor,
                charCount: chunkText.length,
              });
            }
            lineCursor += currentPara.join('\n').split('\n').length;
            currentPara = [];
            currentLen = 0;
          }
          for (let i = 0; i < para.length; i += MAX_CHUNK_SIZE) {
            const chunkText = para.slice(i, i + MAX_CHUNK_SIZE);
            chunks.push({
              index: chunks.length,
              displayIndex: chunks.length + 1,
              total: 0,
              text: chunkText,
              startLine: lineCursor,
              charCount: chunkText.length,
            });
            lineCursor += chunkText.split('\n').length;
          }
        } else if (currentLen + paraWithNewline.length > MAX_CHUNK_SIZE && currentPara.length > 0) {
          const chunkText = currentPara.join('\n\n');
          if (chunkText.trim().length >= MIN_SUBSTANTIVE_CHARS) {
            chunks.push({
              index: chunks.length,
              displayIndex: chunks.length + 1,
              total: 0,
              text: chunkText,
              startLine: lineCursor,
              charCount: chunkText.length,
            });
          }
          lineCursor += currentPara.join('\n').split('\n').length;
          currentPara = [para];
          currentLen = para.length;
        } else {
          currentPara.push(para);
          currentLen += paraWithNewline.length;
        }
      }
      if (currentPara.length > 0) {
        const chunkText = currentPara.join('\n\n');
        if (chunkText.trim().length >= MIN_SUBSTANTIVE_CHARS) {
          chunks.push({
            index: chunks.length,
            displayIndex: chunks.length + 1,
            total: 0,
            text: chunkText,
            startLine: lineCursor,
            charCount: chunkText.length,
          });
        }
        lineCursor += currentPara.join('\n').split('\n').length;
      }
    }
  }

  // Set totals
  const total = chunks.length;
  chunks.forEach(c => c.total = total);

  return chunks;
}

// ── Retry wrapper for 429 ───────────────────────────────────────────────────────

/**
 * Call `fn` with exponential backoff on 429 (rate limit) or transient errors.
 * Throws the last error if all retries fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  baseDelay: number = RETRY_BASE_DELAY,
  onError?: (attempt: number, error: Error) => void,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      // Check if it's a 429 or transient error worth retrying
      const msg = lastError.message.toLowerCase();
      const is429 = msg.includes('429') || msg.includes('rate') || msg.includes('quota');
      const isTransient = msg.includes('timeout') || msg.includes('econnreset') || msg.includes('etimedout');

      if (!is429 && !isTransient) {
        // Non-retryable error — throw immediately
        throw lastError;
      }

      onError?.(attempt, lastError);

      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ── Manifest merging (map-reduce) ─────────────────────────────────────────────

/**
 * Merge an array of partial DeclarativeManifests into a single manifest.
 * Later manifests fill in gaps from earlier ones; arrays are deduplicated
 * and concatenated by identity.
 */
export function mergeManifests(manifests: DeclarativeManifest[]): DeclarativeManifest {
  if (manifests.length === 0) {
    return emptyManifest();
  }
  if (manifests.length === 1) {
    return { ...manifests[0] };
  }

  const first = manifests[0];
  const result: DeclarativeManifest = {
    name: first.name || 'Imported',
    typology: { ...first.typology },
    phonology: {
      consonants: [...new Set(first.phonology.consonants)],
      vowels: [...new Set(first.phonology.vowels)],
      syllableStructures: [...new Set(first.phonology.syllableStructures)],
    },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
  };

  const paradigmMap = new Map<string, DeclarativeManifest['paradigms'][0]>();
  const strategyMap = new Map<string, DeclarativeManifest['strategies'][0]>();
  const mutationMap = new Map<string, DeclarativeManifest['mutationRules'][0]>();
  const exceptionMap = new Map<string, DeclarativeManifest['exceptions'][0]>();
  const roleMap = new Map<string, DeclarativeManifest['roles'][0]>();

  for (const m of manifests) {
    // Typology: fill gaps (first non-empty wins for each field)
    if (m.typology.wordOrder && !result.typology.wordOrder) result.typology.wordOrder = m.typology.wordOrder;
    if (m.typology.morphology && !result.typology.morphology) result.typology.morphology = m.typology.morphology;
    if (m.typology.headDirection && !result.typology.headDirection) result.typology.headDirection = m.typology.headDirection;
    if (m.typology.alignment && !result.typology.alignment) result.typology.alignment = m.typology.alignment;

    // Phonology: union
    m.phonology.consonants.forEach(c => { if (!result.phonology.consonants.includes(c)) result.phonology.consonants.push(c); });
    m.phonology.vowels.forEach(v => { if (!result.phonology.vowels.includes(v)) result.phonology.vowels.push(v); });
    m.phonology.syllableStructures.forEach(s => { if (!result.phonology.syllableStructures.includes(s)) result.phonology.syllableStructures.push(s); });

    // Paradigms: merge by category (concatenate slots)
    for (const p of m.paradigms) {
      const existing = paradigmMap.get(p.category);
      if (existing) {
        existing.slots.push(...p.slots);
      } else {
        paradigmMap.set(p.category, { ...p, slots: [...p.slots] });
      }
    }

    // Strategies: dedupe by id, fallback to name
    for (const s of m.strategies) {
      const key = s.id || s.name || JSON.stringify(s);
      if (!strategyMap.has(key)) strategyMap.set(key, { ...s });
    }

    // Mutation rules: dedupe by id
    for (const r of m.mutationRules) {
      const key = r.id || r.pattern;
      if (!mutationMap.has(key)) mutationMap.set(key, { ...r });
    }

    // Exceptions: dedupe by exceptionPattern
    for (const e of m.exceptions) {
      const key = e.exceptionPattern || e.id;
      if (!exceptionMap.has(key)) exceptionMap.set(key, { ...e });
    }

    // Roles: dedupe by id
    for (const r of m.roles) {
      const key = r.id || r.name;
      if (!roleMap.has(key)) roleMap.set(key, { ...r });
    }
  }

  result.paradigms = Array.from(paradigmMap.values());
  result.strategies = Array.from(strategyMap.values());
  result.mutationRules = Array.from(mutationMap.values());
  result.exceptions = Array.from(exceptionMap.values());
  result.roles = Array.from(roleMap.values());

  return result;
}

export function emptyManifest(): DeclarativeManifest {
  return {
    name: 'Imported',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: [], vowels: [], syllableStructures: ['CV'] },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
  };
}

/**
 * Merge a local manifest with an LLM manifest. The LLM result takes priority
 * for populated fields; the local result fills gaps. This ensures rich AI
 * extraction while preserving local parser findings.
 */
export function mergeLocalAndLlm(local: DeclarativeManifest, llm: DeclarativeManifest): DeclarativeManifest {
  const llmPriority = mergeManifests([llm, local]);
  // mergeManifests dedupes but gives priority to first — which is llm. Good.
  // However, for phonology arrays we want union. mergeManifests already does union.
  return llmPriority;
}
