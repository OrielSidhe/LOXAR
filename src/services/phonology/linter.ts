import type { PhonologyConfig } from '../../types';

export interface PhonotacticIssue {
  msg: string;
  suggestion?: string;
  severity: 'error' | 'warning';
}

// Greedy longest-match segmentation against inventory strings.
// Handles multi-char graphemes (digraphs, IPA symbols, writing-system glyphs).
const segmentGraphemes = (word: string, inventory: string[]): string[] => {
  const sorted = [...inventory].sort((a, b) => b.length - a.length);
  const segments: string[] = [];
  let i = 0;
  while (i < word.length) {
    let matched = false;
    for (const entry of sorted) {
      if (word.slice(i, i + entry.length).toLowerCase() === entry.toLowerCase()) {
        segments.push(entry);
        i += entry.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      segments.push(word[i]);
      i++;
    }
  }
  return segments;
};

/**
 * Validates phonotactic constraints of a word according to a PhonologyConfig.
 * 
 * Checks performed:
 * 1. Segment inventory: all segments must belong to the inventory (consonants + vowels)
 * 2. Syllable structure: each syllable must match one of the allowed syllableStructures patterns
 * 3. Consonant clusters: if consonantClusters is defined, onsets/codas must use allowed clusters
 * 4. Max consonant cluster size: onset/coda clusters cannot exceed maxConsonantClusters
 * 
 * @param word - The word to validate (may contain multiple syllables)
 * @param config - The phonology configuration
 * @returns Array of issues found (empty if valid)
 */
export function lintPhonotactics(word: string, config: PhonologyConfig): PhonotacticIssue[] {
  const issues: PhonotacticIssue[] = [];

  if (!word || !config) {
    return issues; // Nothing to validate
  }

  const vowels = new Set(config.inventory.vowels.map(v => v.toLowerCase()));
  const consonants = new Set(config.inventory.consonants.map(c => c.toLowerCase()));
  const allInventoryStrings = [...config.inventory.vowels, ...config.inventory.consonants];
  const allSegments = new Set([...vowels, ...consonants]);

  // Strip whitespace and non-letter characters for analysis, but keep the structure
  const cleaned = word.toLowerCase().replace(/[^a-záéíóúüñ]/gi, '');
  if (!cleaned) {
    return issues; // Nothing to validate after cleaning
  }

  // Longest-match segmentation: multi-char inventory entries (digraphs, glyphs, etc.)
  const graphemes = segmentGraphemes(cleaned, allInventoryStrings);

  // Check 1: Segment inventory
  for (const seg of graphemes) {
    if (!allSegments.has(seg.toLowerCase())) {
      issues.push({
        msg: `Segment "${seg}" is not in the phoneme inventory`,
        suggestion: `Use one of: ${Array.from(allSegments).join(', ')}`,
        severity: 'error',
      });
    }
  }

  // Check 2 & 3: Syllable structure and consonant clusters
  // Use graphemes instead of characters for syllable grouping
  const finalSyllables: string[][] = [];
  let current: string[] = [];
  for (const seg of graphemes) {
    const isV = vowels.has(seg);
    const currentHasVowel = current.some(c => vowels.has(c));
    
    if (isV) {
      if (currentHasVowel) {
        finalSyllables.push(current);
        current = [seg];
      } else {
        current.push(seg);
      }
    } else {
      current.push(seg);
    }
  }
  if (current.length > 0) finalSyllables.push(current);
  
  for (const syl of finalSyllables) {
    const struct = syl.map(g => vowels.has(g) ? 'V' : 'C').join('');
    
    // Check 2: syllable structure match
    if (!config.phonotactics.syllableStructures.includes(struct)) {
      issues.push({
        msg: `Invalid syllable structure "${struct}" in "${syl.join('')}"`,
        suggestion: `Allowed structures: ${config.phonotactics.syllableStructures.join(', ')}`,
        severity: 'error',
      });
    }

    // Check 4 & 3: max consonant cluster size and allowed clusters
    // Extract actual consonant sequences (onset and coda) from the syllable
    const vowelIndex = syl.findIndex(c => vowels.has(c));
    const onsetLetters = vowelIndex > 0 ? syl.slice(0, vowelIndex) : [];
    const codaLetters = vowelIndex >= 0 ? syl.slice(vowelIndex + 1) : syl;
    
    const onsets = onsetLetters.join('');
    const codas = codaLetters.join('');
    
    for (const [cluster, clusterLetters] of [['onset', onsets], ['coda', codas]] as const) {
      if (clusterLetters.length > config.phonotactics.maxConsonantClusters) {
        issues.push({
          msg: `Consonant cluster "${clusterLetters}" (${cluster}) in "${syl.join('')}" exceeds maximum of ${config.phonotactics.maxConsonantClusters}`,
          suggestion: `Reduce cluster size or use allowed clusters: ${config.phonotactics.consonantClusters?.join(', ') || 'none specified'}`,
          severity: 'warning',
        });
      }

      // Check 3: allowed consonant clusters (if specified)
      if (config.phonotactics.consonantClusters && config.phonotactics.consonantClusters.length > 0) {
        if (clusterLetters.length >= 2 && !config.phonotactics.consonantClusters.includes(clusterLetters)) {
          issues.push({
            msg: `Consonant cluster "${clusterLetters}" (${cluster}) in "${syl.join('')}" is not in the allowed cluster list`,
            suggestion: `Use one of: ${config.phonotactics.consonantClusters.join(', ')}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Convenience function to check if a word is phonotactically valid.
 * @returns true if no error-level issues found
 */
export function isValidPhonotactics(word: string, config: PhonologyConfig): boolean {
  const issues = lintPhonotactics(word, config);
  return !issues.some(i => i.severity === 'error');
}
