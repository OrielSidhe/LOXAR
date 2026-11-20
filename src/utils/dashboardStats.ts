/**
 * dashboardStats.ts
 * ─────────────────
 * Derivación pura del objeto `stats` que `App.tsx` entrega al dashboard
 * (`DashboardTab` → `LanguageHomeCanvas` → `GraphCanvas`).
 *
 * Antes el objeto estaba inline en `App.tsx` (~24 líneas) mezclando tres fuentes
 * (manifiesto de gramática, léxico activo y entradas incompletas) con el render.
 * Ahora es un modelo puro con tests: `App.tsx` solo orquesta y `LanguageHomeCanvas`
 * importa el tipo desde acá (fuente única, sin duplicar la forma del objeto).
 */

import type { GrammarManifest, LexiconEntry } from '../types';
import { getGrammarMetrics } from './grammarMetrics';

/** Forma del objeto `stats` que consume `LanguageHomeCanvas`. */
export interface DashboardStats {
  grammar?: { rules?: number; categories?: number; strategies?: number; roles?: number };
  phonology?: { sounds?: number; rules?: number };
  syntax?: { rules?: number; trees?: number };
  lexicon?: { entries?: number; categories?: number };
  neography?: { glyphs?: number; rules?: number };
  semantics?: { fields?: number; relations?: number };
  translator?: { translations?: number };
  workbench?: { pending?: number; completed?: number };
  collections?: { collections?: number };
}

export interface DashboardStatsInput {
  /** Manifiesto de gramática activo; `null`/`undefined` deja los bloques de gramática vacíos. */
  grammar?: GrammarManifest | null;
  /** Entradas del léxico activo. */
  lexicon: LexiconEntry[];
  /** Cantidad de entradas incompletas (workbench). */
  incompleteCount: number;
}

/**
 * Construye el objeto `stats` del dashboard.
 *
 * Sin gramática activa los bloques `grammar`/`phonology`/`syntax` quedan en
 * `undefined` (el canvas los trata como 0) y las métricas de gramática no se
 * derivan, igual que en el objeto inline original.
 */
export const buildDashboardStats = ({
  grammar,
  lexicon,
  incompleteCount,
}: DashboardStatsInput): DashboardStats => {
  const metrics = getGrammarMetrics(grammar);
  const categories = new Set(
    lexicon.map(entry => entry.Categoría).filter(Boolean),
  ).size;

  return {
    grammar: grammar
      ? {
          rules: metrics.rules,
          categories: metrics.categories,
          strategies: metrics.strategies,
          roles: metrics.roles,
        }
      : undefined,
    phonology: grammar
      ? { sounds: metrics.phonologySounds, rules: metrics.phonologyRules }
      : undefined,
    syntax: grammar ? { rules: metrics.rules, trees: metrics.syntaxTrees } : undefined,
    lexicon: { entries: lexicon.length, categories },
    neography: undefined,
    semantics: { fields: 0, relations: 0 },
    translator: { translations: 0 },
    workbench: { pending: incompleteCount, completed: 0 },
    collections: { collections: 0 },
  };
};
