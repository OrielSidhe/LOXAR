/**
 * sqlStorage.ts
 * ----------------------------------------------------------------------------
 * Thin persistence layer over the Tauri SQLite plugin (`tauri-plugin-sql`).
 *
 * DESIGN NOTE (prevents the 2969057 corruption class):
 *   - No lexicon JSON is ever embedded in source. It is serialized at runtime
 *     and stored as a TEXT column (`data`) in the `lexicons` table.
 *   - The plugin is imported dynamically so the browser/Vite build never
 *     tries to resolve a Tauri-only module.
 *   - In a non-Tauri context (`npm run dev` in the browser) every function
 *     falls back to `localStorage` transparently.
 * ----------------------------------------------------------------------------
 */
import type { LexiconData } from '../types';
import { normalizeLexiconData } from './normalize';
import { applyMigrations, CURRENT_SCHEMA_VERSION } from './schemaMigrations';

const DB_PATH = 'sqlite:loxar.db';
const STORAGE_PREFIX = 'conlang_lexicon_manager_';

/** True only when running inside the Tauri runtime. */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  // @ts-expect-error - injected by Tauri at runtime
  (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__);

type Row = { name: string; data: string };
type BackupRow = { id: number; name: string; data: string; createdAt: string };

let dbPromise: Promise<any> | null = null;

async function getDb(): Promise<any> {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql').then((mod: any) =>
      mod.default.load(DB_PATH),
    );
  }
  return dbPromise;
}

async function ensureSchema(db: any): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lexicons (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lexicon_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_backups_name
    ON lexicon_backups(name, createdAt DESC)
  `);
}

const MAX_BACKUPS_PER_LEXICON = 5;

async function pruneOldBackups(db: any, name: string): Promise<void> {
  const rows = (await db.select(
    `SELECT id FROM lexicon_backups WHERE name = $1 ORDER BY createdAt DESC`,
    [name],
  )) as { id: number }[];
  if (rows.length > MAX_BACKUPS_PER_LEXICON) {
    const toDelete = rows.slice(MAX_BACKUPS_PER_LEXICON);
    for (const row of toDelete) {
      await db.execute(`DELETE FROM lexicon_backups WHERE id = $1`, [row.id]);
    }
  }
}

export async function listLexiconNames(): Promise<string[]> {
  if (!isTauri()) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}list`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select('SELECT name FROM lexicons ORDER BY name')) as Row[];
  return rows.map((r) => r.name);
}

export async function loadLexicon(name: string): Promise<LexiconData | null> {
  if (!isTauri()) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
    if (!raw) return null;
    try {
      return normalizeLexiconData(JSON.parse(raw), name, '');
    } catch (e) {
      console.error(`Failed to normalize lexicon "${name}" from localStorage`, e);
      return null;
    }
  }
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select(
    'SELECT data FROM lexicons WHERE name = $1',
    [name],
  )) as Row[];
  if (rows.length === 0) return null;
  try {
    return normalizeLexiconData(JSON.parse(rows[0].data), name, '');
  } catch (e) {
    console.error(`Failed to normalize lexicon "${name}" from SQLite`, e);
    return null;
  }
}

export async function saveLexicon(name: string, data: LexiconData): Promise<void> {
  const payload = JSON.stringify(data);
  if (!isTauri()) {
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, payload);
    const names = new Set(await listLexiconNames());
    names.add(name);
    localStorage.setItem(`${STORAGE_PREFIX}list`, JSON.stringify([...names]));
    return;
  }
  const db = await getDb();
  await ensureSchema(db);

  // Backup existing data before overwrite.
  const existing = (await db.select(
    'SELECT data FROM lexicons WHERE name = $1',
    [name],
  )) as Row[];
  if (existing.length > 0) {
    await db.execute(
      'INSERT INTO lexicon_backups (name, data, createdAt) VALUES ($1, $2, $3)',
      [name, existing[0].data, new Date().toISOString()],
    );
    await pruneOldBackups(db, name);
  }

  await db.execute(
    'INSERT OR REPLACE INTO lexicons (name, data) VALUES ($1, $2)',
    [name, payload],
  );
}

export async function deleteLexicon(name: string): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
    const names = (await listLexiconNames()).filter((n) => n !== name);
    localStorage.setItem(`${STORAGE_PREFIX}list`, JSON.stringify(names));
    return;
  }
  const db = await getDb();
  await ensureSchema(db);
  await db.execute('DELETE FROM lexicons WHERE name = $1', [name]);
  await db.execute('DELETE FROM lexicon_backups WHERE name = $1', [name]);
}

export async function listBackups(name: string): Promise<BackupRow[]> {
  if (!isTauri()) return [];
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select(
    'SELECT id, name, data, createdAt FROM lexicon_backups WHERE name = $1 ORDER BY createdAt DESC',
    [name],
  )) as BackupRow[];
  return rows;
}

export async function restoreBackup(name: string, backupId: number): Promise<LexiconData | null> {
  if (!isTauri()) return null;
  const db = await getDb();
  await ensureSchema(db);
  const rows = (await db.select(
    'SELECT data FROM lexicon_backups WHERE id = $1 AND name = $2',
    [backupId, name],
  )) as Row[];
  if (rows.length === 0) return null;
  try {
    return normalizeLexiconData(JSON.parse(rows[0].data), name, '');
  } catch (e) {
    console.error(`Failed to restore backup ${backupId} for lexicon "${name}"`, e);
    return null;
  }
}
