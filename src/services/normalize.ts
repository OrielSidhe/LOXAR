/**
 * normalize.ts
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for lexicon data normalization + validation.
 *
 * WHY THIS FILE EXISTS (P1 — cierra el incidente 2969057 "No validation step
 * existed):
 *   Previously normalization was duplicated and DIVERGENT across routes:
 *     - the localStorage boot path (`getInitialState`) did its own inline
 *       normalization,
 *     - the SQLite hydrate path (`sqlStorage.loadLexicon`) applied NONE, so
 *       schema drift was never corrected on read.
 *   Now every byte that enters the app from storage (or an import) flows
 *   through `normalizeLexiconData` / `normalizeGrammarManifest` here.
 *
 * ZOD CONTRACT:
 *   Nested schemas are plain `z.object` (unknown sub-keys are STRIPPED, never
 *   rejected — so legacy data is safe). The top-level `LexiconDataSchema` is a
 *   `z.looseObject`, so unknown TOP-LEVEL keys never cause a parse failure
 *   (they are simply not carried into the canonical `LexiconData` the app uses).
 *   All known fields carry `.default(...)` so missing pieces are filled in.
 *   Parsing failures are caught at the storage boundary (loadLexicon /
 *   getInitialState) where a corrupt lexicon is skipped instead of crashing.
 * ----------------------------------------------------------------------------
 */
import { z } from 'zod';
import type {
  LexiconData,
  GrammarManifest,
  NeographyProfile,
  GenerativeProfile,
  InflectionProfile,
  LexiconEntry,
  NewLexiconEntry,
} from '../types';
import { resolveLexicalCategory, DEFAULT_CATEGORIES } from '../data/taxonomy';

// ── Default factories ────────────────────────────────────────────────────────
/**
 * @deprecated Usar `DEFAULT_CATEGORIES` desde `taxonomy.ts`.
 * Seed de categorías por defecto para `customFunctions`.
 * Ahora coincide exactamente con el diccionario taxonómico canónico.
 */
export const DEFAULT_FUNCTIONS = DEFAULT_CATEGORIES;

export const getDefaultProfile = (): GenerativeProfile => ({
  consonants: [], vowels: [], syllableStructures: [],
  consonantClusters: [], vowelClusters: [],
  sampleText: '', grammarNotes: '', derivationalAffixes: [],
});

export const getDefaultNeographyProfile = (): NeographyProfile => ({
  glyphs: [], characterMap: {}, writingDirection: 'ltr',
  guideLines: { baseline: 180, xHeight: 120, ascender: 60, descender: 200 },
  customCharacters: [], ligatures: {},
});

export const getDefaultInflectionProfile = (): InflectionProfile => ({ paradigms: [] });

export const getDefaultGrammarManifest = (): GrammarManifest => ({
  meta: { author: 'Unknown', version: '1.0', sourceFormat: 'json', lastUpdated: new Date().toISOString() },
  typology: { wordOrder: 'SVO', alignment: 'Nominative-Accusative', morphology: 'Isolating', headDirection: 'Head-Initial' },
  strategies: [], roles: [], notes: [],
  paradigms: [], mutationRules: [], exceptions: [],
  affixInventory: [],
  preview: { useLexiconAffixes: false },
});

// ── Zod schemas (nested defaults; never throw on legacy data) ────────────────
// Exported so the future grammar module (P3) can reuse them for validation.
export const GrammarManifestSchema = z.object({
  meta: z.object({
    author: z.string().default('Unknown'),
    version: z.string().default('1.0'),
    sourceFormat: z.enum(['json', 'markdown']).default('json'),
    lastUpdated: z.string().default(''),
  }).default({ author: 'Unknown', version: '1.0', sourceFormat: 'json', lastUpdated: '' }),
  phonology: z.any().optional(),
  typology: z.object({
    wordOrder: z.string().default('SVO'),
    alignment: z.string().default('Nominative-Accusative'),
    morphology: z.string().default('Isolating'),
    headDirection: z.string().default('Head-Initial'),
  }).default({ wordOrder: 'SVO', alignment: 'Nominative-Accusative', morphology: 'Isolating', headDirection: 'Head-Initial' }),
  strategies: z.array(z.any()).default([]),
  roles: z.array(z.any()).default([]),
  notes: z.array(z.string()).default([]),
  ui: z.object({ showTone: z.boolean() }).optional(),
  /** NEW: persistent AST representation of the clause, persisted per conlang */
  clauseTree: z.any().optional(),
  preview: z.object({ useLexiconAffixes: z.boolean().default(false) }).default({ useLexiconAffixes: false }),
  paradigms: z.array(z.any()).default([]),
  mutationRules: z.array(z.any()).default([]),
  exceptions: z.array(z.any()).default([]),
  affixInventory: z.array(z.any()).default([]),
});

