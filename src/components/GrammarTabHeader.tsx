import React from 'react';
import SaveIcon from './icons/SaveIcon';
import SparkleIcon from './icons/SparkleIcon';
import DownloadIcon from './icons/DownloadIcon';

export interface GrammarTabHeaderProps {
  activeModule: 'overview' | 'phonology' | 'typology' | 'morphology' | 'syntax' | 'semantics' | 'roles' | 'strategies' | 'pragmatic' | 'notes';
  onOpenWizard: () => void;
  onOpenImporter: () => void;
  onSave: () => void;
  isDirty: boolean;
  onExportGrammar?: () => void;
}

const GrammarTabHeader = ({
  activeModule,
  onOpenWizard,
  onOpenImporter,
  onSave,
  isDirty,
  onExportGrammar,
}: GrammarTabHeaderProps) => {
  const titleMap = {
    overview: 'Resumen',
    phonology: 'Fonología',
    typology: 'Tipología',
    morphology: 'Morfología',
    syntax: 'Sintaxis',
    semantics: 'Semántica',
    roles: 'Roles Sintácticos',
    strategies: 'Estrategias Morfosintácticas',
    pragmatic: 'Pragmática',
    notes: 'Notas',
  };

  return (
    <div className="bg-surface border-b border-border-dark p-4 flex justify-between items-center shadow-md z-10">
      <h2 className="text-xl font-bold text-white">{titleMap[activeModule]}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenWizard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
        >
          <SparkleIcon className="w-4 h-4" />
          Asistente de gramática
        </button>
        <button
          onClick={onOpenImporter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
        >
          <SparkleIcon className="w-4 h-4" />
          Importar
        </button>
        <button
          onClick={onSave}
          disabled={!isDirty}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${isDirty ? 'bg-accent text-white shadow-accent/20 hover:bg-accent-hover' : 'bg-surface-light text-text-secondary cursor-not-allowed opacity-50'}`}
        >
          <SaveIcon className="w-4 h-4" />
          Guardar
        </button>
        {onExportGrammar && (
          <button
            onClick={onExportGrammar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-surface-light text-text-secondary border border-subtle hover:bg-subtle"
          >
            <DownloadIcon className="w-4 h-4" />
            Exportar Gramática
          </button>
        )}
      </div>
    </div>
  );
};

GrammarTabHeader.displayName = 'GrammarTabHeader';

export default GrammarTabHeader;
