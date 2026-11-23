/**
 * grammarDb.ts
 * ────────────
 * Servicio de persistencia para la Capa Pragmática del motor gramatical.
 *
 * Patrón: Tauri SQLite (`@tauri-apps/plugin-sql`) con fallback a localStorage.
 * Sigue la misma arquitectura que `sqlStorage.ts`.
 *
 * Almacena:
 *   - grammatical_functions (catálogo global)
 *   - pragmatic_clause_types (tipos de oración)
 *   - construction_blocks (E/A/R/I/C/K/Q/F)
 *   - clause_type_blocks (mapeo ordenado)
 *   - sentence_templates (plantillas por tipología)
 *
 * No reemplaza `sqlStorage.ts` (léxico). Complementa.
 *
 * TIPADO ESTRICTO (P1 God Component):
 *   - La frontera con el plugin SQL usa el tipo real `Database` declarado por
 *     `@tauri-apps/plugin-sql` (`import type`: se borra en compilación, así que
 *     el bundle web nunca resuelve el módulo; el `import()` dinámico de `getDb`
 *     sigue siendo el único acceso runtime).
 *   - Cada consulta `select` declara su tipo de fila (`db.select<XRow[]>`), de
 *     modo que las columnas se leen con tipo en lugar de `Record<string, any>`.
 *   - Las columnas JSON pasan por guards (`parseStringArray`, `parseBlockIds`,
 *     `parseBlockRefs`, `parseTemplates`, `isPragmaticClauseType`) en lugar de
 *     `JSON.parse(...) as any`.
 */

import type {
  PragmaticClauseType,
  PragmaticClauseTypeId,
  PragmaticBlockId,
  PragmaticBlock,
  PragmaticBlockRef,
  GrammaticalFunction,
  TypologyProfile,
  PragmaticSlotState,
} from './grammar/pragmaticTypes';
import { PRAGMATIC_BLOCKS } from './grammar/pragmaticTypes';
import type Database from '@tauri-apps/plugin-sql';
import { isTauri } from './sqlStorage';

const DB_PATH = 'sqlite:loxar.db';
const PRAG_PREFIX = 'loxar_prag_';

// ── Row contracts (SQLite column → TS) ──────────────────
// Declared per query so `db.select<XRow[]>()` yields typed columns.

