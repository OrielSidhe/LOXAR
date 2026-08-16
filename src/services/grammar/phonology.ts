import type { PhonologyConfig } from '../../types';

// Longest-match segmentation: given a set of inventory strings (possibly multi-char),
// greedily match the longest entry at each position. Falls back to single char if no match.
const segmentGraphemes = (word: string, inventory: Set<string>): string[] => {
  const sorted = [...inventory].sort((a, b) => b.length - a.length);
  const segments: string[] = [];
  let i = 0;
  const w = word.toLowerCase();
  while (i < w.length) {
    let matched = false;
    for (const entry of sorted) {
      if (w.slice(i, i + entry.length) === entry.toLowerCase()) {
        segments.push(entry);
        i += entry.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      segments.push(w[i]);
      i++;
    }
  }
  return segments;
};

const segSet = (p: PhonologyConfig): Set<string> =>
  new Set([...p.inventory.consonants, ...p.inventory.vowels].map(s => s.toLowerCase()));

export const validate = (word: string, p?: PhonologyConfig): string[] => {
  if (!p) return [];
  const inv = segSet(p);
  const violations: string[] = [];
  const cleaned = word.toLowerCase().replace(/[^\p{L}]/gu, '');
  for (const ch of cleaned) {
    if (!inv.has(ch)) violations.push(`Segmento fuera de inventario: "${ch}"`);
  }
  // syllable check: use longest-match segmentation, then classify each grapheme as V or C
  const graphemes = segmentGraphemes(cleaned, inv);
  const isVowel = (g: string) => vowelsSet.has(g.toLowerCase());
  const vowelsSet = new Set([...p.inventory.vowels.map(v => v.toLowerCase())]);
  const syl = groupIntoSyllables(graphemes, isVowel);
  for (const s of syl) {
    const struct = s.map(g => isVowel(g) ? 'V' : 'C').join('');
    if (!p.phonotactics.syllableStructures.includes(struct)) {
      violations.push(`Estructura silábica no permitida: "${struct}" en "${s.join('')}"`);
    }
  }
  return violations;
};

// Group grapheme array into syllables: each syllable gets one nucleus vowel.
// Consonants between two vowels belong to the FOLLOWING syllable (onset).
// Only trailing consonants after the LAST vowel are coda.
const groupIntoSyllables = (graphemes: string[], isVowel: (g: string) => boolean): string[][] => {
  const syllables: string[][] = [];
  let lastVowelIdx = -1;

  for (let i = 0; i < graphemes.length; i++) {
    if (!isVowel(graphemes[i])) continue;

    // This vowel starts a new syllable
    const start = lastVowelIdx + 1;
    // If there's a next vowel, stop at this vowel (consonants after = onset of next)
    let hasNextVowel = false;
    for (let j = i + 1; j < graphemes.length; j++) {
      if (isVowel(graphemes[j])) { hasNextVowel = true; break; }
    }
    const end = hasNextVowel ? i + 1 : graphemes.length;
    syllables.push(graphemes.slice(start, end));
    lastVowelIdx = i;
  }

  return syllables;
};
