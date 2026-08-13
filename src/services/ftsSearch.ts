/**
 * ftsSearch.ts
 * ----------------------------------------------------------------------------
 * Búsqueda full-text sobre LexiconData.
 *
 * En Tauri usa SQLite FTS5; en navegador cae a filtrado manual en memoria.
 * ----------------------------------------------------------------------------
 */
import type { LexiconData, LexiconEntry } from '../types';
import { normalizeText } from '../services/geminiService';

export interface SearchResult {
  entry: LexiconEntry;
  score: number;
  matches: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'-]+/)
    .filter((t) => t.length > 1);
}

function searchInMemory(data: LexiconData, query: string): SearchResult[] {
  const terms = tokenize(query);
  if (!terms.length) return [];

  return data.entries
    .map((entry) => {
      const haystacks = [
        entry.Raíz,
        ...(entry.Léxema || []),
        ...(entry.Significado || []),
        entry.Categoría,
        ...(entry.extraData?.notes || []),
      ]
        .filter(Boolean)
        .join(' ');

      const lower = haystacks.toLowerCase();
      const matches = terms.filter((t) => lower.includes(t));
      const score = matches.length / terms.length;

      return { entry, score, matches };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

async function searchWithFts5(lexiconName: string, query: string): Promise<SearchResult[]> {
  const db = await import('@tauri-apps/plugin-sql').then((mod: any) =>
    mod.default.load('sqlite:loxar.db'),
  );

  const rows = (await db.select(
    `SELECT data, bm25(lexicon_fts) AS rank
     FROM lexicon_fts
     WHERE lexicon_fts MATCH $1
     ORDER BY rank`,
    [query],
  )) as { data: string; rank: number }[];

  if (!rows.length) return [];

  const maxRank = rows[0]?.rank ?? 1;

  return rows
    .map((row) => {
      try {
        const parsed = JSON.parse(row.data) as LexiconEntry;
        const matches = tokenize(query).filter((term) =>
          [parsed.Raíz, ...(parsed.Léxema || []), ...(parsed.Significado || []), parsed.Categoría]
            .filter(Boolean)
            .some((value) => normalizeText(String(value)).includes(term)),
        );

        return {
          entry: parsed,
          score: matches.length ? 1 - Math.abs(row.rank) / (Math.abs(maxRank) || 1) : 0,
          matches,
        };
      } catch {
        return null;
      }
    })
    .filter((result): result is SearchResult => result !== null && result.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function searchLexicon(data: LexiconData, query: string, lexiconName?: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  if (lexiconName && typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__) {
    try {
      return await searchWithFts5(lexiconName, query);
    } catch {
      return searchInMemory(data, query);
    }
  }

  return searchInMemory(data, query);
}