type CountRow = { c: number };
type FunctionRow = {
  id: string;
  label: string;
  category: string;
  fills_slots: string | null;
  common_in: string | null;
};
type ClauseTypeRow = {
  id: string;
  label: string;
  description: string | null;
  blocks: string;
  templates: string;
};
type BlockRow = {
  id: string;
  label: string;
  description: string | null;
  required: number;
  morphology_override: string | null;
};
type FillerRow = { block_id: string; function_id: string };
type TemplateRow = { template: string };

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql').then((m) =>
      m.default.load(DB_PATH),
    ).catch((err: unknown) => {
      // Reset cache so the next call retries instead of returning a
      // permanently-rejected promise (Finding 2.4: cache poisoning).
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Test hook — allows resetting the dbPromise cache mid-test */
export function _resetDbCache(): void {
  dbPromise = null;
}

async function ensureSchema(db: Database): Promise<void> {
  // Enable foreign key constraints first
  await db.execute(`PRAGMA foreign_keys = ON`);
  
  // Create parent tables FIRST (no FK dependencies)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS construction_blocks (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      required INTEGER NOT NULL DEFAULT 0,
      morphology_override TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS grammatical_functions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      fills_slots TEXT NOT NULL DEFAULT '[]',
      common_in TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Create child tables with FK constraints
  await db.execute(`
    CREATE TABLE IF NOT EXISTS block_slot_fillers (
      block_id TEXT NOT NULL REFERENCES construction_blocks(id) ON DELETE CASCADE,
      function_id TEXT NOT NULL REFERENCES grammatical_functions(id) ON DELETE CASCADE,
      PRIMARY KEY (block_id, function_id)
    )
  `);
  
  // Create pragma tables that reference clause types
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pragmatic_clause_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      blocks TEXT NOT NULL DEFAULT '[]',
      templates TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clause_type_blocks (
      clause_type_id TEXT NOT NULL REFERENCES pragmatic_clause_types(id) ON DELETE CASCADE,
      block_id TEXT NOT NULL REFERENCES construction_blocks(id),
      slot_order INTEGER NOT NULL,
      default_function_id TEXT DEFAULT NULL,
      PRIMARY KEY (clause_type_id, block_id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sentence_templates (
      id TEXT PRIMARY KEY,
      clause_type_id TEXT NOT NULL REFERENCES pragmatic_clause_types(id),
      typology TEXT NOT NULL CHECK (typology IN ('flexive','agglutinative','isolating')),
      template TEXT NOT NULL,
      gloss TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Create indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_templates_ct_typ
      ON sentence_templates(clause_type_id, typology)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_fillers_block
      ON block_slot_fillers(block_id)
  `);
}

/** Serialize a JSON column. `unknown` is the honest input type: callers pass
 *  already-typed domain values, but the column itself carries arbitrary JSON. */
const j = (v: unknown): string => JSON.stringify(v);

// ── Seeds ────────────────────────────────────────────────

const SEED_FUNCTIONS: GrammaticalFunction[] = [
  { id: 'sustantivo', label: 'Sustantivo', category: 'noun', fillsSlots: ['E','R','K','F','C'], commonInClauseTypes: ['afirmation','question','command','report','desire'] },
  { id: 'verbo', label: 'Verbo', category: 'verb', fillsSlots: ['A'], commonInClauseTypes: ['afirmation','question','command','report','desire'] },
  { id: 'adjetivo', label: 'Adjetivo', category: 'adjective', fillsSlots: ['Q','K'], commonInClauseTypes: ['afirmation','nominal'] },
  { id: 'adverbio', label: 'Adverbio', category: 'adverb', fillsSlots: ['I','C','Q'], commonInClauseTypes: ['afirmation','question','exclamation'] },
  { id: 'particula', label: 'Partícula', category: 'particle', fillsSlots: ['I'], commonInClauseTypes: ['command','desire','question'] },
  { id: 'pronombre', label: 'Pronombre', category: 'morpheme', fillsSlots: ['E','R'], commonInClauseTypes: ['afirmation','question','command'] },
  { id: 'nombre_propio', label: 'Nombre propio', category: 'noun', fillsSlots: ['E'], commonInClauseTypes: ['afirmation','report'] },
  { id: 'sustantivo_oblicuo', label: 'Sust. oblicuo', category: 'noun', fillsSlots: ['C'], commonInClauseTypes: ['afirmation'] },
  { id: 'preposicion', label: 'Preposición', category: 'morpheme', fillsSlots: ['C'], commonInClauseTypes: ['afirmation'] },
  { id: 'particula_verbal', label: 'Partícula verbal', category: 'particle', fillsSlots: ['A'], commonInClauseTypes: ['afirmation','command'] },
  { id: 'adv_modo', label: 'Adverbio modal', category: 'adverb', fillsSlots: ['I'], commonInClauseTypes: ['command','desire','question'] },
];

function makeBlockRef(blockId: PragmaticBlockId, order: number, defaultFunction?: string): PragmaticBlockRef {
  return { blockId, order, ...(defaultFunction ? { defaultFunction } : {}) };
}

const SEED_CLAUSE_TYPES: PragmaticClauseType[] = [
  {
    id: 'afirmation', label: 'Afirmación', description: 'Oración declarativa positiva',
    blocks: [
      makeBlockRef('E', 1), makeBlockRef('A', 2), makeBlockRef('R', 3),
      makeBlockRef('I', 4), makeBlockRef('C', 5), makeBlockRef('K', 6),
      makeBlockRef('Q', 7), makeBlockRef('F', 8),
    ],
    templates: {
      flexive: ['am-o', 'am-as', 'am-a-mos'],
      agglutinative: ['gelir-gen-der-i', 'gelir-gen-der-i-mis'],
      isolating: ['yo amar ahora', 'él comer pan'],
    },
  },
  {
    id: 'question', label: 'Pregunta', description: 'Interrogativa',
    blocks: [makeBlockRef('E', 1), makeBlockRef('A', 2), makeBlockRef('R', 3), makeBlockRef('I', 4), makeBlockRef('C', 5)],
    templates: {
      flexive: ['am-o?', 'am-as?'],
      agglutinative: ['gelir-gen-der-i?'],
      isolating: ['tú amar?', 'ella comer?'],
    },
  },
  {
    id: 'command', label: 'Orden', description: 'Imperativo / mandato',
    blocks: [makeBlockRef('A', 1), makeBlockRef('E', 2), makeBlockRef('R', 3), makeBlockRef('I', 4)],
    templates: {
      flexive: ['ama!', 'amad!'],
      agglutinative: ['gelir-gen-der-i!'],
      isolating: ['¡amar!', '¡comer!'],
    },
  },
  {
    id: 'report', label: 'Reporte', description: 'Reporte de discurso',
    blocks: [makeBlockRef('E', 1), makeBlockRef('A', 2), makeBlockRef('R', 3), makeBlockRef('K', 4), makeBlockRef('C', 5)],
    templates: {
      flexive: ['am-o y k-el'],
      agglutinative: ['gelir-gen-der-i k-eli'],
      isolating: ['él amar y ello venir'],
    },
  },
  {
    id: 'desire', label: 'Deseo', description: 'Expresión de deseo',
    blocks: [makeBlockRef('I', 1), makeBlockRef('A', 2), makeBlockRef('E', 3), makeBlockRef('R', 4)],
    templates: {
      flexive: ['quiera am-o', 'deseo am-as'],
      agglutinative: ['quier gelir-gen-der-i'],
      isolating: ['querer yo amar'],
    },
  },
  {
    id: 'exclamation', label: 'Exclamación', description: 'Exclamación emotiva',
    blocks: [makeBlockRef('Q', 1), makeBlockRef('E', 2), makeBlockRef('A', 3), makeBlockRef('K', 4)],
    templates: {
      flexive: ['qué am-o!', 'tan am-as!'],
      agglutinative: ['qué gelir-gen-der-i!'],
      isolating: ['¡qué amar!'],
    },
  },
  {
    id: 'nominal', label: 'Nominal', description: 'Oración nominal sin verbo nuclear',
    blocks: [makeBlockRef('E', 1), makeBlockRef('Q', 2), makeBlockRef('C', 3)],
    templates: {
      flexive: ['am-o-tá', 'sustantivo-tá'],
      agglutinative: ['nominal-gen-der-i'],
      isolating: ['yo buen ahora'],
    },
  },
  {
    id: 'verse', label: 'Verso', description: 'Oración poética / métrica',
    blocks: [makeBlockRef('E', 1), makeBlockRef('Q', 2), makeBlockRef('A', 3), makeBlockRef('K', 4), makeBlockRef('F', 5)],
    templates: {
      flexive: ['am-o bé!', 'sustantivo-tá k-el'],
      agglutinative: ['poético-gen-der-i'],
      isolating: ['yo buen amar consecuencia'],
    },
  },
  {
    id: 'justicial', label: 'Justicial', description: 'Consecuencia y receptor preceden a la entidad',
    blocks: [makeBlockRef('K', 1), makeBlockRef('R', 2), makeBlockRef('A', 3), makeBlockRef('E', 4), makeBlockRef('I', 5), makeBlockRef('C', 6), makeBlockRef('Q', 7)],
    templates: {
      flexive: ['k-el R-am-o', 'consecuencia-receptor-acción'],
      agglutinative: ['k-eli R-gelir-gen-der-i'],
      isolating: ['ello venir tú amar'],
    },
  },
];

// ── JSON column guards ───────────────────────────────────
// Persisted JSON columns carry no compile-time guarantee: parse to `unknown`
// and narrow with a guard before the value reaches the domain types.

const PRAGMATIC_BLOCK_IDS = Object.keys(PRAGMATIC_BLOCKS) as PragmaticBlockId[];
const PRAGMATIC_CLAUSE_TYPE_IDS = SEED_CLAUSE_TYPES.map((ct) => ct.id);
const TYPOLOGY_PROFILES: readonly TypologyProfile[] = ['flexive', 'agglutinative', 'isolating'];
const GRAMMATICAL_FUNCTION_CATEGORIES = [
  'noun', 'verb', 'adjective', 'adverb', 'particle', 'morpheme', 'phrase',
] as const;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isTemplateRecord = (value: unknown): value is Record<TypologyProfile, string[]> => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return TYPOLOGY_PROFILES.every((t) => isStringArray(record[t]));
};

export const isPragmaticBlockId = (value: unknown): value is PragmaticBlockId =>
  typeof value === 'string' && (PRAGMATIC_BLOCK_IDS as string[]).includes(value);

export const isPragmaticClauseTypeId = (value: unknown): value is PragmaticClauseTypeId =>
  typeof value === 'string' && (PRAGMATIC_CLAUSE_TYPE_IDS as string[]).includes(value);

export const isGrammaticalFunctionCategory = (
  value: unknown,
): value is GrammaticalFunction['category'] =>
  typeof value === 'string'
  && (GRAMMATICAL_FUNCTION_CATEGORIES as readonly string[]).includes(value);

export const isPragmaticBlockRef = (value: unknown): value is PragmaticBlockRef => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return isPragmaticBlockId(record.blockId) && typeof record.order === 'number';
};

export const isPragmaticClauseType = (value: unknown): value is PragmaticClauseType => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  // The id is NOT restricted to the seeded union: `saveClauseType` persists
  // user-created types with arbitrary ids (localStorage / SQLite), so the
  // guard validates the shape (non-empty string) rather than catalog membership.
  return typeof record.id === 'string'
    && record.id.length > 0
    && typeof record.label === 'string'
    && typeof record.description === 'string'
    && Array.isArray(record.blocks)
    && record.blocks.every(isPragmaticBlockRef)
    && isTemplateRecord(record.templates);
};

/** Parse a JSON array-of-strings column; corrupt JSON or a non-string array
 *  yields `[]` instead of propagating `any`. */
export const parseStringArray = (serialized: string | null | undefined): string[] => {
  try {
    const parsed: unknown = JSON.parse(serialized ?? '[]');
    return isStringArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Same as `parseStringArray`, narrowed to valid block ids. */
export const parseBlockIds = (serialized: string | null | undefined): PragmaticBlockId[] =>
  parseStringArray(serialized).filter(isPragmaticBlockId);

/** Same as `parseStringArray`, narrowed to valid clause-type ids. */
export const parseClauseTypeIds = (serialized: string | null | undefined): PragmaticClauseTypeId[] =>
  parseStringArray(serialized).filter(isPragmaticClauseTypeId);

/** Parse the `blocks` column; entries missing `blockId`/`order` are dropped. */
export const parseBlockRefs = (serialized: string | null | undefined): PragmaticBlockRef[] => {
  try {
    const parsed: unknown = JSON.parse(serialized ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isPragmaticBlockRef) : [];
  } catch {
    return [];
  }
};

const emptyTemplates = (): Record<TypologyProfile, string[]> => ({
  flexive: [],
  agglutinative: [],
  isolating: [],
});

/** Parse the `templates` column; each typology falls back to an empty array
 *  when it is missing or malformed (never a record with missing keys). */
export const parseTemplates = (
  serialized: string | null | undefined,
): Record<TypologyProfile, string[]> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized ?? '{}');
  } catch {
    return emptyTemplates();
  }
  if (typeof parsed !== 'object' || parsed === null) return emptyTemplates();
  const record = parsed as Record<string, unknown>;
  const result = {} as Record<TypologyProfile, string[]>;
  for (const typology of TYPOLOGY_PROFILES) {
    result[typology] = isStringArray(record[typology]) ? record[typology] : [];
  }
  return result;
};

// ── Init ─────────────────────────────────────────────────

export async function initPragmaticDb(): Promise<void> {
  if (!isTauri()) return;
  const db = await getDb();
  await ensureSchema(db);

  // Seed functions if empty
  const fnCount = await db.select<CountRow[]>('SELECT COUNT(*) as c FROM grammatical_functions');
  if (fnCount[0].c === 0) {
    for (const fn of SEED_FUNCTIONS) {
      await db.execute(
        `INSERT INTO grammatical_functions (id, label, category, fills_slots, common_in)
         VALUES ($1, $2, $3, $4, $5)`,
        [fn.id, fn.label, fn.category, j(fn.fillsSlots), j(fn.commonInClauseTypes)],
      );
    }
  }

  // Seed blocks if empty
  const blkCount = await db.select<CountRow[]>('SELECT COUNT(*) as c FROM construction_blocks');
  if (blkCount[0].c === 0) {
    for (const [id, blk] of Object.entries(PRAGMATIC_BLOCKS)) {
      await db.execute(
        `INSERT INTO construction_blocks (id, label, description, required) VALUES ($1, $2, $3, $4)`,
        [id, blk.label, blk.description, blk.required ? 1 : 0],
      );
    }
  }

  // Seed block_slot_fillers if empty
  const fillerCount = await db.select<CountRow[]>('SELECT COUNT(*) as c FROM block_slot_fillers');
  if (fillerCount[0].c === 0) {
    for (const [id, blk] of Object.entries(PRAGMATIC_BLOCKS)) {
      for (const fnId of blk.allowedFunctions) {
        await db.execute(
          `INSERT OR IGNORE INTO block_slot_fillers (block_id, function_id) VALUES ($1, $2)`,
          [id, fnId],
        );
      }
    }
  }

  // Seed clause types if empty
  const ctCount = await db.select<CountRow[]>('SELECT COUNT(*) as c FROM pragmatic_clause_types');
  if (ctCount[0].c === 0) {
    for (const ct of SEED_CLAUSE_TYPES) {
      await db.execute(
        `INSERT INTO pragmatic_clause_types (id, label, description, blocks, templates)
         VALUES ($1, $2, $3, $4, $5)`,
        [ct.id, ct.label, ct.description, j(ct.blocks), j(ct.templates)],
      );
      // Seed block mappings
      for (const ref of ct.blocks) {
        await db.execute(
          `INSERT OR IGNORE INTO clause_type_blocks (clause_type_id, block_id, slot_order, default_function_id)
           VALUES ($1, $2, $3, $4)`,
          [ct.id, ref.blockId, ref.order, ref.defaultFunction ?? null],
        );
      }
    }
  }
}

// ── Grammatical functions catalog ────────────────────────

export async function getGrammaticalFunctions(): Promise<GrammaticalFunction[]> {
  if (!isTauri()) return SEED_FUNCTIONS;
  const db = await getDb();
  await initPragmaticDb();
  const rows = await db.select<FunctionRow[]>('SELECT * FROM grammatical_functions ORDER BY label');
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    // Column is seeded from `GrammaticalFunction.category`; a corrupt value
    // falls back to the neutral 'morpheme' instead of leaking an invalid union member.
    category: isGrammaticalFunctionCategory(r.category) ? r.category : 'morpheme',
    fillsSlots: parseBlockIds(r.fills_slots),
    commonInClauseTypes: parseClauseTypeIds(r.common_in),
  }));
}

// ── Clause types ──────────────────────────────────────────

export async function getPragmaticClauseTypes(): Promise<PragmaticClauseType[]> {
  if (!isTauri()) {
    const custom: PragmaticClauseType[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('loxar_custom_clause_type_')) {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '');
        if (isPragmaticClauseType(parsed)) custom.push(parsed);
      }
    }
    return [...SEED_CLAUSE_TYPES, ...custom];
  }
  const db = await getDb();
  await initPragmaticDb();
  const rows = await db.select<ClauseTypeRow[]>('SELECT * FROM pragmatic_clause_types ORDER BY id');
  return rows.map((r) => ({
    // Primary key seeded from SEED_CLAUSE_TYPES / saveClauseType; the union is
    // asserted at this persistence boundary.
    id: r.id as PragmaticClauseTypeId,
    label: r.label,
    description: r.description ?? '',
    blocks: parseBlockRefs(r.blocks),
    templates: parseTemplates(r.templates),
  }));
}

export async function getClauseType(id: string): Promise<PragmaticClauseType | null> {
  const types = await getPragmaticClauseTypes();
  return types.find((t) => t.id === id) ?? null;
}

export async function saveClauseType(ct: PragmaticClauseType): Promise<void> {
  if (!isTauri()) {
    const key = `loxar_custom_clause_type_${ct.id}`;
    localStorage.setItem(key, JSON.stringify(ct));
    return;
  }
  const db = await getDb();
  await initPragmaticDb();
  await db.execute(
    'INSERT OR REPLACE INTO pragmatic_clause_types (id, label, description, blocks, templates, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    [ct.id, ct.label, ct.description ?? '', j(ct.blocks), JSON.stringify(ct.templates ?? {})],
  );
  await db.execute('DELETE FROM clause_type_blocks WHERE clause_type_id = ?', [ct.id]);
  for (const ref of ct.blocks) {
    await db.execute(
      'INSERT OR REPLACE INTO clause_type_blocks (clause_type_id, block_id, slot_order, default_function_id) VALUES (?, ?, ?, ?)',
      [ct.id, ref.blockId, ref.order, ref.defaultFunction ?? null],
    );
  }
}

export async function deleteClauseType(id: string): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(`loxar_custom_clause_type_${id}`);
    return;
  }
  const db = await getDb();
  await initPragmaticDb();
  await db.execute('DELETE FROM pragmatic_clause_types WHERE id = ?', [id]);
}

// ── Blocks ────────────────────────────────────────────────

export async function getConstructionBlocks(): Promise<Record<PragmaticBlockId, PragmaticBlock>> {
  if (!isTauri()) {
    const result: Record<string, PragmaticBlock> = {};
    for (const [id, blk] of Object.entries(PRAGMATIC_BLOCKS)) {
      result[id] = { ...blk, id: id as PragmaticBlockId };
    }
    return result as Record<PragmaticBlockId, PragmaticBlock>;
  }
  const db = await getDb();
  await initPragmaticDb();
  const rows = await db.select<BlockRow[]>('SELECT * FROM construction_blocks');
  const result: Record<string, PragmaticBlock> = {};
  for (const r of rows) {
    result[r.id] = {
      // Primary key seeded from Object.keys(PRAGMATIC_BLOCKS).
      id: r.id as PragmaticBlockId,
      label: r.label,
      description: r.description ?? '',
      required: !!r.required,
      morphologyOverride: r.morphology_override ?? undefined,
      allowedFunctions: [],
    };
  }
  // Fill allowedFunctions from block_slot_fillers
  const fillers = await getBlockFillers();
  for (const [blockId, fns] of Object.entries(fillers)) {
    if (result[blockId]) result[blockId].allowedFunctions = fns;
  }
  return result as Record<PragmaticBlockId, PragmaticBlock>;
}

async function getBlockFillers(): Promise<Record<string, string[]>> {
  const db = await getDb();
  const rows = await db.select<FillerRow[]>('SELECT block_id, function_id FROM block_slot_fillers ORDER BY block_id');
  const result: Record<string, string[]> = {};
  for (const r of rows) {
    if (!result[r.block_id]) result[r.block_id] = [];
    result[r.block_id].push(r.function_id);
  }
  return result;
}

// ── Templates ─────────────────────────────────────────────

export async function getTemplates(
  clauseTypeId: string,
  typology: TypologyProfile,
): Promise<string[]> {
  if (!isTauri()) {
    const ct = SEED_CLAUSE_TYPES.find((t) => t.id === clauseTypeId);
    return ct?.templates[typology] ?? [];
  }
  const db = await getDb();
  await initPragmaticDb();
  const rows = await db.select<TemplateRow[]>(
    'SELECT template FROM sentence_templates WHERE clause_type_id = $1 AND typology = $2 ORDER BY id',
    [clauseTypeId, typology],
  );
  return rows.map((r) => r.template);
}

// ── Sentence builder state helpers ────────────────────────

export function buildInitialSlots(
  clauseTypeId: string,
  typology: TypologyProfile,
): PragmaticSlotState[] {
  const ct = SEED_CLAUSE_TYPES.find((t) => t.id === clauseTypeId);
  const blocks = (ct?.blocks ?? Object.entries(PRAGMATIC_BLOCKS).map(([id, blk]) => ({
    blockId: id as PragmaticBlockId,
    order: 0,
    defaultFunction: blk.allowedFunctions[0] ?? null,
  }))) as PragmaticBlockRef[];

  // Sort by order
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  return sorted.map((ref) => {
    const blk = PRAGMATIC_BLOCKS[ref.blockId];
    return {
      blockId: ref.blockId,
      blockLabel: blk?.label ?? ref.blockId,
      functionId: ref.defaultFunction ?? null,
      lexemeId: null,
      customText: '',
      features: {},
    };
  });
}

export function buildModuleOrder(clauseTypeId: string): PragmaticBlockId[] {
  const ct = SEED_CLAUSE_TYPES.find((t) => t.id === clauseTypeId);
  if (!ct) return ['E', 'A', 'R'];
  return ct.blocks
    .sort((a, b) => a.order - b.order)
    .map((ref) => ref.blockId);
}

// ── Persist pragmaticEngine state to manifest ────────────

export { createDefaultPragmaticState, morphologyToTypologyProfile } from '../types/pragmaticTypes';
