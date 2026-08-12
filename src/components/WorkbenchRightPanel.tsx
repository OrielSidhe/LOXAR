import React, { useState, useMemo } from 'react';
import { MissingWord, LexiconMetadata, GenerativeProfile, LexiconEntry, GenerationMode, GrammarManifest } from '../types';
import { WORD_LISTS } from '../data/wordLists';
import LightBulbIcon from './icons/LightBulbIcon';
import PlusIcon from './icons/PlusIcon';
import SparkleIcon from './icons/SparkleIcon';
import XCircleIcon from './icons/XCircleIcon';
import FilterIcon from './icons/FilterIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import DnaIcon from './icons/DnaIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import GenerativeProfileEditor, { PhonologySyncPayload } from './GenerativeProfileEditor';

interface WorkbenchRightPanelProps {
    suggestions: MissingWord[];
    listName: string;
    onClose: () => void;
    onAddManually: (word: MissingWord) => void;
    onGenerateAI: (word: MissingWord) => void;
    isLoading: boolean;
    activeMetadata: LexiconMetadata | null;
    // For browsing lists directly from workbench
    onSelectList: (listName: string) => void;
    onAnalyzeList: (listName: string) => void;
    // Generative Profile (3rd tab)
    generativeProfile: GenerativeProfile;
    generativeLexicon: LexiconEntry[];
    onSaveGenerativeProfile: (profile: GenerativeProfile) => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
    // Work queue + batch generation
    onEnqueue: (items: MissingWord[]) => void;
    onGenerateBatch: (items: MissingWord[], modes: GenerationMode[]) => void;
    generationModes: GenerationMode[];
    // Grammar manifest as canonical phonology source of truth
    manifest?: GrammarManifest;
    onSyncPhonology?: (p: PhonologySyncPayload) => void;
}

