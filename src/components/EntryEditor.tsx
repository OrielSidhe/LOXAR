import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LexiconEntry, NewLexiconEntry, GenerationMode, LexiconMetadata } from '../types';
import { inferRootFromLexeme } from '../services/parser';
import { mergeCategoryOptions, displayOf } from '../data/standardCategories';
import { resolveLexicalCategory } from '../data/taxonomy';
import EntryEditorCompleteModeNav from './EntryEditorCompleteModeNav';
import EntryEditorHeader from './EntryEditorHeader';
import EntryEditorAiBanner from './EntryEditorAiBanner';
import EntryEditorCompleteWarning from './EntryEditorCompleteWarning';
import EntryEditorForm from './EntryEditorForm';

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
    findDuplicateSignificados: (significado: string, currentEntryId?: string) => LexiconEntry[];
    onDuplicateFound: (searchTerm: string) => void;
    onAiCompleteEntry: (partialEntry: any) => Promise<any | null>;
    onAiGenerateRootAndLexeme: (significado: string, categoria: string, modes: GenerationMode[]) => Promise<{ raiz: string; lexema: string } | null>;
    onCorrectSignificado: (significado: string) => Promise<string>;
    showNotification: (message: string, type: 'success' | 'error') => void;
    disabled?: boolean;
    initialDataForAdd?: Partial<NewLexiconEntry> | { Significado?: string | string[]; Léxema?: string | string[]; Categoría?: string; Raíz?: string; extraData?: Record<string, any> } | null;
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

const generationModeOptions: { id: GenerationMode, name: string, label: string, tip: string }[] = [
    { id: 'generative', name: 'Perfil Generativo', label: 'Generativo', tip: 'Genera una palabra nueva siguiendo estrictamente las reglas del Perfil Generativo.' },
    { id: 'etymological', name: 'Etimológico', label: 'Etimológico', tip: 'Busca raíces de palabras relacionadas en tu léxico y las usa como inspiración.' },
    { id: 'derivational', name: 'Derivacional', label: 'Derivacional', tip: 'Crea una palabra aplicando los afijos definidos en tu Perfil Generativo.' },
];

