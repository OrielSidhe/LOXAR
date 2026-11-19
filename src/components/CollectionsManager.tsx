import { useState, useMemo, useEffect } from 'react';
import { LexiconEntry, NewLexiconEntry, InflectionProfile } from '../types';
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
import {
    ACTIVE_LEXICON_STORAGE_KEY,
    COLLECTION_SHEET_NAME,
    Collection,
    addColumnToCollection,
    addDraftToCollection,
    buildCollectionExportData,
    buildExcelExportRows,
    buildExcelImportPlan,
    collectionFromTemplate,
    createCollection,
    normalizeText,
    readStoredCollections,
    removeDraftFromCollection,
    renameColumnInCollection,
    setCollectionCell,
    toggleEntryInCollection,
    writeStoredCollections,
} from '../utils/collectionsManagerModel';

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
        setCollections(readStoredCollections(localStorage.getItem(ACTIVE_LEXICON_STORAGE_KEY)));
    }, []);

    const saveCollections = (newCollections: Collection[]) => {
        setCollections(newCollections);
        writeStoredCollections(localStorage.getItem(ACTIVE_LEXICON_STORAGE_KEY), newCollections);
    };

    const handleCreateCollection = () => {
        if (!newCollectionName.trim()) return;
        const newCollection = createCollection(newCollectionName);
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
        saveCollections(
            collections.map(c =>
                c.id === activeCollectionId ? toggleEntryInCollection(c, entryId) : c,
            ),
        );
    };

    const handleUpdateCell = (entryId: string, colCategory: string, val: string) => {
        if (!activeCollectionId) return;
        saveCollections(
            collections.map(c =>
                c.id === activeCollectionId
                    ? setCollectionCell(c, entryId, colCategory, val)
                    : c,
            ),
        );
    };

    const handleQuickAddDraft = () => {
        if (!activeCollectionId || !searchTerm.trim()) return;
        const term = searchTerm.trim();
        saveCollections(
            collections.map(c =>
                c.id === activeCollectionId ? addDraftToCollection(c, term) : c,
            ),
        );
        setSearchTerm('');
    };

    const handleRemoveDraft = (draft: string) => {
        if (!activeCollectionId) return;
        saveCollections(
            collections.map(c =>
                c.id === activeCollectionId ? removeDraftFromCollection(c, draft) : c,
            ),
        );
    };

    const handleExportCollection = (collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const exportData = buildCollectionExportData(collection, lexicon);
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
                const data = JSON.parse(event.target?.result as string) as Partial<
                    Pick<Collection, 'name' | 'description' | 'columns'>
                >;
                const newCollection = createCollection(data.name || 'Importada', {
                    description: data.description,
                    columns: data.columns,
                });
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

        const rows = buildExcelExportRows(collection, lexicon, inflection);
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, COLLECTION_SHEET_NAME);
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

                const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
                const plan = buildExcelImportPlan(jsonData, lexicon, file.name);
                if (!plan) {
                    alert('El archivo Excel está vacío.');
                    return;
                }

                if (plan.incomingEntries.length > 0) {
                    if (onAddBatchEntries) {
                        onAddBatchEntries(plan.incomingEntries);
                    } else {
                        plan.incomingEntries.forEach(entry => onAddEntry(entry));
                    }
                }

                const newCollection: Collection = {
                    id: Date.now().toString(),
                    name: plan.name,
                    description: `Importada desde Excel el ${new Date().toLocaleDateString()}`,
                    columns: plan.columns,
                    entryIds: plan.entryIds,
                    drafts: [],
                    customCells: plan.customCells,
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
        const newCollection = collectionFromTemplate(templateType);
        if (!newCollection) return;
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
        const updatedColl = addColumnToCollection(activeCollection, newColumnName);
        saveCollections(collections.map(c => c.id === activeCollection.id ? updatedColl : c));
        setNewColumnName('');
        setIsAddingColumn(false);
    }

    const handleRenameColumn = (colId: string, newName: string) => {
        if (!activeCollection) return;
        const updatedColl = renameColumnInCollection(activeCollection, colId, newName);
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
        const term = normalizeText(searchTerm);
        return lexicon.filter(e =>
            normalizeText(e.Raíz || '').includes(term) ||
            e.Léxema.some(l => normalizeText(l).includes(term)) ||
            e.Significado.some(s => normalizeText(s).includes(term))
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
                onSetIsSelectingMode={(value: boolean) => setIsSelectingMode(value)}
                onSetSearchTerm={(value: string) => setSearchTerm(value)}
                onSetIsAddingColumn={(value: boolean) => setIsAddingColumn(value)}
                onSetNewColumnName={(value: string) => setNewColumnName(value)}
                onSetShowDraftsReview={(value: boolean) => setShowDraftsReview(value)}
            />
        </div>
    );
};

export default CollectionsManager;
