import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LexiconEntry, NewLexiconEntry, GenerationMode, LexiconMetadata } from '../types';
import SparkleIcon from './icons/SparkleIcon';
import WandIcon from './icons/WandIcon';
import WrenchIcon from './icons/WrenchIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import PlusIcon from './icons/PlusIcon';
import XCircleIcon from './icons/XCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import { inferRootFromLexeme } from '../services/parser';
import Tooltip from './Tooltip';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import { mergeCategoryOptions, displayOf } from '../data/standardCategories';
import { resolveLexicalCategory } from '../data/taxonomy';
import IPAKeyboard from './IPAKeyboard';

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

// ── Multi-Significado Tags Input ──────────────────────────────────────────────
interface SignificadoTagsInputProps {
    values: string[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    hasError?: boolean;
    id: string;
}

const SignificadoTagsInput = ({ values, onChange, placeholder, disabled, hasError, id }: SignificadoTagsInputProps) => {
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        // Split by comma to allow pasting multiple at once
        const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        const newVals = [...values, ...parts.filter(p => !values.includes(p))];
        onChange(newVals);
        setInputVal('');
    };

    const removeTag = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
            e.preventDefault();
            addTag(inputVal);
        } else if (e.key === 'Backspace' && !inputVal && values.length > 0) {
            removeTag(values.length - 1);
        }
    };

    return (
        <div
            onClick={() => inputRef.current?.focus()}
            className={`flex flex-wrap gap-1.5 min-h-[44px] w-full bg-background border rounded px-2 py-1.5 cursor-text transition-all ${hasError ? 'border-warning ring-1 ring-warning' : 'border-subtle focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
            {values.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 border border-accent/30 rounded-full text-sm text-accent font-semibold">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="hover:text-danger transition-colors ml-0.5">
                        <XCircleIcon className="h-3.5 w-3.5" />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                id={id}
                name={id}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
                placeholder={values.length === 0 ? (placeholder || 'Escribe y presiona Enter o coma...') : '+ significado'}
                disabled={disabled}
                className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-secondary/50"
                tabIndex={1}
            />
        </div>
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

    const handleLookupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (lookupTerm.trim()) onLookup(lookupTerm.trim());
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
                <header className="p-4 border-b border-subtle flex items-center justify-between bg-background/30">
                    <div className="flex items-center gap-3">
                        <WrenchIcon className="h-6 w-6 text-accent" />
                        <h2 id="entry-editor-heading" className="text-lg font-bold text-text-primary uppercase tracking-tight">Workbench</h2>
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-subtle">
                        <button onClick={() => onModeChange('add')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${mode === 'add' ? 'bg-accent text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)]' : 'text-text-secondary hover:text-text-primary'}`}>NUEVA</button>
                        <button onClick={() => onModeChange('complete')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${mode === 'complete' ? 'bg-accent text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)]' : 'text-text-secondary hover:text-text-primary'}`}>COMPLETAR ({incompleteCount})</button>
                    </div>
                </header>

                {mode === 'complete' && isCompleteWarning && (
                    <div className="mb-4 p-3 bg-success/20 border border-success text-green-300 rounded-md text-sm" role="status">
                        <p><strong>Nota:</strong> Esta entrada ya parece estar completa. Puedes editarla si es necesario.</p>
                    </div>
                )}

                <div className="p-5">
                    {aiBanner && (
                        <div className={`mb-4 p-3 rounded-md border text-sm flex items-center justify-between gap-3 ${aiBanner.success ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-danger/10 border-danger/40 text-danger'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0">{aiBanner.success ? '✦' : '⚠'}</span>
                                <span className="truncate">{aiBanner.success ? 'Resultado de IA aplicado a los campos. Revisa y guarda, o regenera.' : (aiBanner.message || 'Error de la IA')}</span>
                            </div>
                            {aiBanner.success && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button type="button" onClick={regenerateAi} className="px-2.5 py-1 rounded bg-accent/20 hover:bg-accent/30 text-accent font-bold text-xs transition-colors">Regenerar</button>
                                    <button type="button" onClick={() => setAiBanner(null)} className="px-2.5 py-1 rounded bg-surface hover:bg-subtle text-text-secondary text-xs transition-colors">Quitar</button>
                                </div>
                            )}
                        </div>
                    )}
                    {mode === 'complete' && (
                        <div className="mb-6 p-3 bg-background/50 rounded-md border border-subtle flex flex-col sm:flex-row items-center gap-4">
                            <form onSubmit={handleLookupSubmit} className="flex-grow flex gap-2 w-full">
                                <input
                                    type="text"
                                    value={lookupTerm}
                                    onChange={(e) => setLookupTerm(e.target.value)}
                                    placeholder="Buscar significado para completar..."
                                    className="flex-grow bg-surface border border-subtle rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button type="submit" className="px-3 py-1.5 bg-subtle text-text-primary text-sm font-semibold rounded hover:bg-gray-600 transition-colors">IR</button>
                            </form>
                            <div className="flex items-center gap-3 bg-surface p-1 rounded border border-subtle">
                                <button onClick={() => onNavigateIncomplete('prev')} disabled={incompleteCount === 0} className="p-1 rounded hover:bg-subtle disabled:opacity-30"><ArrowLeftIcon className="h-4 w-4"/></button>
                                <span className="text-xs text-text-secondary font-mono font-bold min-w-[40px] text-center">{incompleteCount > 0 ? `${incompleteIndex + 1}/${incompleteCount}` : '0/0'}</span>
                                <button onClick={() => onNavigateIncomplete('next')} disabled={incompleteCount === 0} className="p-1 rounded hover:bg-subtle disabled:opacity-30"><ArrowRightIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    )}

                    {mode === 'complete' && isCompleteWarning && (
                        <div className="mb-4 p-2 bg-success/10 border border-success/30 text-success text-xs rounded-md text-center italic">
                            Esta entrada ya está completa. Editando modo revisión.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Row 1: Significado (ancho completo: es la semilla del concepto) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-4">
                                <label htmlFor="Significado" className="flex items-center text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">
                                    {activeMetadata?.mainLanguage || 'Significado'}
                                    <Tooltip text="Escribe y presiona Enter o coma para añadir varios significados a la vez." />
                                </label>
                                <div ref={significadoInputRef} onKeyDown={handleSignificadoKeyDown}>
                                    <SignificadoTagsInput
                                        id="Significado"
                                        values={significados}
                                        onChange={vals => { setSignificados(vals); setIsAiPopulated(false); setError(null); }}
                                        placeholder={`ej: ${activeMetadata?.mainLanguage ? activeMetadata.mainLanguage.toLowerCase() : 'bosque'}`}
                                        disabled={disabled}
                                        hasError={duplicateSignificados.length > 0}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Categoría + Raíz (mitad y mitad: la raíz gana presencia) */}
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
                                            onChange={e => setNewCategoryInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewCategory(); } if (e.key === 'Escape') handleCancelNewCategory(); }}
                                            placeholder="Nueva..." autoFocus
                                            className="w-full bg-background border border-accent rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                        />
                                        <button type="button" onClick={handleConfirmNewCategory} className="p-2 text-success hover:bg-success/10 rounded"><SaveIcon className="h-5 w-5"/></button>
                                        <button type="button" onClick={handleCancelNewCategory} className="p-2 text-danger hover:bg-danger/10 rounded"><CancelIcon className="h-5 w-5"/></button>
                                    </div>
                                ) : (
                                    <select
                                        id="Categoría" name="Categoría"
                                        ref={categoriaSelectRef}
                                        value={formData.Categoría} onChange={handleChange}
                                        onKeyDown={handleCategoriaKeyDown}
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
                                    onChange={handleChange}
                                    onKeyDown={handleRaizKeyDown}
                                    placeholder="ej: BSK"
                                    tabIndex={3}
                                    className={`w-full bg-background border rounded px-3 py-2 text-text-primary font-mono text-center uppercase focus:outline-none focus:ring-2 focus:ring-accent ${duplicateRaices.length > 0 ? 'border-warning ring-1 ring-warning' : 'border-subtle'}`}
                                />
                            </div>
                        </div>

                        {/* Row 3: Léxema (ancho completo: es la palabra resultante) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-4">
                                <label htmlFor="Léxema" className="block text-[10px] font-bold text-text-secondary mb-1 uppercase tracking-widest">{activeMetadata?.conlangName || 'Léxema'}</label>
                                <input
                                    ref={lexemaInputRef}
                                    type="text" id="Léxema" name="Léxema"
                                    value={formData.Léxema} onChange={handleChange}
                                    onKeyDown={handleLexemaKeyDown}
                                    placeholder="ej: boskel"
                                    tabIndex={4}
                                    className={`w-full bg-background border rounded px-3 py-2 text-accent font-bold text-xl focus:outline-none focus:ring-2 focus:ring-accent ${duplicateLexemas.length > 0 ? 'border-warning ring-1 ring-warning' : 'border-subtle'}`}
                                />
                            </div>
                        </div>

                        {/* IPA Keyboard toggle */}
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => setShowIPA(!showIPA)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface border border-subtle hover:bg-accent hover:text-white transition-colors"
                                title="Toggle IPA keyboard"
                            >
                                <span className="font-mono">/ɑ/</span>
                                {showIPA ? 'Hide IPA' : 'IPA'}
                            </button>
                            {showIPA && <IPAKeyboard targetId="Léxema" />}
                        </div>

                        {/* Letrerito amarillo de precaución de duplicados */}
                        {(duplicateSignificados.length > 0 || duplicateRaices.length > 0 || duplicateLexemas.length > 0) && (
                            <div className="p-2.5 bg-warning/10 border border-warning/35 text-amber-200 rounded-md text-xs flex flex-col gap-1 shadow-[0_2px_8px_rgba(245,158,11,0.05)] animate-fade-in">
                                <div className="flex items-center gap-1.5 font-bold text-warning text-[11px] uppercase tracking-wider">
                                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                                    <span>Precaución: Coincidencias detectadas</span>
                                </div>
                                <div className="space-y-1.5 pl-5 mt-0.5">
                                    {duplicateLexemas.length > 0 && (
                                        <div>
                                            <span className="opacity-75">El léxema ya existe en: </span>
                                            <span className="font-semibold text-text-primary">{duplicateLexemas.map(e => `${e.Léxema.join(', ')} (${e.Categoría})`).join('; ')}</span>
                                        </div>
                                    )}
                                    {duplicateRaices.length > 0 && (
                                        <div>
                                            <span className="opacity-75">La raíz ya existe en: </span>
                                            <span className="font-semibold text-text-primary">{duplicateRaices.map(e => `${e.Léxema.join(', ')} (Raíz: ${e.Raíz})`).join('; ')}</span>
                                        </div>
                                    )}
                                    {duplicateSignificados.length > 0 && (
                                        <div>
                                            <span className="opacity-75">El significado ya existe en: </span>
                                            <span className="font-semibold text-text-primary">{duplicateSignificados.map(e => `${e.Léxema.join(', ')}: "${e.Significado.join(', ')}"`).join('; ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {error && <p className="text-danger text-sm">{error}</p>}

                        {/* Row 3: Actions */}
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

                            <div className="flex-1 flex flex-col gap-2">
                                {/* Modo de generación con descripción en tooltip */}
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
                                                        type="button" onClick={() => handleToggleGenerationMode(opt.id)}
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
                                {/* Acciones de IA */}
                                <div className="flex gap-1">
                                    <Tooltip text="Generar: crea Raíz + Léxema desde el Significado y la Categoría usando los modos seleccionados." className="flex-grow">
                                        <button type="button" onClick={handleAiGenerate} disabled={isAiButtonDisabled || !formData.Categoría || generationModes.length === 0} className="w-full py-3 bg-background border border-accent text-accent font-bold rounded-md hover:bg-accent/10 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 text-xs" tabIndex={6}>
                                            <SparkleIcon className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                            {isGenerating ? 'Generando...' : 'Generar Raíz y Léxema'}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Completar entrada con IA: rellena los campos que falten de una entrada parcial (Significado, Categoría, Raíz, Léxema).">
                                        <button type="button" onClick={handleAiComplete} disabled={isAiButtonDisabled} className="px-4 py-3 bg-background border border-accent text-accent font-bold rounded-md hover:bg-accent/10 disabled:opacity-30 transition-all flex items-center justify-center" tabIndex={7}>
                                            <WandIcon className={`h-4 w-4 ${isCompleting ? 'animate-spin' : ''}`} />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </fieldset>
        </div>
    );
};

export default EntryEditor;