const isEntryComplete = (entry: LexiconEntry): boolean => {
    return !!(
        entry.Significado?.[0]?.trim() &&
        entry.Categoría?.trim() &&
        entry.Categoría !== 'desconocida' &&
        entry.Categoría !== 'n/a' &&
        entry.Raíz?.trim() &&
        entry.Léxema?.[0]?.trim()
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const EntryEditor = (props: EntryEditorProps) => {
    const {
        mode, onModeChange, entryToEdit, incompleteCount, incompleteIndex,
        onNavigateIncomplete, onLookup, onAddWord, onUpdateWord,
        findDuplicateSignificados, onDuplicateFound, onAiCompleteEntry, onCorrectSignificado,
        showNotification, disabled = false, initialDataForAdd,
    generationModes, onGenerationModesChange, onQueueAdvance,
        setIsLoading, setLoadingMessage, customCategories, onAddCustomCategory,
        onAiGenerateRootAndLexeme, activeMetadata, activeLexicon = []
    } = props;

    // banner to show last AI result
    const [aiBanner, setAiBanner] = useState<{ success: boolean; message?: string } | null>(null);

    // form state uses arrays for significado now
    const [significados, setSignificados] = useState<string[]>([]);
    const [formData, setFormData] = useState({ Raíz: '', Léxema: '', Categoría: '' });
    const [lookupTerm, setLookupTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [duplicateEntries, setDuplicateEntries] = useState<LexiconEntry[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiPopulated, setIsAiPopulated] = useState(false);
    const [showIPA, setShowIPA] = useState(false);
    const [isCompleteWarning, setIsCompleteWarning] = useState(false);
    const activeModeDescription = useMemo(() => {
        if (generationModes.length === 0) return 'Selecciona al menos un modo para generar con IA.';
        return generationModes
            .map(m => generationModeOptions.find(o => o.id === m)?.tip)
            .filter(Boolean)
            .join(' ');
    }, [generationModes]);
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
        if (entryToEdit) {
            setSignificados(entryToEdit.Significado || []);
            setFormData({
                Raíz: entryToEdit.Raíz || '',
                Léxema: entryToEdit.Léxema.join(', ') || '',
                Categoría: entryToEdit.Categoría || '',
            });
            if (mode === 'complete') {
                setIsCompleteWarning(isEntryComplete(entryToEdit));
            }
        } else if (mode === 'add' && initialDataForAdd) {
            const initialSignificados = Array.isArray(initialDataForAdd.Significado)
                ? initialDataForAdd.Significado
                : initialDataForAdd.Significado
                    ? [initialDataForAdd.Significado]
                    : [];
            const initialLexemas = Array.isArray(initialDataForAdd.Léxema)
                ? initialDataForAdd.Léxema.join(', ')
                : initialDataForAdd.Léxema || '';

            setSignificados(initialSignificados);
            setFormData({
                Categoría: initialDataForAdd.Categoría || '',
                Raíz: initialDataForAdd.Raíz || '',
                Léxema: initialLexemas,
            });
            setIsCompleteWarning(false);
        } else {
            setSignificados([]);
            setFormData({ Raíz: '', Léxema: '', Categoría: '' });
            setIsCompleteWarning(false);
        }
        setError(null);
        setDuplicateEntries([]);
        setAiBanner(null);
        lastAiAction.current = null;
    }, [mode, entryToEdit, initialDataForAdd]);

    const duplicateSignificados = useMemo(() => {
        if (!significados.length || !activeLexicon) return [];
        return activeLexicon.filter(e => 
            e.ID !== entryToEdit?.ID && 
            e.Significado.some(sig => significados.map(s => s.toLowerCase().trim()).includes(sig.toLowerCase().trim()))
        );
    }, [significados, activeLexicon, entryToEdit]);

    const duplicateRaices = useMemo(() => {
        if (!formData.Raíz.trim() || !activeLexicon) return [];
        const currentRaiz = formData.Raíz.trim().toUpperCase();
        return activeLexicon.filter(e => 
            e.ID !== entryToEdit?.ID && 
            e.Raíz?.trim().toUpperCase() === currentRaiz
        );
    }, [formData.Raíz, activeLexicon, entryToEdit]);

    const duplicateLexemas = useMemo(() => {
        if (!formData.Léxema.trim() || !activeLexicon) return [];
        const currentLexemas = formData.Léxema.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        return activeLexicon.filter(e => 
            e.ID !== entryToEdit?.ID && 
            e.Léxema.some(l => currentLexemas.includes(l.toLowerCase().trim()))
        );
    }, [formData.Léxema, activeLexicon, entryToEdit]);

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
        const trimmedCategory = newCategoryInput.trim();
        if (!trimmedCategory) return;
        const resolved = resolveLexicalCategory(trimmedCategory);
        // Si taxonomy no reconoce la categoría (devuelve 'desconocida'),
        // la tratamos como categoría custom genuina — no la perdemos.
        const finalCategory = resolved === 'desconocida' && !trimmedCategory.match(/^(n\/a|sin_clasificar|pendiente|\?|-|n\.a|na|desconocid[oa])$/i)
          ? trimmedCategory.toLowerCase().replace(/\s+/g, '_')
          : resolved;
        if (!allCategories.includes(finalCategory) && !allCategories.includes(trimmedCategory)) {
            onAddCustomCategory(finalCategory);
        }
        setFormData(prev => ({ ...prev, Categoría: finalCategory }));
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
        } catch (e: any) {
            setAiBanner({ success: false, message: e.message });
            showNotification(e.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAiComplete = async () => {
        if (!significados.length) { setError("Se necesita al menos un 'Significado' para que la IA pueda completarlo."); return; }
        setError(null);
        setIsCompleting(true);
        try {
            const partialEntry = { ...formData, Significado: significados.join(', ') };
            const result = await onAiCompleteEntry(partialEntry);
            if (result) {
                // Mapeo flexible tolerante a acentos y mayúsculas/minúsculas
                const getProp = (obj: any, keys: string[]): string => {
                    for (const key of keys) {
                        const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        for (const objKey in obj) {
                            const normalizedObjKey = objKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                            if (normalizedKey === normalizedObjKey) {
                                const val = obj[objKey];
                                if (Array.isArray(val)) return val.join(', ');
                                return String(val || '');
                            }
                        }
                    }
                    return '';
                };

                const root = getProp(result, ['Raíz', 'Raiz', 'raiz', 'root']);
                const lexeme = getProp(result, ['Léxema', 'Lexema', 'lexema', 'lexeme']);
                const category = getProp(result, ['Categoría', 'Categoria', 'categoria', 'category']);
                const meaning = getProp(result, ['Significado', 'significado', 'meaning']);

                setFormData({
                    Raíz: root.toUpperCase(),
                    Léxema: lexeme,
                    Categoría: resolveLexicalCategory(category)
                });

                if (meaning) {
                    const meaningArray = meaning.split(',').map(s => s.trim()).filter(Boolean);
                    setSignificados(meaningArray);
                }

                setIsAiPopulated(true);
                lastAiAction.current = 'complete';
                setAiBanner({ success: true, message: 'Entrada completada por IA.' });
                showNotification("Entrada completada por IA.", 'success');
            }
        } catch (e: any) {
            setAiBanner({ success: false, message: e.message });
            showNotification(e.message, 'error');
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
            const finalLéxemaArray = formData.Léxema.split(',').map(s => s.trim()).filter(Boolean);

            let finalRaiz = formData.Raíz.trim().toUpperCase();
            if (!finalRaiz && finalLéxemaArray.length > 0) {
                finalRaiz = inferRootFromLexeme(finalLéxemaArray[0]).toUpperCase();
            }

            const baseData = {
                Raíz: finalRaiz,
                Léxema: finalLéxemaArray,
                Categoría: formData.Categoría,
                Significado: correctedSignificados,
            };

            if (mode === 'add') {
                const newEntry: NewLexiconEntry = {
                    ...baseData,
                    extraData: isAiPopulated ? { aiGenerated: true } : {},
                };
                onAddWord(newEntry);
                if (onQueueAdvance) onQueueAdvance();
                showNotification(`'${finalLéxemaArray[0] || correctedSignificados[0]}' añadido.`, 'success');
                setFormData({ Raíz: '', Léxema: '', Categoría: '' });
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
        } catch (e: any) {
            showNotification(e.message, 'error');
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

    const handleToggleGenerationMode = (mode: GenerationMode) => {
        onGenerationModesChange(
            (() => {
                const newModes = new Set(generationModes);
                if (newModes.has(mode)) {
                    if (newModes.size > 1) newModes.delete(mode);
                } else {
                    newModes.add(mode);
                }
                return Array.from(newModes);
            })()
        );
    };

    const isActionDisabled = isSubmitting || isGenerating || isCompleting || significados.length === 0 || !formData.Categoría.trim();
    const isAiButtonDisabled = isSubmitting || isGenerating || isCompleting || significados.length === 0;

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
                      isActionDisabled={isActionDisabled}
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
                      isAiButtonDisabled={isAiButtonDisabled}
                      activeModeDescription={activeModeDescription}
                      generationModeOptions={generationModeOptions}
                    />
                </div>
            </fieldset>
        </div>
    );
};

export default EntryEditor;
