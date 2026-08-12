/**
 * ftsSearch.ts
 * ----------------------------------------------------------------------------
 * Búsqueda full-text sobre LexiconData.
 *
 * En Tauri usa SQLite FTS5 virtual table; en navegador cae a
 * filtrado manual sobre `LexiconData` cargado en memoria.
 * ----------------------------------------------------------------------------
 */
import type { LexiconData, LexiconEntry } from '../types';

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

export async function searchLexicon(data: LexiconData, query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  // TODO: replace with real SQLite FTS5 query when available in tauri-plugin-sql
  return searchInMemory(data, query);
}
