import React from 'react';
import InfoHint from './InfoHint';
import type { GrammarManifest } from '../types';

export interface GrammarTypologyPanelProps {
  manifest: GrammarManifest;
  onChange: (updates: Partial<GrammarManifest>) => void;
}

const GrammarTypologyPanel = ({ manifest, onChange }: GrammarTypologyPanelProps) => {
  const typology = manifest.typology || { wordOrder: '', alignment: '', morphology: '', headDirection: '' };

  const updateField = (field: 'wordOrder' | 'alignment' | 'morphology' | 'headDirection', value: string) => {
    onChange({
      typology: {
        ...typology,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">
          Tipología
          <InfoHint text="La tipología son los grandes rasgos de tu idioma: el orden por defecto de las palabras (SVO, SOV...), cómo se marcan los roles (Alineamiento) y cuánto se pegan los trocitos de significado (Morfología: aislante, aglutinante, fusional o polisintético)." />
        </h3>
        {[
          { field: 'wordOrder' as const, label: 'Orden de Palabras', options: ['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV', 'Libre'] },
          { field: 'alignment' as const, label: 'Alineamiento', options: ['Nominativo-Acusativo', 'Ergativo-Absolutivo', 'Split-Ergativo', 'Activo-Estativo'] },
          { field: 'morphology' as const, label: 'Tipo Morfológico', options: ['Aislante', 'Aglutinante', 'Fusional', 'Polisintético'] },
          { field: 'headDirection' as const, label: 'Dirección del Núcleo', options: ['Head-Initial', 'Head-Final', 'Mixed'] }
        ].map(({ field, label, options }) => (
          <div key={field}>
            <label className="block text-sm font-semibold text-text-secondary mb-2">{label}</label>
            <select
              value={typology[field] || ''}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full bg-surface border border-border-dark rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

GrammarTypologyPanel.displayName = 'GrammarTypologyPanel';

export default GrammarTypologyPanel;