const WorkbenchRightPanel = ({
    suggestions, listName, onClose, onAddManually, onGenerateAI,
    isLoading, activeMetadata, onSelectList, onAnalyzeList,
    generativeProfile, generativeLexicon, onSaveGenerativeProfile, showNotification,
    onEnqueue, onGenerateBatch, generationModes, manifest, onSyncPhonology
}: WorkbenchRightPanelProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [activeView, setActiveView] = useState<'browse' | 'profile'>('browse');
    const [selectedListName, setSelectedListName] = useState('');
    const [browseSearch, setBrowseSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const listNames = Object.keys(WORD_LISTS);

    const categories = useMemo(() => {
        const cats = new Set(suggestions.map(s => s.Categoría).filter(Boolean));
        return Array.from(cats).sort();
    }, [suggestions]);

    const filteredSuggestions = useMemo(() => {
        return suggestions.filter(s => {
            const matchesSearch = s.Significado.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || s.Categoría === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [suggestions, searchTerm, filterCategory]);

    const selectedItems = useMemo(
        () => filteredSuggestions.filter(w => selectedKeys.has(w.Significado)),
        [filteredSuggestions, selectedKeys]
    );

    const toggleSelect = (significado: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            if (next.has(significado)) next.delete(significado);
            else next.add(significado);
            return next;
        });
    };

    const clearSelection = () => setSelectedKeys(new Set());

    const handleEnqueueSelected = () => {
        if (selectedItems.length === 0) return;
        onEnqueue(selectedItems.map(w => ({ Significado: w.Significado, Categoría: w.Categoría })));
        clearSelection();
    };

    const handleGenerateBatchSelected = () => {
        if (selectedItems.length === 0) return;
        onGenerateBatch(selectedItems.map(w => ({ Significado: w.Significado, Categoría: w.Categoría })), generationModes);
        clearSelection();
    };

    const selectedListWords = useMemo(() => {
        if (!selectedListName) return [];
        const list = WORD_LISTS[selectedListName] || [];
        if (!browseSearch) return list;
        return list.filter(w => w.palabra.toLowerCase().includes(browseSearch.toLowerCase()));
    }, [selectedListName, browseSearch]);

    const hasSuggestions = suggestions.length > 0;

    return (
        <div className="bg-surface rounded-lg shadow-lg border border-subtle flex flex-col h-full min-h-[500px] animate-fade-in overflow-hidden">
            {/* Header with tab switcher */}
            <header className="px-4 pt-4 pb-0 border-b border-subtle bg-background/30">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <LightBulbIcon className="h-5 w-5 text-accent" />
                        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Inspiración</h2>
                    </div>
                    {hasSuggestions && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-accent/20 text-accent rounded-full border border-accent/30">
                            {suggestions.length} pendientes
                        </span>
                    )}
                </div>
                <div className="flex gap-0">
                    <button
                        onClick={() => setActiveView('browse')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-all ${activeView === 'browse' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                        <BookOpenIcon className="h-3.5 w-3.5" /> Listas
                    </button>
                    <button
                        onClick={() => setActiveView('profile')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-all ${activeView === 'profile' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                        <DnaIcon className="h-3.5 w-3.5" /> Perfil Generativo
                    </button>
                </div>
            </header>

            {/* View: Browse Word Lists (+ suggestions tras Analizar) */}
            {activeView === 'browse' && (
                <div className="flex flex-col flex-grow overflow-hidden">
                    {/* List selector dropdown */}
                    <div className="p-3 border-b border-subtle bg-background/10 shrink-0">
                        <select
                            value={selectedListName}
                            onChange={e => { setSelectedListName(e.target.value); setBrowseSearch(''); }}
                            className="w-full bg-background border border-subtle rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="">Selecciona una lista…</option>
                            {listNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedListName ? (
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                            <div className="p-2 border-b border-subtle shrink-0">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Filtrar lista..."
                                        value={browseSearch}
                                        onChange={e => setBrowseSearch(e.target.value)}
                                        className="flex-1 bg-background border border-subtle rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                    />
                                    <button
                                        onClick={() => onAnalyzeList(selectedListName)}
                                        disabled={isLoading}
                                        className="px-2.5 py-1 bg-accent text-white text-[11px] font-bold rounded hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                                    >
                                        <SparkleIcon className="h-3 w-3" /> Analizar
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-0 divide-y divide-subtle">
                                {selectedListWords.map(item => (
                                    <button
                                        key={item.palabra}
                                        onClick={() => onAddManually({ Significado: item.palabra, Categoría: item.categoría })}
                                        className="text-left px-3 py-2 text-sm text-text-primary hover:bg-accent/10 hover:text-accent transition-colors truncate flex items-center gap-1.5 group"
                                        title={`Añadir "${item.palabra}" (${item.categoría}) al editor`}
                                    >
                                        <PlusIcon className="h-3 w-3 text-text-secondary/0 group-hover:text-accent/60 transition-colors shrink-0" />
                                        {item.palabra}
                                    </button>
                                ))}
                            </div>

                            {/* Sugerencias del análisis (antes tab "Sugerencias") */}
                            {hasSuggestions && (
                                <div className="mt-4 border-t border-subtle pt-3 px-2 pb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                            <SparkleIcon className="h-3.5 w-3.5 text-accent" /> Sugerencias del análisis ({suggestions.length})
                                        </h4>
                                        <button onClick={onClose} className="p-1 text-text-secondary hover:text-danger rounded" title="Limpiar sugerencias">
                                            <XCircleIcon className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {isLoading && suggestions.length === 0 ? (
                                        <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                                            <SparkleIcon className="h-4 w-4 text-accent animate-spin" /> Analizando léxico...
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredSuggestions.length > 0 && filteredSuggestions.every(w => selectedKeys.has(w.Significado))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedKeys(prev => new Set([...Array.from(prev), ...filteredSuggestions.map(w => w.Significado)]));
                                                        else setSelectedKeys(prev => new Set(Array.from(prev).filter(s => !filteredSuggestions.some(w => w.Significado === s))));
                                                    }}
                                                    className="h-4 w-4 accent-accent shrink-0"
                                                    title="Seleccionar todas las visibles"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Filtrar sugerencias..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="flex-1 bg-background border border-subtle rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                                                />
                                                {categories.length > 0 && (
                                                    <select
                                                        value={filterCategory}
                                                        onChange={e => setFilterCategory(e.target.value)}
                                                        className="bg-background border border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none flex items-center"
                                                        title="Filtrar por categoría (ej. solo verbos)"
                                                    >
                                                        <option value="all">Todas</option>
                                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            {selectedItems.length > 0 && (
                                                <div className="py-1.5 mb-2 border border-accent/30 bg-accent/5 flex items-center gap-1.5 rounded">
                                                    <span className="text-[11px] font-bold text-accent ml-1 mr-1">{selectedItems.length} sel.</span>
                                                    <button
                                                        onClick={handleEnqueueSelected}
                                                        disabled={isLoading}
                                                        className="flex-1 py-1 bg-background border border-accent/40 text-accent text-[11px] font-bold rounded hover:bg-accent/10 transition-all disabled:opacity-30"
                                                        title="Añadir las seleccionadas a la cola de trabajo"
                                                    >
                                                        <PlusIcon className="h-3 w-3 inline mr-1" /> A cola
                                                    </button>
                                                    <button
                                                        onClick={handleGenerateBatchSelected}
                                                        disabled={isLoading}
                                                        className="flex-1 py-1 bg-accent text-white text-[11px] font-bold rounded hover:bg-accent-hover transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                                                        title="Generar con IA las seleccionadas (aplica el modo activo)"
                                                    >
                                                        <SparkleIcon className="h-3 w-3" /> Lote IA
                                                    </button>
                                                    <button
                                                        onClick={clearSelection}
                                                        className="p-1 bg-background border border-subtle text-text-secondary rounded hover:text-danger transition-all"
                                                        title="Limpiar selección"
                                                    >
                                                        <XCircleIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="text-center py-3 text-text-secondary text-xs">
                                                {filteredSuggestions.length === 0 ? 'Sin resultados para este filtro.' : (
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-subtle">
                                                                <th className="p-2 w-4"></th>
                                                                <th className="p-2 text-left text-[11px] font-semibold text-text-secondary">{activeMetadata?.mainLanguage || 'Significado'}</th>
                                                                <th className="p-2 text-left text-[11px] font-semibold text-text-secondary hidden sm:table-cell">Cat.</th>
                                                                <th className="p-2 text-center text-[11px] font-semibold text-text-secondary w-16">Add</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredSuggestions.map((word) => (
                                                                <tr key={word.Significado} className={`border-t border-subtle hover:bg-accent/5 transition-colors group ${selectedKeys.has(word.Significado) ? 'bg-accent/10' : ''}`}>
                                                                    <td className="p-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedKeys.has(word.Significado)}
                                                                            onChange={() => toggleSelect(word.Significado)}
                                                                            className="h-4 w-4 accent-accent"
                                                                            title="Seleccionar para cola/lote"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2 text-text-primary font-semibold text-sm truncate">{word.Significado}</td>
                                                                    <td className="p-2 text-text-secondary text-[11px] italic hidden sm:table-cell truncate">{word.Categoría}</td>
                                                                    <td className="p-2">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                onClick={() => onAddManually(word)}
                                                                                disabled={isLoading}
                                                                                className="p-1 bg-background border border-subtle hover:border-accent hover:text-accent rounded transition-all disabled:opacity-30"
                                                                                title="Añadir al editor manualmente"
                                                                            >
                                                                                <PlusIcon className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => onGenerateAI(word)}
                                                                                disabled={isLoading}
                                                                                className="p-1 bg-background border border-accent/30 text-accent hover:bg-accent hover:text-white rounded transition-all disabled:opacity-30"
                                                                                title="Generar con IA"
                                                                            >
                                                                                <SparkleIcon className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <BookOpenIcon className="h-10 w-10 text-text-secondary/30" />
                            <p className="text-sm text-text-secondary">Selecciona una lista arriba para navegar sus palabras y añadirlas directamente al editor.</p>
                            <p className="text-xs text-text-secondary/60 italic">O usa "Analizar" para que la IA compare contra tu léxico actual y sugiera palabras faltantes.</p>
                        </div>
                    )}
                </div>
            )}

            {/* View: Generative Profile */}
            {activeView === 'profile' && (
                <div className="flex-grow overflow-hidden min-h-0">
                    <GenerativeProfileEditor
                        profile={generativeProfile}
                        lexicon={generativeLexicon}
                        showNotification={showNotification}
                        onSave={onSaveGenerativeProfile}
                        manifest={manifest}
                        onSyncPhonology={onSyncPhonology}
                    />
                </div>
            )}

            <footer className="p-2.5 border-t border-subtle bg-background/20 text-[10px] text-text-secondary/70 italic shrink-0">
                Haz clic en una palabra para añadirla al editor · <SparkleIcon className="h-2.5 w-2.5 inline" /> = generar con IA
            </footer>
        </div>
    );
};

export default WorkbenchRightPanel;
