import React, { useState } from 'react';
import InfoHint from './InfoHint';
import type { GrammarManifest, LexiconEntry } from '../types';
import { extractPhonologyFromLexicon, type PhonologyExtraction } from '../utils/phonologyExtraction';

export interface GrammarPhonologyPanelProps {
  manifest: GrammarManifest;
  onChange: (updates: Partial<GrammarManifest>) => void;
  /** Léxico activo: fuente de la extracción fonológica (FASE FX del gauntlet v3.14). */
  lexicon?: LexiconEntry[];
}

const GrammarPhonologyPanel = ({ manifest, onChange, lexicon = [] }: GrammarPhonologyPanelProps) => {
  const phonology = manifest.phonology || {
    inventory: { consonants: [], vowels: [] },
    phonotactics: { syllableStructures: [], maxConsonantClusters: 0 },
  };
  const [extraction, setExtraction] = useState<PhonologyExtraction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canExtract = lexicon.length > 0;

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

  /**
   * FASE FX: infiere la fonología del léxico y la fusiona con la actual. La fusión
   * es por unión de conjuntos, así que pulsar el botón dos veces no duplica nada.
   */
  const handleExtractFromLexicon = () => {
    if (!canExtract) {
      setExtraction(null);
      setNotice('El léxico está vacío: cargá o importá entradas antes de inferir la fonología.');
      return;
    }
    const result = extractPhonologyFromLexicon(lexicon, manifest.phonology);
    onChange({ phonology: result.phonology });
    setExtraction(result);
    setNotice(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">
          Fonología
          <InfoHint text="La fonología define los sonidos que existen en tu idioma: las consonantes y las vocales, y las reglas fonotácticas (cómo se agrupan en sílabas, p.ej. 'CV' = consonante+vocal). El preview avisa si una palabra rompe estas reglas." />
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border-dark bg-surface-dark/60 p-3">
          <div className="flex-1 text-sm text-text-secondary">
            <p className="font-semibold text-white">¿Todavía no definís la fonología?</p>
            <p>Se infiere del léxico activo: consonantes, vocales, estructuras silábicas y clusters observados. Todo queda editable acá abajo.</p>
          </div>
          <button
            type="button"
            onClick={handleExtractFromLexicon}
            className="shrink-0 rounded-lg border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
          >
            Extraer del léxico
          </button>
        </div>

        {notice && (
          <p className="text-xs text-amber-400" role="status">
            {notice}
          </p>
        )}
        {extraction && (
          <p className="text-xs text-text-secondary" data-testid="phonology-extraction-summary">
            Extraído de {extraction.evidence.wordCount} formas: {extraction.phonology.inventory.consonants.length} consonantes, {extraction.phonology.inventory.vowels.length} vocales, {extraction.phonology.phonotactics.syllableStructures.length} estructuras silábicas. Reintentar no duplica.
          </p>
        )}

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
