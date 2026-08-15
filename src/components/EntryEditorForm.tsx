import React from 'react';
import Tooltip from './Tooltip';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import { mergeCategoryOptions, displayOf } from '../data/standardCategories';
import { resolveLexicalCategory } from '../data/taxonomy';
import SignificadoTagsInput from './SignificadoTagsInput';
import EntryDuplicateWarning from './EntryDuplicateWarning';
import EntryEditorIpaToggle from './EntryEditorIpaToggle';
import EntryEditorAiActions from './EntryEditorAiActions';

export interface EntryEditorFormProps {
  mode: 'add' | 'complete';
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isActionDisabled: boolean;
  submitButtonRef: React.Ref<HTMLButtonElement>;
  onSignificadoKeyDown: (e: React.KeyboardEvent) => void;
  onCategoriaKeyDown: (e: React.KeyboardEvent) => void;
  onRaizKeyDown: (e: React.KeyboardEvent) => void;
  onLexemaKeyDown: (e: React.KeyboardEvent) => void;
  activeMetadata: { mainLanguage?: string; conlangName?: string } | null;
  disabled: boolean;
  significados: string[];
  onSignificadosChange: (vals: string[]) => void;
  significadoInputRef: React.Ref<HTMLDivElement>;
  duplicateSignificados: any[];
  isAddingCategory: boolean;
  newCategoryInput: string;
  onNewCategoryInputChange: (value: string) => void;
  onConfirmNewCategory: () => void;
  onCancelNewCategory: () => void;
  formData: { Raíz: string; Léxema: string; Categoría: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  allCategories: string[];
  categoriaSelectRef: React.Ref<HTMLSelectElement>;
  duplicateRaices: any[];
  raizInputRef: React.Ref<HTMLInputElement>;
  duplicateLexemas: any[];
  lexemaInputRef: React.Ref<HTMLInputElement>;
  showIPA: boolean;
  onToggleIPA: () => void;
  error: string | null;
  generationModes: any[];
  onToggleGenerationMode: (mode: any) => void;
  onAiGenerate: () => void;
  onAiComplete: () => void;
  isGenerating: boolean;
  isCompleting: boolean;
  isAiButtonDisabled: boolean;
  activeModeDescription: string;
  generationModeOptions: { id: any; label: string; tip: string }[];
}

const EntryEditorForm = ({
  mode,
  onSubmit,
  isSubmitting,
  isActionDisabled,
  submitButtonRef,
  onSignificadoKeyDown,
  onCategoriaKeyDown,
  onRaizKeyDown,
  onLexemaKeyDown,
  activeMetadata,
  disabled,
  significados,
  onSignificadosChange,
  significadoInputRef,
  duplicateSignificados,
  isAddingCategory,
  newCategoryInput,
  onNewCategoryInputChange,
  onConfirmNewCategory,
  onCancelNewCategory,
  formData,
  onChange,
  allCategories,
  categoriaSelectRef,
  duplicateRaices,
  raizInputRef,
  duplicateLexemas,
  lexemaInputRef,
  showIPA,
  onToggleIPA,
  error,
  generationModes,
  onToggleGenerationMode,
  onAiGenerate,
  onAiComplete,
  isGenerating,
  isCompleting,
  isAiButtonDisabled,
  activeModeDescription,
  generationModeOptions,
}: EntryEditorFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Row 1: Significado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-4">
          <label htmlFor="Significado" className="flex items-center text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">
            {activeMetadata?.mainLanguage || 'Significado'}
            <Tooltip text="Escribe y presiona Enter o coma para añadir varios significados a la vez." />
          </label>
          <div ref={significadoInputRef} onKeyDown={onSignificadoKeyDown}>
            <SignificadoTagsInput
              id="Significado"
              values={significados}
              onChange={vals => onSignificadosChange(vals)}
              placeholder={`ej: ${activeMetadata?.mainLanguage ? activeMetadata.mainLanguage.toLowerCase() : 'bosque'}`}
              disabled={disabled}
              hasError={duplicateSignificados.length > 0}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Categoría + Raíz */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="Categoría" className="flex items-center text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">
            Categoría
            <Tooltip text="Escribe para filtrar las opciones (ej. 's' para sustantivo, 'v' para verbo)." />
          </label>
          {isAddingCategory ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="newCategoryInput"
                name="newCategoryInput"
                value={newCategoryInput}
                onChange={e => onNewCategoryInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onConfirmNewCategory(); } if (e.key === 'Escape') onCancelNewCategory(); }}
                placeholder="Nueva..." autoFocus
                className="w-full bg-background border border-accent rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="button" onClick={onConfirmNewCategory} className="p-2 text-success hover:bg-success/10 rounded"><SaveIcon className="h-5 w-5"/></button>
              <button type="button" onClick={onCancelNewCategory} className="p-2 text-danger hover:bg-danger/10 rounded"><CancelIcon className="h-5 w-5"/></button>
            </div>
          ) : (
            <select
              id="Categoría" name="Categoría"
              ref={categoriaSelectRef}
              value={formData.Categoría} onChange={onChange}
              onKeyDown={onCategoriaKeyDown}
              tabIndex={2}
              className="w-full bg-background border border-subtle rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Selecciona...</option>
              {allCategories.map(cat => <option key={cat} value={cat}>{displayOf(cat)}</option>)}
              <option value="add_new">+ Añadir nueva</option>
            </select>
          )}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="Raíz" className="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">Raíz (Etimo)</label>
          <input
            ref={raizInputRef}
            type="text" id="Raíz" name="Raíz"
            value={formData.Raíz}
            onChange={onChange}
            onKeyDown={onRaizKeyDown}
            placeholder="ej: BSK"
            tabIndex={3}
            className={`w-full bg-background border rounded px-3 py-2 text-text-primary font-mono text-center uppercase focus:outline-none focus:ring-2 focus:ring-accent ${duplicateRaices.length > 0 ? 'border-warning ring-1 ring-warning' : 'border-subtle'}`}
          />
        </div>
      </div>

      {/* Row 3: Léxema */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-4">
          <label htmlFor="Léxema" className="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">{activeMetadata?.conlangName || 'Léxema'}</label>
          <input
            ref={lexemaInputRef}
            type="text" id="Léxema" name="Léxema"
            value={formData.Léxema} onChange={onChange}
            onKeyDown={onLexemaKeyDown}
            placeholder="ej: boskel"
            tabIndex={4}
            className={`w-full bg-background border rounded px-3 py-2 text-accent font-bold text-xl focus:outline-none focus:ring-2 focus:ring-accent ${duplicateLexemas.length > 0 ? 'border-warning ring-1 ring-warning' : 'border-subtle'}`}
          />
        </div>
      </div>

      <EntryEditorIpaToggle showIPA={showIPA} onToggle={onToggleIPA} />

      <EntryDuplicateWarning
        duplicateLexemas={duplicateLexemas}
        duplicateRaices={duplicateRaices}
        duplicateSignificados={duplicateSignificados}
      />
      {error && <p className="text-danger text-sm">{error}</p>}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          ref={submitButtonRef}
          type="submit"
          disabled={isActionDisabled}
          tabIndex={5}
          className="flex-1 py-2.5 bg-accent text-white font-bold rounded-md shadow-lg hover:bg-accent-hover active:scale-95 transition-all disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
        >
          <SaveIcon className="h-5 w-5" />
          {isSubmitting ? 'Guardando...' : (mode === 'add' ? 'Registrar Palabra' : 'Actualizar y Seguir')}
        </button>

        <EntryEditorAiActions
          generationModes={generationModes}
          onToggleGenerationMode={onToggleGenerationMode}
          onGenerate={onAiGenerate}
          onComplete={onAiComplete}
          isGenerating={isGenerating}
          isCompleting={isCompleting}
          isAiDisabled={isAiButtonDisabled}
          hasCategory={!!formData.Categoría}
          activeModeDescription={activeModeDescription}
          generationModeOptions={generationModeOptions}
        />
      </div>
    </form>
  );
};

EntryEditorForm.displayName = 'EntryEditorForm';

export default EntryEditorForm;
