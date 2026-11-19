import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LexiconEntry, NewLexiconEntry, GenerationMode, LexiconMetadata } from '../types';
import { mergeCategoryOptions } from '../data/standardCategories';
import EntryEditorCompleteModeNav from './EntryEditorCompleteModeNav';
import EntryEditorHeader from './EntryEditorHeader';
import EntryEditorAiBanner from './EntryEditorAiBanner';
import EntryEditorCompleteWarning from './EntryEditorCompleteWarning';
import EntryEditorForm from './EntryEditorForm';
import {
    EMPTY_FORM_DATA,
    buildEntryBaseData,
    buildInitialFormState,
    findDuplicateLexemas,
    findDuplicateRaices,
    findDuplicateSignificados,
    generationModeOptions,
    getActiveModeDescription,
    getErrorMessage,
    isActionDisabled,
    isAiButtonDisabled,
    mapAiEntryResult,
    resolveNewCategory,
    toggleGenerationMode,
    type EntryEditorActionState,
    type EntryEditorFormData,
    type EntryEditorFormPayload,
    type EntryEditorInitialData,
} from '../utils/entryEditorModel';

interface EntryEditorProps {
    mode: 'add' | 'complete';
    onModeChange: (mode: 'add' | 'complete') => void;
    entryToEdit?: LexiconEntry;
    incompleteCount: number;
    incompleteIndex: number;
    onNavigateIncomplete: (direction: 'next' | 'prev') => void;
    onLookup: (significado: string) => void;
    onAddWord: (entry: NewLexiconEntry) => void;
    onUpdateWord: (id: string, entry: LexiconEntry) => void;
    onAiCompleteEntry: (partialEntry: EntryEditorFormPayload) => Promise<Record<string, unknown> | null>;
    onAiGenerateRootAndLexeme: (significado: string, categoria: string, modes: GenerationMode[]) => Promise<{ raiz: string; lexema: string } | null>;
    onCorrectSignificado: (significado: string) => Promise<string>;
    showNotification: (message: string, type: 'success' | 'error') => void;
    disabled?: boolean;
    initialDataForAdd?: Partial<NewLexiconEntry> | EntryEditorInitialData | null;
    setIsLoading: (loading: boolean) => void;
    setLoadingMessage: (message: string) => void;
    customCategories: string[];
    onAddCustomCategory: (category: string) => void;
    activeMetadata: LexiconMetadata | null;
    activeLexicon?: LexiconEntry[];
    generationModes: GenerationMode[];
    onGenerationModesChange: (modes: GenerationMode[]) => void;
    onQueueAdvance?: () => void;
}

