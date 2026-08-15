import React from 'react';
import InfoHint from './InfoHint';
import type { GrammarManifest } from '../types';

export interface GrammarPhonologyPanelProps {
  manifest: GrammarManifest;
  onChange: (updates: Partial<GrammarManifest>) => void;
}

const GrammarPhonologyPanel = ({ manifest, onChange }: GrammarPhonologyPanelProps) => {
  const phonology = manifest.phonology || {
    inventory: { consonants: [], vowels: [] },
    phonotactics: { syllableStructures: [], maxConsonantClusters: 0 },
  };

  const updateInventory = (field: 'consonants' | 'vowels', value: string[]) => {
    onChange({
      phonology: {
        inventory: {
          consonants: phonology.inventory?.consonants || [],
          vowels: phonology.inventory?.vowels || [],
          [field]: value,
        },
        phonotactics: phonology.phonotactics || { syllableStructures: [], maxConsonantClusters: 0 },
      },
    });
  };

  const updatePhonotactics = (field: 'syllableStructures' | 'maxConsonantClusters', value: string[] | number) => {
    onChange({
      phonology: {
        inventory: phonology.inventory || { consonants: [], vowels: [] },
        phonotactics: {
          syllableStructures: field === 'syllableStructures' ? (value as string[]) : (phonology.phonotactics?.syllableStructures || []),
          maxConsonantClusters: field === 'maxConsonantClusters' ? (value as number) : (phonology.phonotactics?.maxConsonantClusters || 0),
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">
          Fonología
          <InfoHint text="La fonología define los sonidos que existen en tu idioma: las consonantes y las vocales, y las reglas fonotácticas (cómo se agrupan en sílabas, p.ej. 'CV' = consonante+vocal). El preview avisa si una palabra rompe estas reglas." />
        </h3>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">Consonantes</label>
          <input
            type="text"
            value={phonology.inventory?.consonants?.join(', ') || ''}
            onChange={(e) => updateInventory('consonants', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full bg-surface border border-border-dark rounded-lg px-4 py-2 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="p, t, k, b, d, g..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">Vocales</label>
          <input
            type="text"
            value={phonology.inventory?.vowels?.join(', ') || ''}
            onChange={(e) => updateInventory('vowels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full bg-surface border border-border-dark rounded-lg px-4 py-2 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="a, e, i, o, u..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">Estructura Silábica</label>
          <input
            type="text"
            value={phonology.phonotactics?.syllableStructures?.join(', ') || ''}
            onChange={(e) => updatePhonotactics('syllableStructures', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full bg-surface border border-border-dark rounded-lg px-4 py-2 text-white text-sm focus:border-primary focus:outline-none"
            placeholder="CVC, CV, CCV..."
          />
        </div>
      </div>
    </div>
  );
};

GrammarPhonologyPanel.displayName = 'GrammarPhonologyPanel';

export default GrammarPhonologyPanel;
