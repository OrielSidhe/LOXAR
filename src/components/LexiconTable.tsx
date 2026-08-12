import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { LexiconEntry, LexiconFilter } from '../types';
import { displayOf } from '../data/standardCategories';
import { resolveLexicalCategory } from '../data/taxonomy';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import LexiconFilters from './LexiconFilters';
import LayoutGridIcon from './icons/LayoutGridIcon';
import FilterIcon from './icons/FilterIcon';
import GitMergeIcon from './icons/GitMergeIcon';
import LoaderIcon from './icons/LoaderIcon';

const ITEMS_PER_PAGE = 25;

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Categorías canónicas de "sin clasificar" → la entrada sigue incompleta.
// Usamos el resolver de taxonomy para normalizar cualquier alias legacy.
const INCOMPLETE_CATEGORY_CANONICAL = new Set(['desconocida']);

const isEntryIncomplete = (entry: LexiconEntry): boolean => {
    if (!entry.Raíz?.trim()) return true;
    if (entry.Léxema.length === 0 || !entry.Léxema[0]?.trim()) return true;
    const resolved = resolveLexicalCategory(entry.Categoría);
    if (INCOMPLETE_CATEGORY_CANONICAL.has(resolved)) return true;
    return false;
};

// ── Category Color System ─────────────────────────────────────────────────────
const CATEGORY_PALETTE: [string, string][] = [
    // [bgClass, textClass] - specific named categories
    ['bg-blue-500/20 border-blue-500/40', 'text-blue-400'],       // sustantivo
    ['bg-emerald-500/20 border-emerald-500/40', 'text-emerald-400'],  // verbo
    ['bg-violet-500/20 border-violet-500/40', 'text-violet-400'],  // adjetivo
    ['bg-amber-500/20 border-amber-500/40', 'text-amber-400'],     // adverbio
    ['bg-rose-500/20 border-rose-500/40', 'text-rose-400'],        // pronombre
    ['bg-cyan-500/20 border-cyan-500/40', 'text-cyan-400'],        // preposición
    ['bg-fuchsia-500/20 border-fuchsia-500/40', 'text-fuchsia-400'], // conjunción
    ['bg-orange-500/20 border-orange-500/40', 'text-orange-400'],  // afijo/sufijo/prefijo
    ['bg-teal-500/20 border-teal-500/40', 'text-teal-400'],        // caso
    ['bg-indigo-500/20 border-indigo-500/40', 'text-indigo-400'],  // frase verbal
    ['bg-lime-500/20 border-lime-500/40', 'text-lime-400'],
    ['bg-pink-500/20 border-pink-500/40', 'text-pink-400'],
    ['bg-sky-500/20 border-sky-500/40', 'text-sky-400'],
    ['bg-yellow-500/20 border-yellow-500/40', 'text-yellow-400'],
    ['bg-red-500/20 border-red-500/40', 'text-red-400'],
];

const categoryColorCache = new Map<string, [string, string]>();

const getCategoryColor = (category: string): [string, string] => {
    if (!category) return ['bg-gray-500/20 border-gray-500/40', 'text-gray-400'];
    const cached = categoryColorCache.get(category);
    if (cached) return cached;
    
    // Deterministic hash → consistent color for same category across renders
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = ((hash << 5) - hash) + category.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % CATEGORY_PALETTE.length;
    const color = CATEGORY_PALETTE[index];
    categoryColorCache.set(category, color);
    return color;
};

