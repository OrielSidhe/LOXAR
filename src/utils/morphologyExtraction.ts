import type { GrammarAffix, LexiconEntry, MorphologyPairEvidence } from '../types';
import { cleanWordForm } from './phonologyExtraction';

/**
 * Extracción morfológica del léxico (FASE MY del gauntlet v3.14).
 *
 * Misma filosofía que la extracción fonológica: la morfología NO se define a mano
 * antes de tener datos, se INFIERE de las formas superficiales del léxico activo
 * y se presenta como afijos EDITABLES con evidencia por regla (los pares
 * base → forma observados que la respaldan).
 *
 * Regla de inferencia: una entrada con `Raíz` = R y `Léxema` = F apoya un sufijo
 * cuando F = R + s (s no vacío), y un prefijo cuando F = p + R. Sin una raíz
 * registrada no hay evidencia: no se adivina.
 *
 * La fusión es por clave `tipo:forma` (dedupe de la grafía limpiada), así que
 * pulsar el botón dos veces NO duplica afijos.
 */

/** Longitudes razonables: una raíz de 1 letra produce falsos positivos masivos. */
export const MIN_ROOT_LENGTH = 2;
export const MAX_AFFIX_LENGTH = 5;
/** Tope de pares listados en la evidencia para no desbocar la UI. */
export const MAX_EVIDENCE_PAIRS = 5;

interface RawPair extends MorphologyPairEvidence {
  affix: string;
  type: 'prefix' | 'suffix';
}

export interface MorphologyExtraction {
  affixes: GrammarAffix[];
  evidence: {
    /** Entradas del léxico consideradas. */
    wordCount: number;
    /** Pares base → forma observados antes de agrupar. */
    pairCount: number;
  };
}

/** Un afijo plausible es una secuencia de 1 a 5 letras (ya limpiada de puntuación). */
export const isPlausibleAffix = (affix: string): boolean =>
  affix.length >= 1 && affix.length <= MAX_AFFIX_LENGTH;

/**
 * Umbral de respaldo por afijo: con menos de 6 pares se conserva todo (un
 * léxico pequeño no puede filtrarse); de ahí en adelante se exigen al menos 2
 * ocurrencias para no inventar reglas a partir de una sola coincidencia.
 */
export const minAffixCountFor = (pairCount: number): number => (pairCount >= 6 ? 2 : 1);

/**
 * Pares observados: por cada entrada, compara su raíz registrada con su primera
 * forma superficial. Devuelve pares duplicados si hay duplicados léxicos; el
 * agrupador los deduplica por `base→forma`.
 */
export const collectMorphologyPairs = (entries: LexiconEntry[]): RawPair[] => {
  const pairs: RawPair[] = [];
  for (const entry of entries) {
    const root = cleanWordForm(entry.Raíz ?? '');
    if (root.length < MIN_ROOT_LENGTH) continue;
    const forms = (entry.Léxema ?? []).filter((form) => Boolean(form));
    if (forms.length === 0) continue;
    const form = cleanWordForm(forms[0]);
    if (form.length <= root.length) continue;
    const meaning = entry.Significado?.[0] ?? '';
    const category = entry.Categoría ?? '';

    if (form.startsWith(root)) {
      const affix = form.slice(root.length);
      if (isPlausibleAffix(affix)) {
        pairs.push({ base: root, form, meaning, category, affix, type: 'suffix' });
      }
    } else if (form.endsWith(root)) {
      const affix = form.slice(0, form.length - root.length);
      if (isPlausibleAffix(affix)) {
        pairs.push({ base: root, form, meaning, category, affix, type: 'prefix' });
      }
    }
  }
  return pairs;
};

