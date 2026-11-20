import type { LexiconEntry, PhonologyConfig } from '../types';
import { segmentWordGraphemes, syllableStructureOf, syllabifyGraphemes } from '../services/grammar/phonology';

/**
 * Extracción fonológica del léxico (FASE FX del gauntlet v3.14).
 *
 * La filosofía del proyecto es "léxico + gramática primero": la fonología NO se
 * define a mano antes de tener datos, se INFIERE de las formas superficiales del
 * léxico activo y se presenta como un `PhonologyConfig` editable (el conlanguer
 * corrige, añade o borra). El resultado se fusiona con la fonología actual por
 * unión de conjuntos, así que reintentar el botón NUNCA duplica entradas.
 */

/** Vocales base; los diacríticos se resuelven con NFD (á -> a). `y`/`w` se tratan como consonantes (glides). */
const BASE_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Clasifica un grafema como vocal quitando diacríticos y bajando a minúscula. */
export const isVowelGrapheme = (grapheme: string): boolean => {
  const base = grapheme.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return BASE_VOWELS.has(base);
};

export interface GraphemeEvidence {
  grapheme: string;
  count: number;
  vowel: boolean;
}

export interface CountedStructure {
  structure: string;
  count: number;
}

export interface CountedCluster {
  cluster: string;
  count: number;
}

export interface PhonologyEvidence {
  wordCount: number;
  graphemes: GraphemeEvidence[];
  syllableStructures: CountedStructure[];
  consonantClusters: CountedCluster[];
  vowelClusters: CountedCluster[];
}

export interface PhonologyExtraction {
  phonology: PhonologyConfig;
  evidence: PhonologyEvidence;
}

const EMPTY_EVIDENCE: PhonologyEvidence = {
  wordCount: 0,
  graphemes: [],
  syllableStructures: [],
  consonantClusters: [],
  vowelClusters: [],
};

const emptyPhonology = (): PhonologyConfig => ({
  inventory: { consonants: [], vowels: [] },
  phonotactics: { syllableStructures: [], maxConsonantClusters: 0 },
});

/**
 * Formas superficiales del léxico: `Léxema` (todas) y, si la entrada no tiene,
 * `Raíz` como respaldo. Sin entradas no hay evidencia.
 */
export const collectWordForms = (entries: LexiconEntry[]): string[] =>
  entries.flatMap((entry) => {
    const forms = (entry.Léxema ?? []).filter((form) => Boolean(form));
    if (forms.length > 0) return forms;
    return entry.Raíz ? [entry.Raíz] : [];
  });

/** NFC + minúsculas + solo letras Unicode (quita guiones, espacios y puntuación). */
export const cleanWordForm = (form: string): string =>
  form.normalize('NFC').toLowerCase().replace(/[^\p{L}]/gu, '');

