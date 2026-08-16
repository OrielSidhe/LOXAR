import { useState, useMemo, useEffect, useRef } from 'react';
import { LexiconEntry, NewLexiconEntry, InflectionProfile } from '../types';
import { generateInflections, filterParadigmsForFunction } from '../utils/inflectionUtils';
import FilterIcon from './icons/FilterIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';
import SearchIcon from './icons/SearchIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import SparkleIcon from './icons/SparkleIcon';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';
import GitMergeIcon from './icons/GitMergeIcon';
import EditIcon from './icons/EditIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import * as XLSX from 'xlsx';
import ParadigmCell from './ParadigmCell';
import CollectionsSidebar from './CollectionsSidebar';

interface CollectionsManagerProps {
    lexicon: LexiconEntry[];
    inflection: InflectionProfile;
    onUpdateEntry: (id: string, entry: LexiconEntry) => void;
    onAddEntry: (entry: NewLexiconEntry) => void;
    onAddBatchEntries?: (entries: NewLexiconEntry[]) => void;
    onDeleteEntry: (id: string) => void;
    customCategories: string[];
    onStartTour: () => void;
}

interface CollectionColumn {
    id: string;
    name: string;
    categoryLink: string;
}

interface Collection {
    id: string;
    name: string;
    entryIds: string[];
    columns?: CollectionColumn[];
    drafts?: string[];
    description?: string;
    customCells?: {
        [rowEntryId: string]: {
            [columnCategory: string]: string; // Lexema local de la colección
        }
    };
}

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CollectionsManager = ({ lexicon, inflection, onAddEntry, onAddBatchEntries, customCategories, onStartTour }: CollectionsManagerProps) => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    const [isSelectingMode, setIsSelectingMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDraftsReview, setShowDraftsReview] = useState(false);

    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    useEffect(() => {
        const activeLexiconName = localStorage.getItem('conlang_lexicon_manager_active');
        if (activeLexiconName) {
            const stored = localStorage.getItem(`conlang_collections_${activeLexiconName}`);
            if (stored) {
                try {
                    setCollections(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse collections", e);
                }
            } else {
                setCollections([]);
            }
        }
    }, []);

    const saveCollections = (newCollections: Collection[]) => {
        setCollections(newCollections);
        const activeLexiconName = localStorage.getItem('conlang_lexicon_manager_active');
        if (activeLexiconName) {
            localStorage.setItem(`conlang_collections_${activeLexiconName}`, JSON.stringify(newCollections));
        }
    };

    const handleCreateCollection = () => {
        if (!newCollectionName.trim()) return;
        const newCollection: Collection = {
            id: Date.now().toString(),
            name: newCollectionName.trim(),
            entryIds: [],
            drafts: []
        };
        saveCollections([...collections, newCollection]);
        setActiveCollectionId(newCollection.id);
        setNewCollectionName('');
        setIsCreating(false);
        setIsSelectingMode(true);
    };

    const handleDeleteCollection = (id: string) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta colección?")) {
            saveCollections(collections.filter(c => c.id !== id));
            if (activeCollectionId === id) setActiveCollectionId(null);
        }
    };

    const handleToggleEntryInCollection = (entryId: string) => {
        if (!activeCollectionId) return;
        const updatedCollections = collections.map(c => {
            if (c.id === activeCollectionId) {
                const exists = c.entryIds.includes(entryId);
                return {
                    ...c,
                    entryIds: exists
                        ? c.entryIds.filter(id => id !== entryId)
                        : [...c.entryIds, entryId]
                };
            }
            return c;
        });
        saveCollections(updatedCollections);
    };

    const handleUpdateCell = (entryId: string, colCategory: string, val: string) => {
        if (!activeCollectionId) return;
        const updatedCollections = collections.map(c => {
            if (c.id === activeCollectionId) {
                const cells = c.customCells || {};
                const entryCells = cells[entryId] || {};
                return {
                    ...c,
                    customCells: {
                        ...cells,
                        [entryId]: {
                            ...entryCells,
                            [colCategory]: val
                        }
                    }
                };
            }
            return c;
        });
        saveCollections(updatedCollections);
    };

    const handleQuickAddDraft = () => {
        if (!activeCollectionId || !searchTerm.trim()) return;
        const term = searchTerm.trim();
        const updatedCollections = collections.map(c => {
            if (c.id === activeCollectionId) {
                const currentDrafts = c.drafts || [];
                if (currentDrafts.includes(term)) return c;
                return { ...c, drafts: [...currentDrafts, term] };
            }
            return c;
        });
        saveCollections(updatedCollections);
        setSearchTerm('');
    };

    const handleRemoveDraft = (draft: string) => {
        if (!activeCollectionId) return;
        const updatedCollections = collections.map(c => {
            if (c.id === activeCollectionId) {
                return { ...c, drafts: (c.drafts || []).filter(d => d !== draft) };
            }
            return c;
        });
        saveCollections(updatedCollections);
    };

    const handleExportCollection = (collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;
        
        const exportData = {
            name: collection.name,
            description: collection.description,
            columns: collection.columns,
            entries: collection.entryIds.map(id => lexicon.find(e => e.ID === id)).filter(Boolean)
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `collection_${collection.name.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportCollection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const newCollection: Collection = {
                    id: Date.now().toString(),
                    name: data.name || 'Importada',
                    description: data.description,
                    columns: data.columns,
                    entryIds: [],
                    drafts: []
                };
                saveCollections([...collections, newCollection]);
                setActiveCollectionId(newCollection.id);
            } catch (error) {
                alert('Error al importar la colección');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExportCollectionExcel = (collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;
        
        const cols = collection.columns || [];
        const entries = collection.entryIds.map(id => lexicon.find(e => e.ID === id)).filter(Boolean) as LexiconEntry[];

        // Crear las filas para la hoja
        const rows = entries.map(entry => {
            const rowData: { [key: string]: string } = {
                'ID': entry.ID,
                'Palabra Base': entry.Léxema.join(', '),
                'Categoría Base': entry.Categoría,
                'Significado': entry.Significado.join(', '),
            };

            cols.forEach(col => {
                // Encontrar si hay un valor en el léxico
                const targetMeaning = entry.Significado[0]?.toLowerCase().trim();
                const match = targetMeaning ? lexicon.find(e =>
                    e.Categoría.toLowerCase() === col.categoryLink.toLowerCase() &&
                    e.Significado.some(s => s.toLowerCase().trim() === targetMeaning)
                ) : null;

                const localVal = collection.customCells?.[entry.ID]?.[col.categoryLink] || '';
                
                let val = '';
                if (match) {
                    val = match.Léxema.join(', ');
                } else if (localVal) {
                    val = localVal;
                } else if (inflection) {
                    // Sugerencia
                    const relevantParadigms = filterParadigmsForFunction(inflection.paradigms, entry.Categoría);
                    for (const p of relevantParadigms) {
                        const forms = generateInflections(entry, p, inflection);
                        const found = forms.find(f => f.name.toLowerCase() === col.categoryLink.toLowerCase());
                        if (found) {
                            val = found.result;
                            break;
                        }
                    }
                }
                
                rowData[col.name] = val;
            });

            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Colección");
        XLSX.writeFile(workbook, `coleccion_${collection.name.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleImportCollectionExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
                if (jsonData.length === 0) {
                    alert('El archivo Excel está vacío.');
                    return;
                }

                const firstRow = jsonData[0];
                const allKeys = Object.keys(firstRow);
                const systemKeys = ['ID', 'Palabra Base', 'Categoría Base', 'Significado'];
                const customColNames = allKeys.filter(k => !systemKeys.includes(k));

                // Crear columnas de la colección
                const newColumns: CollectionColumn[] = customColNames.map(name => ({
                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                    name: name,
                    categoryLink: name
                }));

                const incomingEntries: NewLexiconEntry[] = [];
                
                // Mapeo temporal para asociar filas del excel con entradas
                const excelRowsToProcess: {
                    row: any;
                    searchQuery?: { word: string; meaning: string };
                    isNew: boolean;
                    tempIndex?: number;
                    existingEntry?: LexiconEntry;
                }[] = [];

                jsonData.forEach((row: any) => {
                    let entry: LexiconEntry | undefined;

                    if (row['ID']) {
                        entry = lexicon.find(e => e.ID === row['ID'].toString());
                    }

                    if (!entry && row['Palabra Base']) {
                        const targetWord = row['Palabra Base'].toString().trim().toLowerCase();
                        const targetMeaning = row['Significado'] ? row['Significado'].toString().trim().toLowerCase() : '';
                        
                        entry = lexicon.find(e => 
                            e.Léxema.some(l => l.trim().toLowerCase() === targetWord) &&
                            (targetMeaning ? e.Significado.some(s => s.trim().toLowerCase() === targetMeaning) : true)
                        );
                    }

                    if (entry) {
                        excelRowsToProcess.push({
                            row,
                            isNew: false,
                            existingEntry: entry
                        });
                    } else if (row['Palabra Base']) {
                        const newEntry: NewLexiconEntry = {
                            Raíz: '',
                            Léxema: row['Palabra Base'].toString().split(',').map((l: string) => l.trim()),
                            Categoría: row['Categoría Base'] || 'desconocida',
                            Significado: row['Significado'] ? row['Significado'].toString().split(',').map((s: string) => s.trim()) : ['Pendiente'],
                            extraData: { sourceCollection: 'Importación Excel' }
                        };
                        
                        const tempIndex = incomingEntries.length;
                        incomingEntries.push(newEntry);

                        excelRowsToProcess.push({
                            row,
                            isNew: true,
                            tempIndex,
                            searchQuery: {
                                word: newEntry.Léxema[0]?.trim().toLowerCase() || '',
                                meaning: newEntry.Significado[0]?.trim().toLowerCase() || ''
                            }
                        });
                    }
                });

                // Simular resultado de fusionar e indexar el léxico
                const combinedList = [...lexicon, ...incomingEntries];
                const sortedCombined = [...combinedList].sort((a, b) => (a.Significado[0] || '').localeCompare(b.Significado[0] || ''));
                const reindexedCombined = sortedCombined.map((entry, index) => ({ ...entry, ID: (index + 1).toString() }));

                const newEntryIds: string[] = [];
                const customCells: { [rowEntryId: string]: { [columnCategory: string]: string } } = {};

                excelRowsToProcess.forEach(item => {
                    let finalEntry: any;
                    
                    if (!item.isNew && item.existingEntry) {
                        finalEntry = reindexedCombined.find(e => e.ID === item.existingEntry!.ID || 
                            (e.Léxema.some(l => item.existingEntry!.Léxema.includes(l)) && 
                             e.Significado.some(s => item.existingEntry!.Significado.includes(s)))
                        );
                    } else if (item.isNew && item.searchQuery) {
                        finalEntry = reindexedCombined.find(e => 
                            e.Léxema.some(l => l.trim().toLowerCase() === item.searchQuery!.word) &&
                            e.Significado.some(s => s.trim().toLowerCase() === item.searchQuery!.meaning)
                        );
                    }

                    if (finalEntry) {
                        const finalId = finalEntry.ID;
                        newEntryIds.push(finalId);

                        customColNames.forEach(colName => {
                            const val = item.row[colName];
                            if (val !== undefined && val !== null && val.toString().trim() !== '') {
                                const targetMeaning = finalEntry.Significado[0]?.toLowerCase().trim();
                                const hasLexiconMatch = targetMeaning ? lexicon.some(e =>
                                    e.Categoría.toLowerCase() === colName.toLowerCase() &&
                                    e.Significado.some(s => s.toLowerCase().trim() === targetMeaning) &&
                                    e.Léxema.some(l => l.trim().toLowerCase() === val.toString().trim().toLowerCase())
                                ) : false;

                                if (!hasLexiconMatch) {
                                    if (!customCells[finalId]) {
                                        customCells[finalId] = {};
                                    }
                                    customCells[finalId][colName] = val.toString().trim();
                                }
                            }
                        });
                    }
                });

                if (incomingEntries.length > 0) {
                    if (onAddBatchEntries) {
                        onAddBatchEntries(incomingEntries);
                    } else {
                        incomingEntries.forEach(entry => onAddEntry(entry));
                    }
                }

                const newCollectionName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                const newCollection: Collection = {
                    id: Date.now().toString(),
                    name: newCollectionName,
                    description: `Importada desde Excel el ${new Date().toLocaleDateString()}`,
                    columns: newColumns,
                    entryIds: newEntryIds,
                    drafts: [],
                    customCells: customCells
                };

                saveCollections([...collections, newCollection]);
                setActiveCollectionId(newCollection.id);

            } catch (error) {
                console.error("Error al importar Excel", error);
                alert('Error al importar el archivo Excel. Verifica el formato.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleCreateTemplate = (templateType: string) => {
        const templates: { [key: string]: Partial<Collection> } = {
            pronombres: {
                name: 'Pronombres',
                description: 'Colección de pronombres personales, demostrativos, etc.',
                columns: [
                    { id: '1sg', name: '1ra Sing', categoryLink: 'pronombre' },
                    { id: '2sg', name: '2da Sing', categoryLink: 'pronombre' },
                    { id: '3sg', name: '3ra Sing', categoryLink: 'pronombre' },
                    { id: '1pl', name: '1ra Plur', categoryLink: 'pronombre' },
                    { id: '2pl', name: '2da Plur', categoryLink: 'pronombre' },
                    { id: '3pl', name: '3ra Plur', categoryLink: 'pronombre' }
                ]
            },
            preposiciones: {
                name: 'Preposiciones',
                description: 'Colección de preposiciones comunes',
                columns: []
            },
            numeros: {
                name: 'Números',
                description: 'Colección de numerales cardinales',
                columns: [
                    { id: '1', name: '1', categoryLink: 'sustantivo' },
                    { id: '2', name: '2', categoryLink: 'sustantivo' },
                    { id: '3', name: '3', categoryLink: 'sustantivo' },
                    { id: '4', name: '4', categoryLink: 'sustantivo' },
                    { id: '5', name: '5', categoryLink: 'sustantivo' },
                    { id: '10', name: '10', categoryLink: 'sustantivo' }
                ]
            }
        };

        const template = templates[templateType];
        if (!template) return;

        const newCollection: Collection = {
            id: Date.now().toString(),
            name: template.name || 'Nueva Colección',
            description: template.description,
            columns: template.columns || [],
            entryIds: [],
            drafts: []
        };
        saveCollections([...collections, newCollection]);
        setActiveCollectionId(newCollection.id);
    };

    const handleFinishSelectionAttempt = () => {
        if (!activeCollection) return;
        if (activeCollection.drafts && activeCollection.drafts.length > 0) {
            setShowDraftsReview(true);
        } else {
            setIsSelectingMode(false);
        }
    };

    const handleConfirmDrafts = async () => {
        if (!activeCollection || !activeCollection.drafts) return;

        activeCollection.drafts.forEach(draft => {
            onAddEntry({
                Raíz: '',
                Léxema: [draft],
                Categoría: '',
                Significado: [],
                extraData: { draft: true, sourceCollection: activeCollection.name }
            });
        });

        const updatedCollections = collections.map(c => {
            if (c.id === activeCollection.id) {
                return { ...c, drafts: [] };
            }
            return c;
        });
        saveCollections(updatedCollections);
        setShowDraftsReview(false);
        setIsSelectingMode(false);
    };

    const handleAddColumn = () => {
        if (!activeCollection || !newColumnName.trim()) return;
        const newCol: CollectionColumn = {
            id: Date.now().toString(),
            name: newColumnName.trim(),
            categoryLink: newColumnName.trim()
        };
        const updatedCols = [...(activeCollection.columns || []), newCol];
        const updatedColl = { ...activeCollection, columns: updatedCols };
        saveCollections(collections.map(c => c.id === activeCollection.id ? updatedColl : c));
        setNewColumnName('');
        setIsAddingColumn(false);
    }

    const handleRenameColumn = (colId: string, newName: string) => {
        if (!activeCollection) return;
        const updatedCols = activeCollection.columns?.map(c => c.id === colId ? { ...c, name: newName, categoryLink: newName } : c);
        const updatedColl = { ...activeCollection, columns: updatedCols };
        saveCollections(collections.map(c => c.id === activeCollection.id ? updatedColl : c));
    }

    const activeCollection = useMemo(() =>
        collections.find(c => c.id === activeCollectionId),
        [collections, activeCollectionId]);

    const activeCollectionEntries = useMemo(() => {
        if (!activeCollection) return [];
        return lexicon.filter(e => activeCollection.entryIds.includes(e.ID));
    }, [lexicon, activeCollection]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return lexicon.slice(0, 50);
        const term = normalize(searchTerm);
        return lexicon.filter(e =>
            normalize(e.Raíz || '').includes(term) ||
            e.Léxema.some(l => normalize(l).includes(term)) ||
            e.Significado.some(s => normalize(s).includes(term))
        ).slice(0, 50);
    }, [lexicon, searchTerm]);

    return (
        <div className="flex h-full gap-4 relative">
            <CollectionsSidebar
                collections={collections}
                activeCollectionId={activeCollectionId}
                isCreating={isCreating}
                newCollectionName={newCollectionName}
                onCreateCollection={handleCreateCollection}
                onCreateTemplate={handleCreateTemplate}
                onImportCollection={handleImportCollection}
                onImportCollectionExcel={handleImportCollectionExcel}
                onExportCollection={handleExportCollection}
                onExportCollectionExcel={handleExportCollectionExcel}
                onDeleteCollection={handleDeleteCollection}
                onSelectCollection={(id: string) => { setActiveCollectionId(id); setIsSelectingMode(false); }}
                onSetIsSelectingMode={(value: boolean) => setIsSelectingMode(value)}
                onSetIsCreating={(value: boolean) => setIsCreating(value)}
                onSetNewCollectionName={(value: string) => setNewCollectionName(value)}
            />

            <div className="flex-1 flex flex-col bg-surface-dark rounded-r-xl overflow-hidden relative border border-border-dark">
                {!activeCollection ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50">
                        <FilterIcon className="w-16 h-16 mb-4" />
                        <p className="text-lg">Selecciona una colección</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-surface border-b border-border-dark p-4 flex justify-between items-center shadow-md z-1">
                            <div>
                                <h3 className="text-xl font-bold text-white font-display mb-1">{activeCollection.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <span>{activeCollection.entryIds.length} confirmadas</span>
                                    {activeCollection.drafts && activeCollection.drafts.length > 0 && (
                                        <button
                                            onClick={() => setShowDraftsReview(true)}
                                            className="ml-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent hover:bg-accent/30 flex items-center gap-1 transition-colors animate-pulse"
                                        >
                                            <span className="font-bold">{activeCollection.drafts.length} pendientes por agregar</span>
                                            <CheckCircleIcon className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onStartTour}
                                    className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-white/5"
                                    title="Ayuda / Tour"
                                >
                                    <span className="font-bold font-mono text-lg">?</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm("¿Limpiar toda la tabla? (No borra palabras del léxico, solo de esta vista)")) {
                                            saveCollections(collections.map(c => c.id === activeCollection.id ? { ...c, entryIds: [] } : c));
                                        }
                                    }}
                                    className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-white/5"
                                    title="Limpiar tabla"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative overflow-hidden flex flex-col h-full">
                            <div id="collections-toolbar" className="bg-surface border-b border-border-dark p-2 flex gap-2 overflow-x-auto z-10 relative items-center">
                                <button
                                    onClick={() => isSelectingMode ? handleFinishSelectionAttempt() : setIsSelectingMode(true)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${isSelectingMode ? 'bg-accent text-white' : 'bg-surface-light text-text-primary hover:bg-surface-light/80'}`}
                                >
                                    {isSelectingMode ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
                                    {isSelectingMode ? 'Terminar Filas' : 'Agregar Filas (Base)'}
                                </button>
                                <div className="w-px bg-border-dark h-6 mx-2"></div>

                                <div className="flex items-center gap-2">
                                    {!isAddingColumn ? (
                                        <div className="flex gap-2">
                                            <select
                                                className="bg-surface-dark text-xs text-white border border-border-dark rounded px-2 py-1 outline-none focus:border-primary max-w-[150px]"
                                                onChange={(e) => {
                                                    if (e.target.value === '__custom__') {
                                                        setIsAddingColumn(true);
                                                        e.target.value = "";
                                                    } else if (e.target.value) {
                                                        const func = e.target.value;
                                                        const newCol: CollectionColumn = { id: Date.now().toString(), name: func, categoryLink: func };
                                                        const updatedCols = [...(activeCollection.columns || []), newCol];
                                                        const updatedColl = { ...activeCollection, columns: updatedCols };
                                                        saveCollections(collections.map(c => c.id === activeCollection.id ? updatedColl : c));
                                                        e.target.value = "";
                                                    }
                                                }}
                                            >
                                                <option value="" className="bg-surface-dark text-gray-400">+ Columna Rápida...</option>
                                                {customCategories.map(f => (
                                                    <option key={f} value={f} className="bg-surface-dark text-white">{f}</option>
                                                ))}
                                                <option value="__custom__" className="bg-surface-dark text-primary font-bold">+ Crear Personalizada...</option>
                                            </select>
                                            <button
                                                onClick={() => setIsAddingColumn(true)}
                                                className="px-2 py-1 bg-surface-light/20 hover:bg-surface-light/40 border border-border-dark rounded text-xs text-text-secondary"
                                            >
                                                + Nueva
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 animate-fade-in bg-surface-light/30 p-1 rounded border border-primary/30">
                                            <input
                                                autoFocus
                                                type="text"
                                                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/50 w-32"
                                                placeholder="Nombre columna..."
                                                value={newColumnName}
                                                onChange={(e) => setNewColumnName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                            />
                                            <button onClick={handleAddColumn} className="text-primary hover:text-white p-1"><CheckCircleIcon className="w-3 h-3" /></button>
                                            <button onClick={() => { setIsAddingColumn(false); setNewColumnName(''); }} className="text-text-secondary hover:text-white p-1"><XCircleIcon className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {activeCollectionEntries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-text-secondary opacity-60">
                                    <p>Tabla vacía. Agrega filas (palabras base) para comenzar.</p>
                                </div>
                            ) : (
                                <div id="paradigm-table" className="overflow-auto custom-scrollbar flex-1 pb-4">
                                    <table className="w-full text-left text-sm border-collapse min-w-max">
                                        <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10 text-xs uppercase font-bold text-text-secondary border-b border-border-dark shadow-sm">
                                            <tr>
                                                <th className="p-3 bg-surface-dark border-r border-border-dark sticky left-0 z-20 w-48 shadow-lg">Entrada Base</th>
                                                {activeCollection.columns?.map(col => (
                                                    <th key={col.id} className="p-3 w-48 group relative hover:bg-white/5 transition-colors">
                                                        <input
                                                            type="text"
                                                            className="bg-transparent border-none outline-none w-full cursor-pointer hover:text-primary focus:text-primary focus:cursor-text text-center font-bold"
                                                            value={col.name}
                                                            onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                                                            title="Click para renombrar"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('¿Borrar columna?')) {
                                                                    const updatedCols = activeCollection.columns?.filter(c => c.id !== col.id);
                                                                    const updatedColl = { ...activeCollection, columns: updatedCols };
                                                                    saveCollections(collections.map(c => c.id === activeCollection.id ? updatedColl : c));
                                                                }
                                                            }}
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"
                                                        >
                                                            <XCircleIcon className="w-3 h-3" />
                                                        </button>
                                                    </th>
                                                ))}
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-surface-dark divide-y divide-border-dark">
                                            {activeCollectionEntries.map(entry => (
                                                <tr key={entry.ID} className="hover:bg-white/5">
                                                    <td className="p-3 bg-surface-dark/95 backdrop-blur border-r border-border-dark sticky left-0 z-10 font-bold text-white shadow-lg">
                                                        <div className="flex flex-col">
                                                            <span>{entry.Léxema.join(', ')}</span>
                                                            <span className="text-[10px] text-accent font-normal">{entry.Significado[0]}</span>
                                                        </div>
                                                    </td>

                                                    {activeCollection.columns?.map(col => (
                                                        <td key={`${entry.ID}-${col.id}`} className="p-3 border-r border-border-dark/50">
                                                            <ParadigmCell
                                                                rowEntry={entry}
                                                                colCategory={col.categoryLink}
                                                                lexicon={lexicon}
                                                                inflection={inflection}
                                                                onAddEntry={onAddEntry}
                                                                localValue={activeCollection.customCells?.[entry.ID]?.[col.categoryLink] || ''}
                                                                onUpdateLocalValue={(val) => handleUpdateCell(entry.ID, col.categoryLink, val)}
                                                            />
                                                        </td>
                                                    ))}

                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleToggleEntryInCollection(entry.ID)} className="text-text-secondary hover:text-red-400 opacity-50 hover:opacity-100"><XCircleIcon className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {isSelectingMode && (
                                <div className="absolute inset-0 z-50 flex flex-col bg-surface-dark animate-fade-in overflow-hidden">
                                    <div className="absolute top-4 right-4 z-50">
                                        <button
                                            onClick={() => setIsSelectingMode(false)}
                                            className="p-2 rounded-full bg-surface hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                                        >
                                            <XCircleIcon className="w-8 h-8" />
                                        </button>
                                    </div>
                                    <div className="p-8 border-b border-border-dark bg-surface-dark shrink-0 pt-16 shadow-lg z-10">
                                        <div className="relative max-w-4xl mx-auto">
                                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-text-secondary" />
                                            <input
                                                autoFocus
                                                type="text"
                                                className="w-full bg-[#1a1a1c] border border-border-dark rounded-full py-3 pl-12 pr-6 text-lg text-white focus:outline-none focus:border-primary transition-colors placeholder-text-secondary/50 shadow-inner"
                                                placeholder="Buscar palabra base para la fila..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background">
                                        <div className="max-w-5xl mx-auto pb-20 space-y-2">
                                            {searchTerm.trim() && (
                                                <button
                                                    onClick={handleQuickAddDraft}
                                                    className="w-full mb-6 p-4 border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center gap-3 text-primary hover:bg-primary/10 transition-colors group animate-fade-in"
                                                >
                                                    <PlusIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                                    <span className="font-bold">Agregar "{searchTerm}" a borradores</span>
                                                </button>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {activeCollection.drafts?.map((draft, idx) => (
                                                    <div key={`draft-${idx}`} className="p-3 rounded-lg border border-accent bg-accent/10 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-bold text-white italic">{draft}</div>
                                                            <span className="text-[10px] uppercase font-bold text-accent tracking-wider">Borrador</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveDraft(draft)} className="p-1 hover:bg-black/20 rounded text-accent"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                ))}

                                                {searchResults.map(entry => {
                                                    const isSelected = activeCollection.entryIds.includes(entry.ID);
                                                    return (
                                                        <div
                                                            key={entry.ID}
                                                            onClick={() => handleToggleEntryInCollection(entry.ID)}
                                                            className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${isSelected ? 'bg-primary/20 border-primary' : 'bg-surface border-border-dark hover:border-primary/50'}`}
                                                        >
                                                            <div className="truncate pr-2">
                                                                <div className="font-bold text-white truncate">{entry.Léxema.join(', ') || entry.Raíz}</div>
                                                                <div className="text-xs text-text-secondary truncate">{entry.Significado.join(', ')}</div>
                                                            </div>
                                                            <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary'}`}>
                                                                {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showDraftsReview && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-surface border border-border-dark rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Nuevas Palabras Detectadas</h3>
                        <p className="text-text-secondary text-sm mb-4">
                            Has creado {activeCollection?.drafts?.length} borradores rápidos. ¿Quieres agregarlos al Léxico Principal ahora?
                        </p>

                        <div className="bg-background-dark rounded border border-border-dark p-3 max-h-40 overflow-y-auto mb-6">
                            {activeCollection?.drafts?.map((d, i) => (
                                <div key={i} className="text-white font-mono text-sm border-b border-border-dark/50 last:border-0 py-1">{d}</div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button onClick={handleConfirmDrafts} className="w-full py-3 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors">
                                Sí, agregar y finalizar
                            </button>
                            <button onClick={() => { setShowDraftsReview(false); setIsSelectingMode(false); }} className="w-full py-2 bg-surface-light hover:bg-surface-light/80 text-text-secondary rounded-lg transition-colors">
                                No, guardar solo selección (descartar borradores)
                            </button>
                            <button onClick={() => setShowDraftsReview(false)} className="w-full py-2 text-text-secondary hover:text-white transition-colors text-xs">
                                Cancelar (Volver a editar)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollectionsManager;
