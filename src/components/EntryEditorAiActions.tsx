import React from 'react';
import Tooltip from './Tooltip';
import SparkleIcon from './icons/SparkleIcon';
import WandIcon from './icons/WandIcon';
import { GenerationMode } from '../types';

export interface EntryEditorAiActionsProps {
  generationModes: GenerationMode[];
  onToggleGenerationMode: (mode: GenerationMode) => void;
  onGenerate: () => void;
  onComplete: () => void;
  isGenerating: boolean;
  isCompleting: boolean;
  isAiDisabled: boolean;
  hasCategory: boolean;
  activeModeDescription: string;
  generationModeOptions: { id: GenerationMode; label: string; tip: string }[];
}

const EntryEditorAiActions = ({
  generationModes,
  onToggleGenerationMode,
  onGenerate,
  onComplete,
  isGenerating,
  isCompleting,
  isAiDisabled,
  hasCategory,
  activeModeDescription,
  generationModeOptions,
}: EntryEditorAiActionsProps) => {
  const isGenerateDisabled = isAiDisabled || !hasCategory || generationModes.length === 0;

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div>
        <span className="flex items-center text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
          Modo de generación
          <Tooltip text={activeModeDescription} />
        </span>
        <div className="flex gap-1 bg-background p-0.5 rounded border border-subtle">
          {generationModeOptions.map(opt => {
            const active = generationModes.includes(opt.id);
            return (
              <Tooltip key={opt.id} text={opt.tip} className="flex-1">
                <button
                  type="button"
                  onClick={() => onToggleGenerationMode(opt.id)}
                  aria-pressed={active}
                  className={`w-full py-1.5 text-[10px] font-bold rounded uppercase transition-all duration-200 ${active ? 'bg-gradient-to-br from-accent to-accent-hover text-white shadow-[0_0_14px_rgba(225,29,72,0.55)] ring-1 ring-accent/60' : 'text-text-secondary hover:bg-subtle hover:text-text-primary'}`}
                >
                  {opt.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div className="flex gap-1">
        <Tooltip text="Generar: crea Raíz + Léxema desde el Significado y la Categoría usando los modos seleccionados." className="flex-grow">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerateDisabled}
            className="w-full py-3 bg-background border border-accent text-accent font-bold rounded-md hover:bg-accent/10 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 text-xs"
            tabIndex={6}
          >
            <SparkleIcon className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generando...' : 'Generar Raíz y Léxema'}
          </button>
        </Tooltip>
        <Tooltip text="Completar entrada con IA: rellena los campos que falten de una entrada parcial (Significado, Categoría, Raíz, Léxema).">
          <button
            type="button"
            onClick={onComplete}
            disabled={isAiDisabled}
            className="px-4 py-3 bg-background border border-accent text-accent font-bold rounded-md hover:bg-accent/10 disabled:opacity-30 transition-all flex items-center justify-center"
            tabIndex={7}
          >
            <WandIcon className={`h-4 w-4 ${isCompleting ? 'animate-spin' : ''}`} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

EntryEditorAiActions.displayName = 'EntryEditorAiActions';

export default EntryEditorAiActions;
