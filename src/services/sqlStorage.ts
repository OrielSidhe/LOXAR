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
import type Database from '@tauri-apps/plugin-sql';
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

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql').then((m) =>
      m.default.load(DB_PATH),
    ).catch((err) => {
      // Reset cache so the next call retries instead of returning a
      // permanently-rejected promise (cache poisoning recovery).
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
  await db.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS lexicon_fts USING fts5(
      name,
      content,
      tokenize = 'unicode61'
    )
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS lexicons_ai AFTER INSERT ON lexicons BEGIN
      INSERT INTO lexicon_fts(rowid, name, content) VALUES (new.rowid, new.name, new.data);
    END
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS lexicons_ad AFTER DELETE ON lexicons BEGIN
      INSERT INTO lexicon_fts(lexicon_fts, rowid, name, content) VALUES ('delete', old.rowid, old.name, old.data);
    END
  `);
  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS lexicons_au AFTER UPDATE ON lexicons BEGIN
      INSERT INTO lexicon_fts(lexicon_fts, rowid, name, content) VALUES ('delete', old.rowid, old.name, old.data);
      INSERT INTO lexicon_fts(rowid, name, content) VALUES (new.rowid, new.name, new.data);
    END
  `);
}

const MAX_BACKUPS_PER_LEXICON = 5;

async function pruneOldBackups(db: Database, name: string): Promise<void> {
  const rows = await db.select<{ id: number }[]>(
    `SELECT id FROM lexicon_backups WHERE name = $1 ORDER BY createdAt DESC`,
    [name],
  );
  if (rows.length > MAX_BACKUPS_PER_LEXICON) {
    const toDelete = rows.slice(MAX_BACKUPS_PER_LEXICON);
    for (const row of toDelete) {
      await db.execute(`DELETE FROM lexicon_backups WHERE id = $1`, [row.id]);
    }
  }
}

/**
 * `Database` (plugin-sql) no expone `transaction()`: la atomicidad se logra con
 * BEGIN/COMMIT/ROLLBACK explícitos. El rollback se intenta siempre y nunca
 * reemplaza el error original.
 */
type TransactionCallback<T> = (db: Database) => Promise<T>;

async function runInTransaction<T>(db: Database, work: TransactionCallback<T>): Promise<T> {
  await db.execute('BEGIN TRANSACTION');
  try {
    const result = await work(db);
    await db.execute('COMMIT');
    return result;
  } catch (err) {
    try {
      await db.execute('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Failed to roll back SQLite transaction', rollbackErr);
    }
    throw err;
  }
}

export async function listLexiconNames(): Promise<string[]> {
  if (!isTauri()) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}list`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }
  const db = await getDb();
  await ensureSchema(db);
  const rows = await db.select<Row[]>('SELECT name FROM lexicons ORDER BY name');
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
  const rows = await db.select<Row[]>(
    'SELECT data FROM lexicons WHERE name = $1',
    [name],
  );
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

  await runInTransaction(db, async () => {
    const existing = await db.select<Row[]>(
      'SELECT data FROM lexicons WHERE name = $1',
      [name],
    );
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
  });
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
  await runInTransaction(db, async () => {
    await db.execute('DELETE FROM lexicons WHERE name = $1', [name]);
    await db.execute('DELETE FROM lexicon_backups WHERE name = $1', [name]);
  });
}

export async function listBackups(name: string): Promise<BackupRow[]> {
  if (!isTauri()) return [];
  const db = await getDb();
  await ensureSchema(db);
  const rows = await db.select<BackupRow[]>(
    'SELECT id, name, data, createdAt FROM lexicon_backups WHERE name = $1 ORDER BY createdAt DESC',
    [name],
  );
  return rows;
}

export async function restoreBackup(name: string, backupId: number): Promise<LexiconData | null> {
  if (!isTauri()) return null;
  const db = await getDb();
  await ensureSchema(db);
  const rows = await db.select<Row[]>(
    'SELECT data FROM lexicon_backups WHERE id = $1 AND name = $2',
    [backupId, name],
  );
  if (rows.length === 0) return null;
  try {
    return normalizeLexiconData(JSON.parse(rows[0].data), name, '');
  } catch (e) {
    console.error(`Failed to restore backup ${backupId} for lexicon "${name}"`, e);
    return null;
  }
}