const EntryEditor = (props: EntryEditorProps) => {
    const {
        mode, onModeChange, entryToEdit, incompleteCount, incompleteIndex,
        onNavigateIncomplete, onLookup, onAddWord, onUpdateWord,
        onAiCompleteEntry, onCorrectSignificado,
        showNotification, disabled = false, initialDataForAdd,
        generationModes, onGenerationModesChange, onQueueAdvance,
        setIsLoading, setLoadingMessage, customCategories, onAddCustomCategory,
        onAiGenerateRootAndLexeme, activeMetadata, activeLexicon = []
    } = props;

    // banner to show last AI result
    const [aiBanner, setAiBanner] = useState<{ success: boolean; message?: string } | null>(null);

    // form state uses arrays for significado now
    const [significados, setSignificados] = useState<string[]>([]);
    const [formData, setFormData] = useState<EntryEditorFormData>({ ...EMPTY_FORM_DATA });
    const [lookupTerm, setLookupTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiPopulated, setIsAiPopulated] = useState(false);
    const [showIPA, setShowIPA] = useState(false);
    const [isCompleteWarning, setIsCompleteWarning] = useState(false);
    const activeModeDescription = useMemo(() => getActiveModeDescription(generationModes), [generationModes]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState('');

    // Refs for focus management
    const significadoInputRef = useRef<HTMLDivElement>(null);
    const raizInputRef = useRef<HTMLInputElement>(null);
    const lexemaInputRef = useRef<HTMLInputElement>(null);
    const categoriaSelectRef = useRef<HTMLSelectElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);
    const lastAiAction = useRef<'generate' | 'complete' | null>(null);

    const allCategories = useMemo(() => mergeCategoryOptions(customCategories), [customCategories]);

    // Sync form when entryToEdit changes
    useEffect(() => {
        const initial = buildInitialFormState(entryToEdit, initialDataForAdd, mode);
        setSignificados(initial.significados);
        setFormData(initial.formData);
        setIsCompleteWarning(initial.isCompleteWarning);
        setError(null);
        setAiBanner(null);
        lastAiAction.current = null;
    }, [mode, entryToEdit, initialDataForAdd]);

    const duplicateSignificados = useMemo(
        () => findDuplicateSignificados(significados, activeLexicon, entryToEdit?.ID),
        [significados, activeLexicon, entryToEdit]
    );

    const duplicateRaices = useMemo(
        () => findDuplicateRaices(formData.Raíz, activeLexicon, entryToEdit?.ID),
        [formData.Raíz, activeLexicon, entryToEdit]
    );

    const duplicateLexemas = useMemo(
        () => findDuplicateLexemas(formData.Léxema, activeLexicon, entryToEdit?.ID),
        [formData.Léxema, activeLexicon, entryToEdit]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setIsAiPopulated(false);
        setAiBanner(null);

        if (name === "Categoría" && value === "add_new") {
            setIsAddingCategory(true);
            setNewCategoryInput('');
            return;
        }

        // ★ Force uppercase for Raíz
        const finalValue = name === 'Raíz' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        setError(null);
    };

    const handleConfirmNewCategory = () => {
        const { category, isNew } = resolveNewCategory(newCategoryInput, allCategories);
        if (!category) return;
        if (isNew) onAddCustomCategory(category);
        setFormData(prev => ({ ...prev, Categoría: category }));
        setIsAddingCategory(false);
        setNewCategoryInput('');
    };

    const handleCancelNewCategory = () => {
        setIsAddingCategory(false);
        setNewCategoryInput('');
    };

    const handleAiGenerate = async () => {
        if (!significados.length || !formData.Categoría.trim()) {
            setError("Se necesita 'Significado' y 'Categoría' para generar.");
            return;
        }
        if (generationModes.length === 0) { setError("Debes seleccionar al menos un modo de generación."); return; }
        setError(null);
        setIsGenerating(true);
        try {
            const result = await onAiGenerateRootAndLexeme(significados[0], formData.Categoría, generationModes);
            if (result) {
                setFormData(prev => ({ ...prev, Raíz: result.raiz.toUpperCase(), Léxema: result.lexema }));
                setIsAiPopulated(true);
                lastAiAction.current = 'generate';
                setAiBanner({ success: true, message: 'Raíz y Léxema generados por IA.' });
                showNotification("Raíz y Léxema generados por IA.", 'success');
            }
        } catch (e) {
            const message = getErrorMessage(e);
            setAiBanner({ success: false, message });
            showNotification(message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAiComplete = async () => {
        if (!significados.length) { setError("Se necesita al menos un 'Significado' para que la IA pueda completarlo."); return; }
        setError(null);
        setIsCompleting(true);
        try {
            const partialEntry: EntryEditorFormPayload = { ...formData, Significado: significados.join(', ') };
            const result = await onAiCompleteEntry(partialEntry);
            if (result) {
                const mapped = mapAiEntryResult(result);
                setFormData(mapped.formData);
                if (mapped.significados) {
                    setSignificados(mapped.significados);
                }
                setIsAiPopulated(true);
                lastAiAction.current = 'complete';
                setAiBanner({ success: true, message: 'Entrada completada por IA.' });
                showNotification("Entrada completada por IA.", 'success');
            }
        } catch (e) {
            const message = getErrorMessage(e);
            setAiBanner({ success: false, message });
            showNotification(message, 'error');
        } finally {
            setIsCompleting(false);
        }
    };

    const regenerateAi = () => {
        if (lastAiAction.current === 'generate') handleAiGenerate();
        else if (lastAiAction.current === 'complete') handleAiComplete();
    };

    // ★ Auto-focus back on significado after successful submit
    const focusSignificado = useCallback(() => {
        setTimeout(() => {
            // The SignificadoTagsInput wraps an input; find it
            const input = significadoInputRef.current?.querySelector('input');
            input?.focus();
        }, 50);
    }, []);

    // ★ El cursor inicia en Significado al abrir el editor o cambiar de modo
    useEffect(() => { focusSignificado(); }, [focusSignificado, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!significados.length || !formData.Categoría.trim()) {
            setError("Significado y Categoría son obligatorios.");
            return;
        }

        setError(null);
        setIsSubmitting(true);
        setLoadingMessage("Guardando entrada...");
        setIsLoading(true);

        try {
            const correctedSignificados = await Promise.all(significados.map(s => onCorrectSignificado(s)));
            const baseData = buildEntryBaseData(correctedSignificados, formData);

            if (mode === 'add') {
                const newEntry: NewLexiconEntry = {
                    ...baseData,
                    extraData: isAiPopulated ? { aiGenerated: true } : {},
                };
                onAddWord(newEntry);
                if (onQueueAdvance) onQueueAdvance();
                showNotification(`'${baseData.Léxema[0] || baseData.Significado[0]}' añadido.`, 'success');
                setFormData({ ...EMPTY_FORM_DATA });
                setSignificados([]);
                focusSignificado();
            } else if (mode === 'complete' && entryToEdit) {
                const newExtraData = { ...entryToEdit.extraData };
                if (isAiPopulated) newExtraData.aiGenerated = true;
                const updatedEntry: LexiconEntry = { ...entryToEdit, ...baseData, extraData: newExtraData };
                onUpdateWord(entryToEdit.ID, updatedEntry);
                // No avanzamos con 'next': al guardar, la entrada queda completa y sale
                // de la lista, así que la SIGUIENTE entrada incompleta "resbala" a este
                // mismo índice. El efecto de sincronización en App recarga el formulario
                // con ella (sin saltos raros por índice desfasado).
            }
        } catch (e) {
            showNotification(getErrorMessage(e), 'error');
        } finally {
            setIsSubmitting(false);
            setIsLoading(false);
            setIsAiPopulated(false);
            setAiBanner(null);
            lastAiAction.current = null;
        }
    };

    // ★ Tab key navigation: Significado → Categoría → Raíz → Léxema → Guardar
    const handleSignificadoKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            categoriaSelectRef.current?.focus();
        }
    }, []);

    const handleCategoriaKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            raizInputRef.current?.focus();
        }
    }, []);

    const handleRaizKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            lexemaInputRef.current?.focus();
        }
    }, []);

    const handleLexemaKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            submitButtonRef.current?.focus();
        }
    }, []);

    const handleToggleGenerationMode = (nextMode: GenerationMode) => {
        onGenerationModesChange(toggleGenerationMode(generationModes, nextMode));
    };

    const actionState: EntryEditorActionState = {
        isSubmitting,
        isGenerating,
        isCompleting,
        significados,
        categoria: formData.Categoría,
    };
    const actionDisabled = isActionDisabled(actionState);
    const aiButtonDisabled = isAiButtonDisabled(actionState);

    return (
        <div className={`bg-surface rounded-lg shadow-lg border border-subtle flex flex-col animate-fade-in ${disabled ? 'opacity-50' : ''}`}>
            <fieldset disabled={disabled} className="flex flex-col">
                <EntryEditorHeader
                  mode={mode}
                  onModeChange={onModeChange}
                  incompleteCount={incompleteCount}
                />

                {mode === 'complete' && isCompleteWarning && (
                    <div className="mb-4 p-3 bg-success/20 border border-success text-green-300 rounded-md text-sm" role="status">
                        <p><strong>Nota:</strong> Esta entrada ya parece estar completa. Puedes editarla si es necesario.</p>
                    </div>
                )}

                <div className="p-5">
                    <EntryEditorAiBanner
                      aiBanner={aiBanner}
                      onRegenerateAi={regenerateAi}
                      onDismissAiBanner={() => setAiBanner(null)}
                    />
                    {mode === 'complete' && (
                        <EntryEditorCompleteModeNav
                          lookupTerm={lookupTerm}
                          onLookupTermChange={setLookupTerm}
                          onLookup={onLookup}
                          onNavigateIncomplete={onNavigateIncomplete}
                          incompleteCount={incompleteCount}
                          incompleteIndex={incompleteIndex}
                        />
                    )}

                    {mode === 'complete' && <EntryEditorCompleteWarning isCompleteWarning={isCompleteWarning} />}

                    <EntryEditorForm
                      mode={mode}
                      onSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                      isActionDisabled={actionDisabled}
                      submitButtonRef={submitButtonRef}
                      onSignificadoKeyDown={handleSignificadoKeyDown}
                      onCategoriaKeyDown={handleCategoriaKeyDown}
                      onRaizKeyDown={handleRaizKeyDown}
                      onLexemaKeyDown={handleLexemaKeyDown}
                      activeMetadata={activeMetadata}
                      disabled={disabled}
                      significados={significados}
                      onSignificadosChange={vals => { setSignificados(vals); setIsAiPopulated(false); setError(null); }}
                      significadoInputRef={significadoInputRef}
                      duplicateSignificados={duplicateSignificados}
                      isAddingCategory={isAddingCategory}
                      newCategoryInput={newCategoryInput}
                      onNewCategoryInputChange={setNewCategoryInput}
                      onConfirmNewCategory={handleConfirmNewCategory}
                      onCancelNewCategory={handleCancelNewCategory}
                      formData={formData}
                      onChange={handleChange}
                      allCategories={allCategories}
                      categoriaSelectRef={categoriaSelectRef}
                      duplicateRaices={duplicateRaices}
                      raizInputRef={raizInputRef}
                      duplicateLexemas={duplicateLexemas}
                      lexemaInputRef={lexemaInputRef}
                      showIPA={showIPA}
                      onToggleIPA={() => setShowIPA(!showIPA)}
                      error={error}
                      generationModes={generationModes}
                      onToggleGenerationMode={handleToggleGenerationMode}
                      onAiGenerate={handleAiGenerate}
                      onAiComplete={handleAiComplete}
                      isGenerating={isGenerating}
                      isCompleting={isCompleting}
                      isAiButtonDisabled={aiButtonDisabled}
                      activeModeDescription={activeModeDescription}
                      generationModeOptions={generationModeOptions}
                    />
                </div>
            </fieldset>
        </div>
    );
};

export default EntryEditor;
