/**
 * grammarMetrics.ts
 * ────────────────
 * Single source of truth for the live grammar metrics rendered on the dashboard
 * (`LanguageHomeCanvas` → `GraphCanvas`) and for the pragmatic engine summary.
 *
 * The canonical manifest is `GrammarManifest` (src/types.ts), normalized by
 * `normalizeGrammarManifest` (Zod `z.object` strips unknown keys). Legacy shapes
 * carrying `morphology` / `syntax` / `categories` / `phonology.rules` do NOT
 * survive normalization, so reading those fields produced `NaN` / `0` metrics.
 * Always derive counts from the canonical fields below.
 */

import type { GrammarManifest } from '../types';

export interface GrammarMetrics {
  /** mutation rules + morphosyntactic strategies + affix inventory */
  rules: number;
  /** inflection paradigms (one per lexical category) */
  categories: number;
  strategies: number;
  roles: number;
  phonologySounds: number;
  phonologyRules: number;
  syntaxTrees: number;
}

const safeLength = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0;

export const getGrammarMetrics = (grammar?: GrammarManifest | null): GrammarMetrics => {
  const g = grammar;
  const strategies = safeLength(g?.strategies);
  const consonants = safeLength(g?.phonology?.inventory?.consonants);
  const vowels = safeLength(g?.phonology?.inventory?.vowels);

  return {
    rules: safeLength(g?.mutationRules) + strategies + safeLength(g?.affixInventory),
    categories: safeLength(g?.paradigms),
    strategies,
    roles: safeLength(g?.roles),
    phonologySounds: consonants + vowels,
    phonologyRules: safeLength(g?.phonology?.phonotactics?.syllableStructures),
    syntaxTrees: g?.clauseTree ? 1 : 0,
  };
};
