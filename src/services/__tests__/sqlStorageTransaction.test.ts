/**
 * CLN (P1 God Component): `sqlStorage` tipado estricto.
 *
 * `Database` de `@tauri-apps/plugin-sql` no expone `transaction()`: el código
 * anterior llamaba `db.transaction(...)` sobre un `any`, así que typecheck no lo
 * detectaba y en runtime Tauri habría lanzado `db.transaction is not a
 * function`. El helper `runInTransaction` hace BEGIN/COMMIT/ROLLBACK explícitos.
 * Estos tests fijan ese contrato.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LexiconData } from '../../types';

const mockLoad = vi.fn();
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: { load: mockLoad },
}));

type DbMock = {
  execute: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function makeDb(): DbMock {
  return {
    execute: vi.fn(async () => ({ rowsAffected: 0 })),
    select: vi.fn(async () => []),
  };
}

const originalWindow = (globalThis as unknown as { window?: unknown }).window;

import { saveLexicon, deleteLexicon, _resetDbCache } from '../sqlStorage';

const minimalLexicon = { name: 'Test', entries: [] } as unknown as LexiconData;

function queriesOf(db: DbMock): string[] {
  return db.execute.mock.calls.map((call) => String(call[0]));
}

describe('sqlStorage: transacciones SQLite explícitas', () => {
  let db: DbMock;

  beforeEach(() => {
    _resetDbCache();
    db = makeDb();
    mockLoad.mockReset();
    mockLoad.mockResolvedValue(db);
    (globalThis as unknown as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
    }
  });

  it('saveLexicon escribe dentro de BEGIN/COMMIT', async () => {
    await saveLexicon('Test', minimalLexicon);

    const queries = queriesOf(db);
    expect(queries).toContain('BEGIN TRANSACTION');
    expect(queries).toContain('COMMIT');
    expect(queries.indexOf('BEGIN TRANSACTION')).toBeLessThan(
      queries.indexOf('COMMIT'),
    );
    expect(queries.some((q) => q.includes('INSERT OR REPLACE INTO lexicons'))).toBe(true);
  });

  it('saveLexicon hace ROLLBACK y propaga el error original', async () => {
    db.execute.mockImplementation(async (query: string) => {
      if (query.includes('INSERT OR REPLACE')) {
        throw new Error('disk full');
      }
      return { rowsAffected: 0 };
    });

    await expect(saveLexicon('Test', minimalLexicon)).rejects.toThrow('disk full');
    const queries = queriesOf(db);
    expect(queries).toContain('BEGIN TRANSACTION');
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
  });

  it('deleteLexicon borra lexicón y backups dentro de BEGIN/COMMIT', async () => {
    await deleteLexicon('Test');

    const queries = queriesOf(db);
    expect(queries).toContain('BEGIN TRANSACTION');
    expect(queries).toContain('COMMIT');
    expect(queries.some((q) => q.includes('DELETE FROM lexicons'))).toBe(true);
    expect(queries.some((q) => q.includes('DELETE FROM lexicon_backups'))).toBe(true);
  });

  it('deleteLexicon hace ROLLBACK cuando el borrado falla', async () => {
    db.execute.mockImplementation(async (query: string) => {
      if (query.includes('DELETE FROM lexicons')) {
        throw new Error('locked');
      }
      return { rowsAffected: 0 };
    });

    await expect(deleteLexicon('Test')).rejects.toThrow('locked');
    const queries = queriesOf(db);
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
  });
});