const CategoryBadge = ({ category }: { category: string }) => {
    if (!category) return <span className="text-text-secondary/50 italic text-xs">—</span>;
    const canonical = resolveLexicalCategory(category);
    const displayLabel = displayOf(canonical);
    const [bg, text] = getCategoryColor(canonical);
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${bg} ${text} whitespace-nowrap`}>
            {displayLabel}
        </span>
    );
};

// ── Category Dropdown (dark-themed) ──────────────────────────────────────────
interface CategoryDropdownProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    disabled?: boolean;
}

const CategoryDropdown = ({ value, onChange, options, disabled }: CategoryDropdownProps) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const displayLabel = value === 'all' ? 'Categoría: Todas' : `Categoría: ${displayOf(value)}`;
    const [bg, text] = value !== 'all' ? getCategoryColor(resolveLexicalCategory(value)) : [null, null];

    return (
        <div className="relative" ref={ref}>
            <button
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 bg-background border border-subtle rounded-md text-sm text-text-primary hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all disabled:opacity-50 min-w-[150px] justify-between"
            >
                <div className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
                    {value !== 'all' && bg ? (
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold border ${bg} ${text}`}>{displayOf(value)}</span>
                    ) : (
                        <span className="text-text-secondary">Categoría: Todas</span>
                    )}
                </div>
                <ChevronDownIcon className={`h-4 w-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute right-0 mt-1 w-52 bg-surface border border-subtle rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in">
                    <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => { onChange('all'); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-subtle transition-colors flex items-center gap-2 ${value === 'all' ? 'bg-accent/10 text-accent' : 'text-text-primary'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-text-secondary/30"></span>
                            Todas las categorías
                        </button>
                        {options.map(cat => {
                            const canonical = resolveLexicalCategory(cat);
                            const [catBg, catText] = getCategoryColor(canonical);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => { onChange(cat); setOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-subtle transition-colors flex items-center gap-2 ${value === cat ? 'bg-accent/10' : ''}`}
                                >
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catBg} ${catText}`}>{displayOf(canonical)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

interface LexiconTableProps {
    data: LexiconEntry[];
    lexiconName: string | null;
    conlangName?: string | null;
    mainLanguage?: string | null;
    onEditWord: (id: string, entry: LexiconEntry) => void;
    onDeleteWord: (id: string) => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (category: string) => void;
    viewFilter: LexiconFilter;
    onViewFilterChange: (filter: LexiconFilter) => void;
    showAffixFormatting: boolean;
    onShowAffixFormattingChange: (show: boolean) => void;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onToggleSelectAll: (ids: string[]) => void;
    onGenerateInflections: (entry: LexiconEntry) => void;
    onSearch?: (term: string) => Promise<LexiconEntry[]>;
}

const InlineInput = ({ value, onChange, name }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, name: string }) => (
    <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-surface border border-subtle rounded-md shadow-sm py-1 px-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    />
);

const LexiconTable = (props: LexiconTableProps) => {
    const { 
        data, lexiconName, conlangName, mainLanguage, onEditWord, onDeleteWord, showNotification,
        searchTerm, onSearchTermChange, categoryFilter, onCategoryFilterChange, viewFilter, onViewFilterChange,
        showAffixFormatting, onShowAffixFormattingChange, selectedIds, onToggleSelection, onToggleSelectAll, onGenerateInflections,
        onSearch
    } = props;
    
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<LexiconEntry | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['id', 'raiz', 'lexema', 'categoria', 'significado', 'acciones']));
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [ftsResults, setFtsResults] = useState<LexiconEntry[] | null>(null);
    const [ftsLoading, setFtsLoading] = useState(false);
    const [ftsResultCount, setFtsResultCount] = useState(0);

    const uniqueCategories = useMemo(() => {
        if (!data) return [];
        const categories = new Set(data.map(entry => entry.Categoría).filter(cat => cat && cat.trim() !== ''));
        return Array.from(categories).sort((a, b) => a.localeCompare(b));
    }, [data]);

    const filteredData = useMemo(() => {
        let results = data;

        if (categoryFilter !== 'all') {
            results = results.filter(entry => entry.Categoría === categoryFilter);
        }

        // Filtro de vista (el selector "Ver:" del panel de filtros).
        if (viewFilter === 'incomplete') {
            results = results.filter(isEntryIncomplete);
        } else if (viewFilter === 'complete') {
            results = results.filter(entry => !isEntryIncomplete(entry));
        } else if (viewFilter === 'ai-generated') {
            results = results.filter(entry => !!entry.extraData?.aiGenerated);
        }

        if (!searchTerm) return results;

        // If FTS5 results are available, use them as the base set.
        if (ftsResults) {
            const ftsIds = new Set(ftsResults.map(entry => entry.ID));
            results = results.filter(entry => ftsIds.has(entry.ID));
            return results;
        }

        if (onSearch) return results;

        const lowercasedFilter = normalizeText(searchTerm);
        return results.filter(entry =>
            normalizeText(entry.ID).includes(lowercasedFilter) ||
            (entry.externalID && normalizeText(entry.externalID).includes(lowercasedFilter)) ||
            normalizeText(entry.Raíz).includes(lowercasedFilter) ||
            normalizeText(entry.Léxema.join(', ')).includes(lowercasedFilter) ||
            normalizeText(entry.Categoría).includes(lowercasedFilter) ||
            normalizeText(entry.Significado.join(', ')).includes(lowercasedFilter) ||
            (entry.extraData && Object.values(entry.extraData).some(val => normalizeText(String(val)).includes(lowercasedFilter)))
        );
    }, [data, searchTerm, categoryFilter, viewFilter, onSearch, ftsResults]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, viewFilter]);
    
    useEffect(() => {
        if (editingId && !filteredData.find(d => d.ID === editingId)) {
            setEditingId(null);
        }
    }, [filteredData, editingId]);

    useEffect(() => {
        if (!onSearch || !searchTerm || !lexiconName) {
            setFtsResults(null);
            setFtsLoading(false);
            setFtsResultCount(0);
            return;
        }
        setFtsLoading(true);
        const activeRef = { current: true };
        const timeoutId = window.setTimeout(async () => {
            try {
                const results = await onSearch(searchTerm);
                if (activeRef.current) {
                    setFtsResults(results);
                    setFtsResultCount(results.length);
                    setFtsLoading(false);
                }
            } catch (e) {
                if (activeRef.current) {
                    setFtsResults(null);
                    setFtsResultCount(0);
                    setFtsLoading(false);
                }
            }
        }, 250);
        return () => {
            activeRef.current = false;
            window.clearTimeout(timeoutId);
        };
    }, [onSearch, searchTerm, lexiconName]);
    
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    const handleEditClick = (entry: LexiconEntry) => {
        setEditingId(entry.ID);
        setEditFormData({ ...entry });
    };

    const handleCancelClick = () => {
        setEditingId(null);
        setEditFormData(null);
    };

    const handleDeleteClick = (id: string, lexema: string[]) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la entrada para "${lexema[0] || 'esta entrada'}"?`)) {
            onDeleteWord(id);
            showNotification(`Entrada eliminada.`, 'success');
        }
    }

    const handleSaveClick = () => {
        if (editFormData) {
            onEditWord(editFormData.ID, editFormData);
            showNotification(`Entrada "${editFormData.Raíz}" actualizada.`, 'success');
            handleCancelClick();
        }
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (editFormData) {
            let newFormState = { ...editFormData };
            if (name === "Léxema" || name === "Significado") {
                newFormState[name] = value.split(',').map(s => s.trim()).filter(Boolean);
            } else if (name === 'externalID') {
                newFormState.externalID = value;
            } else {
                newFormState[name as keyof Omit<LexiconEntry, 'Léxema' | 'Significado' | 'extraData' | 'externalID' | 'exceptions'>] = value;
            }
            setEditFormData(newFormState);
        }
    };

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const formatLexemeDisplay = useCallback((entry: LexiconEntry): string => {
        let lexemes = entry.Léxema;
        if (showAffixFormatting) {
            const cat = entry.Categoría.toLowerCase();
            if (cat.includes('sufijo') && !cat.includes('prefijo')) {
                lexemes = lexemes.map(l => l.startsWith('-') ? l : `-${l}`);
            } else if (cat.includes('prefijo') && !cat.includes('sufijo')) {
                lexemes = lexemes.map(l => l.endsWith('-') ? l : `${l}-`);
            } else if (cat.includes('infijo')) {
                 lexemes = lexemes.map(l => (l.startsWith('-') && l.endsWith('-')) ? l : `-${l}-`);
            } else if (cat.includes('verbo')) {
                lexemes = lexemes.map(l => l.endsWith('-') ? l : `${l}-`);
            }
        }
        return lexemes.join(', ');
    }, [showAffixFormatting]);


    const toggleColumn = (col: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
    };

    return (
        <div className="bg-surface p-4 sm:p-6 rounded-lg shadow-lg mt-8 animate-fade-in">
            {/* Header: Title */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-subtle">
                <h2 className="text-xl font-bold text-text-primary truncate flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent animate-pulse"></span>
                    {lexiconName ? `Léxico: ${lexiconName}` : 'Ningún Léxico Seleccionado'}
                    <span className="text-xs font-semibold px-2 py-0.5 bg-accent/15 border border-accent/30 rounded-full text-accent ml-2">
                        {filteredData.length} entradas
                    </span>
                </h2>
            </div>

            {/* Gran buscador destacado (Command Center) */}
            <div className="max-w-3xl mx-auto w-full mb-6 relative group">
                <input
                    id="lexicon-search"
                    name="lexiconSearch"
                    type="text"
                    placeholder="Escribe para buscar por palabra, significado, raíz o categoría..."
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    disabled={!lexiconName}
                    className="w-full bg-background-dark/50 border border-subtle/80 hover:border-accent/40 focus:border-accent rounded-full shadow-lg py-3 px-5 text-text-primary text-base placeholder:text-text-secondary/50 focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:opacity-50 pl-14 pr-12 transition-all duration-300 backdrop-blur-md"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/60 group-focus-within:text-accent transition-colors">
                     <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                </div>
                {searchTerm && (
                    <button
                        onClick={() => onSearchTermChange('')}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                        title="Limpiar búsqueda"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {searchTerm && lexiconName && (
                <div className="max-w-3xl mx-auto w-full mb-4">
                    {ftsLoading ? (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            <span>Buscando en el léxico completo...</span>
                        </div>
                    ) : ftsResultCount > 0 ? (
                        <div className="text-xs text-text-secondary">
                            <span className="text-accent font-semibold">{ftsResultCount}</span> resultado{ftsResultCount === 1 ? '' : 's'} encontrado{ftsResultCount === 1 ? '' : 's'} para "<span className="italic">{searchTerm}</span>"
                        </div>
                    ) : (
                        <div className="text-xs text-text-secondary">
                            Sin resultados para "<span className="italic">{searchTerm}</span>"
                        </div>
                    )}
                </div>
            )}

            {/* Fila secundaria: Filtros alineados y ordenados */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 bg-background-dark/30 rounded-xl border border-subtle/40 backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <LexiconFilters activeFilter={viewFilter} onFilterChange={onViewFilterChange} disabled={!lexiconName} />
                    
                    <CategoryDropdown
                        value={categoryFilter}
                        onChange={onCategoryFilterChange}
                        options={uniqueCategories}
                        disabled={!lexiconName}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Column visibility toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            disabled={!lexiconName}
                            className="flex items-center gap-2 px-3.5 py-2 bg-background border border-subtle rounded-md text-sm text-text-secondary hover:text-text-primary hover:border-subtle/80 transition-colors disabled:opacity-50"
                        >
                            <LayoutGridIcon className="h-4 w-4" />
                            <span>Columnas</span>
                        </button>
                        {showColumnMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-surface border border-subtle rounded-md shadow-2xl z-30 p-2">
                                {[
                                    { id: 'id', label: 'ID' },
                                    { id: 'raiz', label: 'Raíz' },
                                    { id: 'lexema', label: conlangName || 'Léxema' },
                                    { id: 'categoria', label: 'Categoría' },
                                    { id: 'significado', label: mainLanguage || 'Significado' },
                                    { id: 'acciones', label: 'Acciones' }
                                ].map(col => (
                                    <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-subtle rounded cursor-pointer text-sm text-text-primary">
                                        <input
                                            id={`column-toggle-${col.id}`}
                                            name="visibleColumns"
                                            type="checkbox"
                                            checked={visibleColumns.has(col.id)}
                                            onChange={() => toggleColumn(col.id)}
                                            className="form-checkbox h-4 w-4 rounded bg-background border-subtle text-accent focus:ring-accent"
                                        />
                                        {col.label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-text-secondary whitespace-nowrap bg-background border border-subtle rounded-md px-3.5 py-2 hover:bg-subtle hover:border-subtle/80 transition-colors cursor-pointer">
                        <input
                            id="show-affix-formatting"
                            name="showAffixFormatting"
                            type="checkbox"
                            checked={showAffixFormatting}
                            onChange={(e) => onShowAffixFormattingChange(e.target.checked)}
                            disabled={!lexiconName}
                            className="form-checkbox h-4 w-4 rounded bg-subtle text-accent focus:ring-accent disabled:opacity-50"
                        />
                        <span>Afijos</span>
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead className="border-b-2 border-subtle">
                        <tr>
                            <th className="p-3 w-[5%]">
                                <input
                                    type="checkbox"
                                    onChange={() => {
                                        const visibleIds = paginatedData.map(d => d.ID);
                                        onToggleSelectAll(visibleIds);
                                    }}
                                    checked={paginatedData.length > 0 && paginatedData.every(d => selectedIds.has(d.ID))}
                                    className="form-checkbox h-4 w-4 rounded bg-background border-subtle text-accent focus:ring-accent"
                                />
                            </th>
                            {visibleColumns.has('id') && <th className="p-3 text-sm font-semibold text-text-secondary w-[5%]" title="ID interno de la App">ID</th>}
                            {visibleColumns.has('raiz') && <th className="p-3 text-sm font-semibold text-text-secondary w-[15%]">Raíz</th>}
                            {visibleColumns.has('lexema') && <th className="p-3 text-sm font-semibold text-text-secondary w-[20%] uppercase">{conlangName || 'Léxema(s)'}</th>}
                            {visibleColumns.has('categoria') && <th className="p-3 text-sm font-semibold text-text-secondary w-[15%]">Categoría</th>}
                            {visibleColumns.has('significado') && <th className="p-3 text-sm font-semibold text-text-secondary w-[25%] uppercase">{mainLanguage || 'Significado(s)'}</th>}
                            {visibleColumns.has('acciones') && <th className="p-3 text-sm font-semibold text-text-secondary w-[15%] text-center">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((entry) => {
                                const isEditing = editingId === entry.ID;
                                const hasExtraData = entry.extraData && Object.keys(entry.extraData).length > 0;
                                const isExpanded = expandedIds.has(entry.ID);
                                const isIncomplete = isEntryIncomplete(entry);

                                return (
                                <React.Fragment key={`${lexiconName}-${entry.ID}`}>
                                <tr className={`border-b border-subtle even:bg-background hover:bg-subtle/50 transition-colors duration-150 ${isIncomplete && !isEditing ? 'bg-warning/10' : ''} ${selectedIds.has(entry.ID) ? 'bg-accent/10' : ''}`}>
                                    <td className="p-3 align-top">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(entry.ID)}
                                            onChange={() => onToggleSelection(entry.ID)}
                                            className="form-checkbox h-4 w-4 rounded bg-background border-subtle text-accent focus:ring-accent"
                                        />
                                    </td>
                                    {visibleColumns.has('id') && <td className="p-3 text-sm text-text-secondary align-top">{entry.ID}</td>}
                                    {visibleColumns.has('raiz') && (
                                        <td className="p-3 font-mono text-accent align-top">
                                            {isEditing ? <InlineInput value={editFormData!.Raíz} onChange={handleEditFormChange} name="Raíz" /> : entry.Raíz}
                                        </td>
                                    )}
                                    {visibleColumns.has('lexema') && (
                                        <td className="p-3 text-sm text-text-primary align-top break-words">
                                            {isEditing ? <InlineInput value={editFormData!.Léxema.join(', ')} onChange={handleEditFormChange} name="Léxema" /> : formatLexemeDisplay(entry)}
                                        </td>
                                    )}
                                    {visibleColumns.has('categoria') && (
                                        <td className="p-3 text-sm text-text-secondary align-top">
                                            {isEditing
                                                ? <InlineInput value={editFormData!.Categoría} onChange={handleEditFormChange} name="Categoría" />
                                                : <CategoryBadge category={entry.Categoría} />
                                            }
                                        </td>
                                    )}
                                    {visibleColumns.has('significado') && (
                                        <td className="p-3 text-sm text-text-primary align-top break-words">
                                            <div className="flex items-center gap-2">
                                                <span>
                                                {isEditing ? <InlineInput value={editFormData!.Significado.join(', ')} onChange={handleEditFormChange} name="Significado" /> : entry.Significado.join(' · ')}
                                                </span>
                                                {hasExtraData && !isEditing && (
                                                    <button onClick={() => toggleExpand(entry.ID)} title="Mostrar datos extra" className="text-text-secondary hover:text-accent transition-colors">
                                                        <ChevronDownIcon className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.has('acciones') && (
                                        <td className="p-3 align-top">
                                            <div className="flex items-center justify-center gap-3">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={handleSaveClick} title="Guardar" className="text-success hover:text-green-400 transition-colors"><SaveIcon className="h-5 w-5"/></button>
                                                        <button onClick={handleCancelClick} title="Cancelar" className="text-danger hover:text-red-400 transition-colors"><CancelIcon className="h-5 w-5"/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleEditClick(entry)} title="Editar" className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"><EditIcon className="h-4 w-4"/></button>
                                                        <button onClick={() => onGenerateInflections(entry)} title="Flexionar" className="p-1.5 bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 transition-colors"><GitMergeIcon className="h-4 w-4"/></button>
                                                        <button onClick={() => handleDeleteClick(entry.ID, entry.Léxema)} title="Eliminar" className="p-1.5 bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                                {isExpanded && hasExtraData && (
                                    <tr className="bg-background/50">
                                        <td colSpan={7} className="px-5 py-3 text-sm">
                                            <div className="bg-black/20 p-3 rounded-md">
                                                <h4 className="font-semibold text-text-secondary mb-1">Datos Extra</h4>
                                                <ul className="list-disc list-inside">
                                                {Object.entries(entry.extraData).map(([key, value]) => (
                                                    <li key={key} className="text-text-primary">
                                                        <span className="font-medium capitalize">{key}:</span> {String(value)}
                                                    </li>
                                                ))}
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                                )})
                        ) : (
                             <tr>
                                <td colSpan={7} className="text-center p-8 text-text-secondary">
                                    {searchTerm ? 'No se encontraron resultados.' : (lexiconName ? 'Este léxico está vacío. Añade una palabra para empezar.' : 'Selecciona o crea un léxico para ver su contenido.')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 p-2">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1 bg-surface text-text-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle border border-subtle transition-colors"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Anterior
                    </button>
                    <span className="text-sm text-text-secondary">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1 bg-surface text-text-secondary rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle border border-subtle transition-colors"
                    >
                        Siguiente
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LexiconTable;
