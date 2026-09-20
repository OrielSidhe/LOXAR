/**
 * generators.ts — Asignación semántica inteligente
 * ═══════════════════════════════════════════════════
 * 
 * Toma un pool de formas fonotácticas generadas y las asigna
 * inteligentemente a significados del Extended Core Lexicon.
 * 
 * Estrategia:
 * 1. Agrupa raíces por patrón fonético (comparten estructura)
 * 2. Para cada grupo, sugiere categorías semánticas relacionadas
 * 3. Prioriza asignar a conceptos sin asignar
 * 4. Agrupa semánticamente si comparten morfología
 */

import type { CoreLexiconEntry, AssignedWord, CoreLexiconCategory } from '../../types/coreLexicon';
import type { GenerativeProfile } from '../../types';
import { SEMANTIC_CATEGORIES } from './categories';
import { generateWordPool } from '../../services/phoneticGenerator';
import type { GeneratedWord } from '../../services/phoneticGenerator';

// ── Función principal ──────────────────────────────────────────

/**
 * Asigna conceptos semánticos a un pool de palabras generadas.
 */
export function assignSemantics(
  phoneticPool: string[],
  coreLexicon: CoreLexiconEntry[],
  generativeProfile: GenerativeProfile
): AssignedWord[] {
  // 1. Cargar solo conceptos disponibles
  const available = coreLexicon.filter(c => c.status === 'available');
  
  if (available.length === 0) {
    // Si no quedan conceptos disponibles, devolver el pool sin asignar
    return phoneticPool.map(form => ({
      form,
      concept: '',
      category: 'Naturaleza' as CoreLexiconCategory,
      semanticField: '',
      status: 'pending' as const,
    }));
  }

  // 2. Agrupar por patrón fonético
  const grouped = groupByPhoneticPattern(phoneticPool);

  // 3. Asignar categoría semántica a cada grupo
  const assigned: AssignedWord[] = [];
  const usedConcepts = new Set<string>();
  let fieldIndex = 0;
  const fields = [...new Set(SEMANTIC_CATEGORIES.map(c => c.semanticField))];

  for (const [pattern, words] of Object.entries(grouped)) {
    // Elegir campo semántico rotando entre categorías
    const semanticField = fields[fieldIndex % fields.length];
    fieldIndex++;

    // Filtrar conceptos del campo que no han sido usados
    const fieldConcepts = available.filter(
      c => c.semanticField === semanticField && !usedConcepts.has(c.concept)
    );

    for (const word of words) {
      if (fieldConcepts.length === 0) break;
      
      const concept = fieldConcepts.shift()!;
      usedConcepts.add(concept.concept);

      // Encontrar la categoría
      const catInfo = SEMANTIC_CATEGORIES.find(c => c.semanticField === semanticField);
      
      assigned.push({
        form: word,
        concept: concept.concept,
        category: catInfo?.category ?? 'Naturaleza',
        semanticField,
        status: 'pending',
      });
    }
  }

  // 4. Si hay palabras sin asignar, asignar conceptos restantes
  const remainingWords = assigned.filter(a => !a.concept);
  const remainingConcepts = available.filter(c => !usedConcepts.has(c.concept));

  let conceptIdx = 0;
  for (const word of remainingWords) {
    if (conceptIdx >= remainingConcepts.length) break;
    const concept = remainingConcepts[conceptIdx++];
    const catInfo = SEMANTIC_CATEGORIES.find(c => c.semanticField === concept.semanticField);
    
    // Encontrar la posición de esta palabra en assigned
    const idx = assigned.findIndex(a => a.form === word.form && !a.concept);
    if (idx >= 0) {
      assigned[idx] = {
        ...assigned[idx],
        concept: concept.concept,
        category: catInfo?.category ?? 'Naturaleza',
        semanticField: concept.semanticField,
        status: 'pending',
      };
    }
  }

  return assigned;
}

// ── Funciones auxiliares ───────────────────────────────────────

/**
 * Agrupa palabras por patrón fonético (estructura silábica + características).
 */
function groupByPhoneticPattern(words: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const word of words) {
    const pattern = extractPhoneticPattern(word);
    if (!groups[pattern]) groups[pattern] = [];
    groups[pattern].push(word);
  }

  return groups;
}

/**
 * Extrae el patrón fonético de una palabra.
 * Ej: "cvc" para "aba", "CCV" para "gru"
 */
function extractPhoneticPattern(word: string): string {
  const vowels = 'aeiouáéíóúüAEIOUÁÉÍÓÚÜ';
  let pattern = '';
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (vowels.includes(char)) {
      pattern += 'V';
    } else {
      pattern += 'C';
    }
  }
  
  return pattern || word.length.toString();
}

/**
 * Sugiere una categoría semántica basada en el patrón fonético.
 * Para asignación coherente: palabras con estructura similar se agrupan
 * semánticamente.
 */
export function suggestCategory(
  pattern: string,
  coreLexicon: CoreLexiconEntry[],
  assignedConcepts: Set<string>
): CoreLexiconEntry | null {
  const available = coreLexicon.filter(
    c => c.status === 'available' && !assignedConcepts.has(c.concept)
  );

  if (available.length === 0) return null;

  // Contar cuántas palabras hay por campo semántico
  const fieldCounts = countByField(available);
  
  // Elegir el campo con más disponibilidad (para agrupar)
  const topField = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  return available.find(c => c.semanticField === topField) ?? available[0];
}

/**
 * Cuenta conceptos por campo semántico.
 */
function countByField(concepts: CoreLexiconEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of concepts) {
    counts[c.semanticField] = (counts[c.semanticField] ?? 0) + 1;
  }
  return counts;
}

// ── Export para el flujo de generación ─────────────────────────

/**
 * Flujo completo: genera palabras y las asigna semánticamente.
 */
export function generateAndAssign(
  generativeProfile: GenerativeProfile,
  coreLexicon: CoreLexiconEntry[],
  poolSize: number
): { words: string[]; assigned: AssignedWord[] } {
  // Generar pool fonotáctico
  const pool = generateWordPool(generativeProfile, poolSize);
  const words = pool.words.map((w: GeneratedWord) => w.form);

  // Asignar semánticamente
  const assigned = assignSemantics(words, coreLexicon, generativeProfile);

  return { words, assigned };
}
