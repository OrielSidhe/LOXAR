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
import CollectionsPanel from './CollectionsPanel';

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

const CollectionsManager = ({ lexicon, inflection, onAddEntry, onAddBatchEntries, customCategories, onStartTour, onDeleteEntry, onUpdateEntry }: CollectionsManagerProps) => {
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

            <CollectionsPanel
                activeCollection={activeCollection}
                collections={collections}
                lexicon={lexicon}
                inflection={inflection}
                onAddEntry={onAddEntry}
                onAddBatchEntries={onAddBatchEntries}
                onDeleteEntry={onDeleteEntry}
                customCategories={customCategories}
                isSelectingMode={isSelectingMode}
                searchTerm={searchTerm}
                searchResults={searchResults}
                isAddingColumn={isAddingColumn}
                newColumnName={newColumnName}
                showDraftsReview={showDraftsReview}
                onStartTour={onStartTour}
                onToggleEntryInCollection={handleToggleEntryInCollection}
                onUpdateCell={handleUpdateCell}
                onQuickAddDraft={handleQuickAddDraft}
                onRemoveDraft={handleRemoveDraft}
                onFinishSelectionAttempt={handleFinishSelectionAttempt}
                onConfirmDrafts={handleConfirmDrafts}
                onAddColumn={handleAddColumn}
                onRenameColumn={handleRenameColumn}
                onSetIsSelectingMode={(value) => setIsSelectingMode(value)}
                onSetSearchTerm={(value) => setSearchTerm(value)}
                onSetIsAddingColumn={(value) => setIsAddingColumn(value)}
                onSetNewColumnName={(value) => setNewColumnName(value)}
                onSetShowDraftsReview={(value) => setShowDraftsReview(value)}
            />
        </div>
    );
};

export default CollectionsManager;