const countGraphemes = (forms: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const form of forms) {
    for (const grapheme of Array.from(form)) {
      counts.set(grapheme, (counts.get(grapheme) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * Umbral de frecuencia: con menos de 10 formas se conserva todo (un léxico de 2
 * entradas no puede filtrarse); de ahí en adelante se piden al menos el 2% de
 * las formas, con piso de 2, para no inflar el inventario con grafemas únicos.
 */
export const minCountFor = (wordCount: number): number =>
  wordCount >= 10 ? Math.max(2, Math.ceil(wordCount * 0.02)) : 1;

const byFrequencyDesc = (a: [string, number], b: [string, number]): number =>
  b[1] - a[1] || a[0].localeCompare(b[0]);

/** Unión preservando el orden y la primera grafía, deduplicando por minúscula. */
export const mergeUnique = (current: string[], incoming: string[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const value of [...current, ...incoming]) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
};

/** Secuencias consecutivas de >=2 grafemas del tipo pedido (vocales o consonantes). */
export const collectClusters = (graphemes: string[], vowel: boolean): string[] => {
  const clusters: string[] = [];
  let run = '';
  for (const grapheme of graphemes) {
    if (isVowelGrapheme(grapheme) === vowel) {
      run += grapheme;
    } else {
      if (run.length >= 2) clusters.push(run);
      run = '';
    }
  }
  if (run.length >= 2) clusters.push(run);
  return clusters;
};

/** Máxima seguidilla consecutiva del tipo pedido. */
export const maxRunOf = (graphemes: string[], vowel: boolean): number => {
  let max = 0;
  let run = 0;
  for (const grapheme of graphemes) {
    if (isVowelGrapheme(grapheme) === vowel) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
};

/**
 * Fusiona la fonología actual (manual o previamente extraída) con la recién
 * inferida. La unión es idempotente: aplicar el extractor dos veces produce
 * exactamente el mismo inventario y las mismas estructuras.
 */
export const mergePhonology = (current: PhonologyConfig, incoming: PhonologyConfig): PhonologyConfig => {
  const consonants = mergeUnique(current.inventory?.consonants ?? [], incoming.inventory?.consonants ?? []);
  const vowels = mergeUnique(current.inventory?.vowels ?? [], incoming.inventory?.vowels ?? []);
  const syllableStructures = mergeUnique(
    current.phonotactics?.syllableStructures ?? [],
    incoming.phonotactics?.syllableStructures ?? [],
  );
  const consonantClusters = mergeUnique(
    current.phonotactics?.consonantClusters ?? [],
    incoming.phonotactics?.consonantClusters ?? [],
  );
  const vowelClusters = mergeUnique(
    current.phonotactics?.vowelClusters ?? [],
    incoming.phonotactics?.vowelClusters ?? [],
  );

  return {
    inventory: { consonants, vowels },
    phonotactics: {
      syllableStructures,
      maxConsonantClusters: Math.max(
        current.phonotactics?.maxConsonantClusters ?? 0,
        incoming.phonotactics?.maxConsonantClusters ?? 0,
      ),
      ...(consonantClusters.length > 0 ? { consonantClusters } : {}),
      ...(vowelClusters.length > 0 ? { vowelClusters } : {}),
    },
  };
};

/**
 * Inferye un `PhonologyConfig` plausible a partir del léxico y lo fusiona con el
 * actual (si existe). Devuelve también la evidencia (frecuencias) para que la UI
 * pueda mostrar de dónde salió cada dato.
 */
export const extractPhonologyFromLexicon = (
  entries: LexiconEntry[],
  current?: PhonologyConfig,
): PhonologyExtraction => {
  const forms = collectWordForms(entries).map(cleanWordForm).filter(Boolean);

  if (forms.length === 0) {
    return { phonology: current ? mergePhonology(current, emptyPhonology()) : emptyPhonology(), evidence: EMPTY_EVIDENCE };
  }

  const minCount = minCountFor(forms.length);
  const graphemeCounts = countGraphemes(forms);
  const kept = [...graphemeCounts.entries()].filter(([, count]) => count >= minCount);
  const effective = kept.length > 0 ? kept : [...graphemeCounts.entries()];
  const inventory = effective.map(([grapheme]) => grapheme).sort((a, b) => a.localeCompare(b));

  const consonants = inventory.filter((grapheme) => !isVowelGrapheme(grapheme));
  const vowels = inventory.filter((grapheme) => isVowelGrapheme(grapheme));
  const inventorySet = new Set(inventory.map((grapheme) => grapheme.toLowerCase()));

  const structureCounts = new Map<string, number>();
  const consonantClusterCounts = new Map<string, number>();
  const vowelClusterCounts = new Map<string, number>();
  let maxConsonantClusters = 0;

  for (const form of forms) {
    const graphemes = segmentWordGraphemes(form, inventorySet);
    for (const syllable of syllabifyGraphemes(graphemes, isVowelGrapheme)) {
      const structure = syllableStructureOf(syllable, isVowelGrapheme);
      if (!structure) continue;
      structureCounts.set(structure, (structureCounts.get(structure) ?? 0) + 1);
    }
    for (const cluster of collectClusters(graphemes, false)) {
      consonantClusterCounts.set(cluster, (consonantClusterCounts.get(cluster) ?? 0) + 1);
    }
    for (const cluster of collectClusters(graphemes, true)) {
      vowelClusterCounts.set(cluster, (vowelClusterCounts.get(cluster) ?? 0) + 1);
    }
    maxConsonantClusters = Math.max(maxConsonantClusters, maxRunOf(graphemes, false));
  }

  const syllableStructures = [...structureCounts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort(byFrequencyDesc)
    .map(([structure]) => structure);
  const consonantClusters = [...consonantClusterCounts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort(byFrequencyDesc)
    .map(([cluster]) => cluster);
  const vowelClusters = [...vowelClusterCounts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort(byFrequencyDesc)
    .map(([cluster]) => cluster);

  const extracted: PhonologyConfig = {
    inventory: { consonants, vowels },
    phonotactics: {
      syllableStructures,
      maxConsonantClusters,
      ...(consonantClusters.length > 0 ? { consonantClusters } : {}),
      ...(vowelClusters.length > 0 ? { vowelClusters } : {}),
    },
  };

  const evidence: PhonologyEvidence = {
    wordCount: forms.length,
    graphemes: inventory.map((grapheme) => ({
      grapheme,
      count: graphemeCounts.get(grapheme) ?? 0,
      vowel: isVowelGrapheme(grapheme),
    })),
    syllableStructures: syllableStructures.map((structure) => ({
      structure,
      count: structureCounts.get(structure) ?? 0,
    })),
    consonantClusters: consonantClusters.map((cluster) => ({
      cluster,
      count: consonantClusterCounts.get(cluster) ?? 0,
    })),
    vowelClusters: vowelClusters.map((cluster) => ({
      cluster,
      count: vowelClusterCounts.get(cluster) ?? 0,
    })),
  };

  return {
    phonology: current ? mergePhonology(current, extracted) : extracted,
    evidence,
  };
};
