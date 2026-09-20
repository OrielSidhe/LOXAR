/**
 * phoneticGenerator.ts
 * ══════════════════════
 * Generador fonotáctico estocástico para LOXAR.
 *
 * Genera palabras nuevas (raíces/lexemas) a partir del inventario
 * fonológico del GenerativeProfile, usando selección aleatoria ponderada.
 *
 * En lugar de iterar todas las combinaciones posibles (explosión combinatoria),
 * selecciona fonemas aleatoriamente respetando:
 *   - Estructuras silábicas válidas (CVC, CV, CCV...)
 *   - Clusters consonánticos permitidos
 *   - Clusters vocálicos permitidos
 *   - Pesos configurables para variedad natural
 *
 * 100% local, sin dependencia de IA externa.
 */

import type { GenerativeProfile } from '../types';

// ── Tipos ──────────────────────────────────────────────────────

export interface GeneratedWord {
  form: string;
  structure: string; // Ej: "CVC", "CV"
  syllableCount: number;
}

export interface WordPool {
  words: GeneratedWord[];
  profile: GenerativeProfile;
  generated: number;
  attempted: number;
}

// ── Generador principal ────────────────────────────────────────

/**
 * Genera una sola palabra usando el perfil fonológico.
 */
export function generateWordStochastic(
  profile: GenerativeProfile,
  minSyllables: number = 1,
  maxSyllables: number = 4,
  seed?: number
): GeneratedWord {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;

  const { consonants, vowels, syllableStructures, consonantClusters, vowelClusters } = profile;

  if (consonants.length === 0 || vowels.length === 0) {
    throw new Error(
      'GenerativeProfile incompleto: se requieren al menos consonantes y vocales'
    );
  }

  // Elegir cantidad de sílabas
  const syllableCount = minSyllables + Math.floor(rng() * (maxSyllables - minSyllables + 1));
  
  // Elegir estructuras silábicas para cada sílaba
  const syllables: string[] = [];
  for (let i = 0; i < syllableCount; i++) {
    syllables.push(pickWeighted(syllableStructures, rng));
  }

  // Construir palabra sílaba por sílaba
  let word = '';
  for (const syllable of syllables) {
    word += generateSyllable(syllable, consonants, vowels, consonantClusters, vowelClusters, rng);
  }

  // Limpiar: eliminar caracteres no permitidos
  const validChars = [...consonants, ...vowels].join('');
  word = word.split('').filter(c => validChars.includes(c)).join('');

  return {
    form: word,
    structure: syllables.join('-'),
    syllableCount,
  };
}

/**
 * Genera un pool de N palabras únicas.
 */
export function generateWordPool(
  profile: GenerativeProfile,
  count: number,
  minSyllables: number = 1,
  maxSyllables: number = 4,
  maxAttempts: number = 0 // 0 = auto (count * 10)
): WordPool {
  const attempts = maxAttempts || count * 10;
  const pool = new Set<string>();
  let generated = 0;
  let attempted = 0;

  while (pool.size < count && attempted < attempts) {
    const result = generateWordStochastic(profile, minSyllables, maxSyllables, attempted);
    if (!pool.has(result.form) && result.form.length >= minSyllables) {
      pool.add(result.form);
      generated++;
    }
    attempted++;
  }

  return {
    words: Array.from(pool).map(form => ({
      form,
      structure: '', // Se puede calcular si es necesario
      syllableCount: 0,
    })),
    profile,
    generated,
    attempted,
  };
}

/**
 * Genera palabras con semilla reproducible (útil para testing).
 */
export function generateWordPoolSeeded(
  profile: GenerativeProfile,
  count: number,
  seed: number,
  minSyllables: number = 1,
  maxSyllables: number = 4
): GeneratedWord[] {
  const results: GeneratedWord[] = [];
  const rng = seededRandom(seed);

  for (let i = 0; i < count; i++) {
    const syllableCount = minSyllables + Math.floor(rng() * (maxSyllables - minSyllables + 1));
    const syllables: string[] = [];
    for (let s = 0; s < syllableCount; s++) {
      syllables.push(pickWeighted(profile.syllableStructures, rng));
    }
    let form = '';
    for (const syllable of syllables) {
      form += generateSyllable(syllable, profile.consonants, profile.vowels, profile.consonantClusters, profile.vowelClusters, rng);
    }
    const validChars = [...profile.consonants, ...profile.vowels].join('');
    form = form.split('').filter(c => validChars.includes(c)).join('');
    
    if (form.length > 0) {
      results.push({ form, structure: syllables.join('-'), syllableCount });
    }
  }

  return results;
}

// ── Funciones internas ─────────────────────────────────────────

function generateSyllable(
  structure: string,
  consonants: string[],
  vowels: string[],
  consonantClusters: string[],
  vowelClusters: string[],
  rng: () => number
): string {
  let syllable = '';
  
  for (let i = 0; i < structure.length; i++) {
    const slot = structure[i];
    
    if (slot === 'V') {
      syllable += pickWeighted(vowels, rng);
      
      // Cluster vocálico: si el siguiente slot es V, verificar clusters permitidos
      if (i + 1 < structure.length && structure[i + 1] === 'V') {
        syllable += findVowelCluster(vowels, vowelClusters, rng);
        i++; // Skip next V (ya lo procesamos como cluster)
      }
    } else if (slot === 'C') {
      syllable += pickWeighted(consonants, rng);
      
      // Cluster consonántico: si el siguiente slot es C, verificar clusters permitidos
      if (i + 1 < structure.length && structure[i + 1] === 'C') {
        syllable += findConsonantCluster(consonants, consonantClusters, rng);
        i++; // Skip next C
      }
    } else if (slot === 'V' || slot === 'C') {
      // Placeholder para extensiones futuras (ej: 'V?' = opcional)
      continue;
    }
  }
  
  return syllable;
}

function pickWeighted<T>(items: T[], rng: () => number): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  if (items.length === 1) return items[0];
  
  // Peso lineal: el primer item tiene peso 1, el último peso N
  // Esto da más variedad que peso uniforme
  const totalWeight = (items.length * (items.length + 1)) / 2;
  let r = rng() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    r -= (i + 1); // peso = i + 1
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function findConsonantCluster(
  consonants: string[],
  clusters: string[],
  rng: () => number
): string {
  if (clusters.length === 0) return pickWeighted(consonants, rng);
  const cluster = pickWeighted(clusters, rng);
  return cluster.length >= 2 ? cluster : pickWeighted(consonants, rng);
}

function findVowelCluster(
  vowels: string[],
  vowelClusters: string[],
  rng: () => number
): string {
  if (vowelClusters.length === 0) return pickWeighted(vowels, rng);
  const cluster = pickWeighted(vowelClusters, rng);
  return cluster.length >= 2 ? cluster : pickWeighted(vowels, rng);
}

// --- Seeded PRNG (Mulberry32) para reproducibilidad ---

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Utilidades ─────────────────────────────────────────────────

/**
 * Valida que un GenerativeProfile tenga los datos mínimos para generar.
 */
export function validateProfile(profile: GenerativeProfile): string[] {
  const errors: string[] = [];
  if (!profile.consonants || profile.consonants.length === 0) {
    errors.push('Se requiere al menos una consonante');
  }
  if (!profile.vowels || profile.vowels.length === 0) {
    errors.push('Se requiere al menos una vocal');
  }
  if (!profile.syllableStructures || profile.syllableStructures.length === 0) {
    errors.push('Se requiere al menos una estructura silábica');
  }
  return errors;
}