export const GenerativeProfileSchema = z.object({
  consonants: z.array(z.string()).default([]),
  vowels: z.array(z.string()).default([]),
  syllableStructures: z.array(z.string()).default([]),
  consonantClusters: z.array(z.string()).default([]),
  vowelClusters: z.array(z.string()).default([]),
  sampleText: z.string().default(''),
  grammarNotes: z.string().default(''),
  derivationalAffixes: z.array(z.any()).default([]),
});

export const NeographyProfileSchema = z.object({
  glyphs: z.array(z.any()).default([]),
  characterMap: z.record(z.string(), z.unknown()).default({}),
  writingDirection: z.enum(['ltr', 'rtl', 'ttb']).optional(),
  guideLines: z.object({
    baseline: z.number().default(180),
    xHeight: z.number().default(120),
    ascender: z.number().default(60),
    descender: z.number().default(200),
    emSize: z.number().optional(),
  }).default({ baseline: 180, xHeight: 120, ascender: 60, descender: 200 }),
  customCharacters: z.array(z.string()).default([]),
  ligatures: z.record(z.string(), z.unknown()).default({}),
  fontFamily: z.string().optional(),
  previewFont: z.string().optional(),
});

export const InflectionProfileSchema = z.object({
  paradigms: z.array(z.any()).default([]),
  phonologicalRules: z.array(z.any()).optional(),
});

const LexiconDataSchema = z.object({
  entries: z.array(z.any()).default([]),
  profile: GenerativeProfileSchema.default(getDefaultProfile),
  neography: NeographyProfileSchema.default(getDefaultNeographyProfile as any),
  inflection: InflectionProfileSchema.default(getDefaultInflectionProfile),
  grammar: GrammarManifestSchema.default(getDefaultGrammarManifest as any),
  corpus: z.array(z.any()).default([]),
  metadata: z.looseObject({
    conlangName: z.string().optional(),
    mainLanguage: z.string().optional(),
  }).default({}),
  wordsAddedSinceSave: z.number().default(0),
  customFunctions: z.array(z.string()).default([]),
}).loose();

// ── Helpers ──────────────────────────────────────────────────────────────────
const reindexLexicon = (lexicon: NewLexiconEntry[]): LexiconEntry[] => {
  return lexicon.map((entry, index) => ({ ...entry, ID: (index + 1).toString() } as LexiconEntry));
};

const normalizeEntry = (entry: any): NewLexiconEntry => ({
  Raíz: entry.Raíz || entry.raiz || '',
  Léxema: Array.isArray(entry.Léxema)
    ? entry.Léxema
    : (entry.Léxema || entry.lexema ? [entry.Léxema || entry.lexema] : []),
  Categoría: resolveLexicalCategory(entry.Categoría || entry.Función || entry.Categoria || entry.categoria),
  Significado: Array.isArray(entry.Significado)
    ? entry.Significado
    : (entry.Significado || entry.significado ? [entry.Significado || entry.significado] : []),
  extraData: entry.extraData || {},
  externalID: entry.externalID,
});

// ── Public normalization API ─────────────────────────────────────────────────
export const normalizeGrammarManifest = (grammar?: any): GrammarManifest =>
  GrammarManifestSchema.parse(grammar ?? {}) as GrammarManifest;

export const normalizeLexiconData = (
  data: any,
  fallbackName: string,
  fallbackLanguage: string,
): LexiconData => {
  const base = LexiconDataSchema.parse(data ?? {});

  const entries = reindexLexicon(base.entries.map(normalizeEntry));

  // customFunctions = stored ones + every category actually used + defaults.
  const existingFunctions = new Set<string>(
    entries.map((e) => e.Categoría).filter(Boolean) as string[],
  );
  base.customFunctions.forEach((fn) => existingFunctions.add(fn));
  DEFAULT_FUNCTIONS.forEach((fn) => existingFunctions.add(fn));

  const result: LexiconData = {
    entries,
    profile: base.profile as GenerativeProfile,
    neography: base.neography as NeographyProfile,
    inflection: base.inflection as InflectionProfile,
    grammar: base.grammar as GrammarManifest,
    corpus: base.corpus as LexiconData['corpus'],
    metadata: {
      conlangName: base.metadata.conlangName || fallbackName,
      mainLanguage: base.metadata.mainLanguage || fallbackLanguage,
    },
    wordsAddedSinceSave: base.wordsAddedSinceSave,
    customFunctions: Array.from(existingFunctions).sort(),
  };
  return result;
};
