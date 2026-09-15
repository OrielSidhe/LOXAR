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
 */

import type {
  PragmaticClauseType,
  PragmaticBlockId,
  PragmaticBlock,
  PragmaticBlockRef,
  GrammaticalFunction,
  TypologyProfile,
  PragmaticSlotState,
} from './grammar/pragmaticTypes';
import { PRAGMATIC_BLOCKS } from './grammar/pragmaticTypes';
import { isTauri } from './sqlStorage';

const DB_PATH = 'sqlite:loxar.db';
const PRAG_PREFIX = 'loxar_prag_';

type Row = Record<string, any>;

let dbPromise: Promise<any> | null = null;

async function getDb(): Promise<any> {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql').then((m: any) =>
      m.default.load(DB_PATH),
    );
  }
  return dbPromise;
}

async function ensureSchema(db: any): Promise<void> {
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
    CREATE TABLE IF NOT EXISTS clause_type_blocks (
      clause_type_id TEXT NOT NULL REFERENCES pragmatic_clause_types(id) ON DELETE CASCADE,
      block_id TEXT NOT NULL REFERENCES construction_blocks(id),
      slot_order INTEGER NOT NULL,
      default_function_id TEXT DEFAULT NULL,
      PRIMARY KEY (clause_type_id, block_id)
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
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_templates_ct_typ
      ON sentence_templates(clause_type_id, typology)
  `);
}

// ── Helpers JSON ─────────────────────────────────────────

const j = (v: any) => JSON.stringify(v);
const pj = (s: string | null): any => { try { return JSON.parse(s ?? '[]'); } catch { return []; } };

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

// ── Init ─────────────────────────────────────────────────

export async function initPragmaticDb(): Promise<void> {
  if (!isTauri()) return;
  const db = await getDb();
  await ensureSchema(db);

  // Seed functions if empty
  const fnCount = (await db.select('SELECT COUNT(*) as c FROM grammatical_functions')) as Row[];
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
  const blkCount = (await db.select('SELECT COUNT(*) as c FROM construction_blocks')) as Row[];
  if (blkCount[0].c === 0) {
    for (const [id, blk] of Object.entries(PRAGMATIC_BLOCKS)) {
      await db.execute(
        `INSERT INTO construction_blocks (id, label, description, required) VALUES ($1, $2, $3, $4)`,
        [id, blk.label, blk.description, blk.required ? 1 : 0],
      );
    }
  }

  // Seed clause types if empty
  const ctCount = (await db.select('SELECT COUNT(*) as c FROM pragmatic_clause_types')) as Row[];
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
  await ensureSchema(db);
  const rows = (await db.select('SELECT * FROM grammatical_functions ORDER BY label')) as Row[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    category: r.category,
    fillsSlots: pj(r.fills_slots),
    commonInClauseTypes: pj(r.common_in),
  }));
}

// ── Clause types ──────────────────────────────────────────

export async function getPragmaticClauseTypes(): Promise<PragmaticClauseType[]> {
  if (!isTauri()) return SEED_CLAUSE_TYPES as PragmaticClauseType[];
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select('SELECT * FROM pragmatic_clause_types ORDER BY id')) as Row[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    blocks: pj(r.blocks),
    templates: JSON.parse(r.templates ?? '{}'),
  }));
}

export async function getClauseType(id: string): Promise<PragmaticClauseType | null> {
  const types = await getPragmaticClauseTypes();
  return types.find((t) => t.id === id) ?? null;
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
  await ensureSchema(db);
  const rows = (await db.select('SELECT * FROM construction_blocks')) as Row[];
  const result: Record<string, PragmaticBlock> = {};
  for (const r of rows) {
    result[r.id] = {
      id: r.id,
      label: r.label,
      description: r.description,
      required: !!r.required,
      morphologyOverride: r.morphology_override,
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
  const rows = (await db.select('SELECT block_id, function_id FROM block_slot_fillers ORDER BY block_id')) as Row[];
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
    return (ct as any)?.templates?.[typology] ?? [];
  }
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select(
    'SELECT template FROM sentence_templates WHERE clause_type_id = $1 AND typology = $2 ORDER BY id',
    [clauseTypeId, typology],
  )) as Row[];
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

export interface PragmaticEngineState {
  typology: TypologyProfile;
  activeClauseType: string | null;
  slots: PragmaticSlotState[];
}

export function createDefaultPragmaticState(): PragmaticEngineState {
  return {
    typology: 'isolating',
    activeClauseType: null,
    slots: [],
  };
}
