import type { GrammarManifest, GenerativeProfile } from '../../types';

export const phonologyFromManifest = (m: GrammarManifest): Pick<GenerativeProfile, 'consonants' | 'vowels' | 'syllableStructures' | 'consonantClusters' | 'vowelClusters'> => {
  const p = m.phonology;
  if (!p) return { consonants: [], vowels: [], syllableStructures: [], consonantClusters: [], vowelClusters: [] };
  return {
    consonants: p.inventory.consonants,
    vowels: p.inventory.vowels,
    syllableStructures: p.phonotactics.syllableStructures,
    consonantClusters: p.phonotactics.consonantClusters ?? [],
    vowelClusters: p.phonotactics.vowelClusters ?? [],
  };
};