/** Deduplica pares por `base→forma` preservando el primero. */
export const dedupePairs = (pairs: MorphologyPairEvidence[]): MorphologyPairEvidence[] => {
  const seen = new Set<string>();
  const unique: MorphologyPairEvidence[] = [];
  for (const pair of pairs) {
    const key = `${pair.base}→${pair.form}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(pair);
  }
  return unique;
};

const affixKey = (type: 'prefix' | 'suffix', affix: string): string => `${type}:${affix}`;

const parseAffixKey = (key: string): { type: 'prefix' | 'suffix'; affix: string } => {
  const separator = key.indexOf(':');
  return { type: key.slice(0, separator) as 'prefix' | 'suffix', affix: key.slice(separator + 1) };
};

const displayForm = (type: 'prefix' | 'suffix', affix: string): string =>
  type === 'suffix' ? `-${affix}` : `${affix}-`;

/** Categoría más frecuente entre las formas que portan el afijo. */
const dominantCategory = (pairs: MorphologyPairEvidence[]): string => {
  const counts = new Map<string, number>();
  for (const pair of pairs) {
    if (!pair.category) continue;
    counts.set(pair.category, (counts.get(pair.category) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount || (count === bestCount && category.localeCompare(best) < 0)) {
      best = category;
      bestCount = count;
    }
  }
  return best;
};

const uniqueCategories = (pairs: MorphologyPairEvidence[]): string[] => {
  const counts = new Map<string, number>();
  for (const pair of pairs) {
    if (!pair.category) continue;
    counts.set(pair.category, (counts.get(pair.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([category]) => category);
};

const buildExtractedAffix = (
  type: 'prefix' | 'suffix',
  affix: string,
  pairs: MorphologyPairEvidence[],
): GrammarAffix => {
  const category = dominantCategory(pairs);
  return {
    id: `ext_${type}_${affix}`,
    form: displayForm(type, affix),
    type,
    meaning: category || `derivación ${type === 'suffix' ? 'sufija' : 'prefija'}`,
    appliesTo: uniqueCategories(pairs),
    source: 'lexicon',
    enabled: true,
    evidence: {
      count: pairs.length,
      pairs: pairs.slice(0, MAX_EVIDENCE_PAIRS),
    },
  };
};

/** Clave de dedupe del inventario: tipo + grafía limpiada (`-ka` y `ka` son el mismo sufijo). */
export const affixInventoryKey = (affix: GrammarAffix): string =>
  `${affix.type}:${cleanWordForm(affix.form)}`;

/**
 * Fusiona el inventario actual (manual o ya extraído) con lo recién inferido.
 * Idempotente: la segunda pasada encuentra las mismas claves y no añade nada.
 * Si el afijo existente no tenía evidencia y el inferido sí, se le adjunta.
 */
export const mergeAffixes = (current: GrammarAffix[], incoming: GrammarAffix[]): GrammarAffix[] => {
  const merged: GrammarAffix[] = [...current];
  const indexByKey = new Map<string, number>();
  merged.forEach((affix, index) => {
    if (affix) indexByKey.set(affixInventoryKey(affix), index);
  });

  for (const affix of incoming) {
    if (!affix) continue;
    const key = affixInventoryKey(affix);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(affix);
      continue;
    }
    const existing = merged[existingIndex];
    if (existing && !existing.evidence && affix.evidence) {
      merged[existingIndex] = { ...existing, evidence: affix.evidence };
    }
  }
  return merged;
};

/**
 * Infiere afijos del léxico y los fusiona con el inventario actual. Devuelve la
 * evidencia global (entradas y pares) para que la UI muestre de dónde salió
 * cada regla.
 */
export const extractMorphologyFromLexicon = (
  entries: LexiconEntry[],
  current?: GrammarAffix[],
): MorphologyExtraction => {
  const pairs = collectMorphologyPairs(entries);
  const evidence = { wordCount: entries.length, pairCount: pairs.length };

  if (pairs.length === 0) {
    return { affixes: current ?? [], evidence };
  }

  const minCount = minAffixCountFor(pairs.length);
  const groups = new Map<string, RawPair[]>();
  for (const pair of pairs) {
    const key = affixKey(pair.type, pair.affix);
    const list = groups.get(key) ?? [];
    list.push(pair);
    groups.set(key, list);
  }

  const inferred: GrammarAffix[] = [];
  for (const [key, list] of groups) {
    const unique = dedupePairs(list);
    if (unique.length < minCount) continue;
    const { type, affix } = parseAffixKey(key);
    inferred.push(buildExtractedAffix(type, affix, unique));
  }

  inferred.sort((a, b) => (b.evidence?.count ?? 0) - (a.evidence?.count ?? 0) || a.form.localeCompare(b.form));

  return { affixes: mergeAffixes(current ?? [], inferred), evidence };
};
