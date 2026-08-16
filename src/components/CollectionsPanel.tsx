import React, { useState, useMemo } from 'react';
import { LexiconEntry, InflectionProfile, NewLexiconEntry } from '../types';
import { generateInflections, filterParadigmsForFunction } from '../utils/inflectionUtils';
import FilterIcon from './icons/FilterIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';
import SearchIcon from './icons/SearchIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import SparkleIcon from './icons/SparkleIcon';
import EditIcon from './icons/EditIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import ParadigmCell from './ParadigmCell';
import CollectionsDraftsReview from './CollectionsDraftsReview';

export interface CollectionColumn {
    id: string;
    name: string;
    categoryLink: string;
}

export interface Collection {
    id: string;
    name: string;
    entryIds: string[];
    columns?: CollectionColumn[];
    drafts?: string[];
    description?: string;
    customCells?: {
        [rowEntryId: string]: {
            [columnCategory: string]: string;
        };
    };
}

export interface CollectionsPanelProps {
    activeCollection: Collection | null | undefined;
    collections: Collection[];
    lexicon: LexiconEntry[];
    inflection: InflectionProfile;
    onAddEntry: (entry: NewLexiconEntry) => void;
    onAddBatchEntries?: (entries: NewLexiconEntry[]) => void;
    onDeleteEntry: (id: string) => void;
    customCategories: string[];
    isSelectingMode: boolean;
    searchTerm: string;
    searchResults: LexiconEntry[];
    isAddingColumn: boolean;
    newColumnName: string;
    showDraftsReview: boolean;
    onStartTour: () => void;
    onToggleEntryInCollection: (entryId: string) => void;
    onUpdateCell: (entryId: string, colCategory: string, val: string) => void;
    onQuickAddDraft: () => void;
    onRemoveDraft: (draft: string) => void;
    onFinishSelectionAttempt: () => void;
    onConfirmDrafts: () => void;
    onAddColumn: () => void;
    onRenameColumn: (colId: string, newName: string) => void;
    onSetIsSelectingMode: (value: boolean) => void;
    onSetSearchTerm: (value: string) => void;
    onSetIsAddingColumn: (value: boolean) => void;
    onSetNewColumnName: (value: string) => void;
    onSetShowDraftsReview: (value: boolean) => void;
}

const CollectionsPanel: React.FC<CollectionsPanelProps> = ({
    activeCollection,
    collections,
    lexicon,
    inflection,
    onAddEntry,
    onAddBatchEntries,
    onDeleteEntry,
    customCategories,
    isSelectingMode,
    searchTerm,
    searchResults,
    isAddingColumn,
    newColumnName,
    showDraftsReview,
    onStartTour,
    onToggleEntryInCollection,
    onUpdateCell,
    onQuickAddDraft,
    onRemoveDraft,
    onFinishSelectionAttempt,
    onConfirmDrafts,
    onAddColumn,
    onRenameColumn,
    onSetIsSelectingMode,
    onSetSearchTerm,
    onSetIsAddingColumn,
    onSetNewColumnName,
    onSetShowDraftsReview,
}) => {
    const [editingCell, setEditingCell] = useState<{ entryId: string; category: string } | null>(null);
    const [cellValue, setCellValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const activeCollectionEntries = useMemo(() => {
        if (!activeCollection) return [];
        return activeCollection.entryIds
            .map(id => lexicon.find(e => e.ID === id))
            .filter((e): e is LexiconEntry => Boolean(e));
    }, [activeCollection, lexicon]);

    if (!activeCollection) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50">
                <FilterIcon className="w-16 h-16 mb-4" />
                <p className="text-lg">Selecciona una colección</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-surface-dark rounded-r-xl overflow-hidden relative border border-border-dark">
            <div className="bg-surface border-b border-border-dark p-4 flex justify-between items-center shadow-md z-1">
                <div>
                    <h3 className="text-xl font-bold text-white font-display mb-1">{activeCollection.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>{activeCollection.entryIds.length} confirmadas</span>
                        {activeCollection.drafts && activeCollection.drafts.length > 0 && (
                            <button
                                onClick={() => onSetShowDraftsReview(true)}
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
                        onClick={() => onSetIsSelectingMode(true)}
                        className="px-3 py-2 bg-primary hover:bg-primary-dark text-background-dark text-sm font-bold rounded-lg transition-colors"
                    >
                        + Agregar Palabras
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-border-dark">
                <div className="flex items-center gap-2">
                    {isAddingColumn ? (
                        <div className="flex items-center gap-2 animate-fade-in bg-surface-light/30 p-1 rounded border border-primary/30">
                            <input
                                autoFocus
                                type="text"
                                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/50 w-32"
                                placeholder="Nombre columna..."
                                value={newColumnName}
                                onChange={(e) => onSetNewColumnName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onAddColumn()}
                            />
                            <button onClick={onAddColumn} className="text-primary hover:text-white p-1"><CheckCircleIcon className="w-3 h-3" /></button>
                            <button onClick={() => { onSetIsAddingColumn(false); onSetNewColumnName(''); }} className="text-text-secondary hover:text-white p-1"><XCircleIcon className="w-3 h-3" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value && e.target.value !== '__custom__') {
                                        onAddColumn();
                                        onSetNewColumnName(e.target.value);
                                    }
                                }}
                                className="bg-surface-light/20 border border-border-dark rounded px-2 py-1 text-xs text-text-secondary"
                            >
                                <option value="">+ Añadir columna...</option>
                                {customCategories.map(f => (
                                    <option key={f} value={f} className="bg-surface-dark text-white">{f}</option>
                                ))}
                                <option value="__custom__" className="bg-surface-dark text-primary font-bold">+ Crear Personalizada...</option>
                            </select>
                            <button
                                onClick={() => onSetIsAddingColumn(true)}
                                className="px-2 py-1 bg-surface-light/20 hover:bg-surface-light/40 border border-border-dark rounded text-xs text-text-secondary"
                            >
                                + Nueva
                            </button>
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
                                            onChange={(e) => onRenameColumn(col.id, e.target.value)}
                                            title="Click para renombrar"
                                        />
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Borrar columna?')) {
                                                    onRenameColumn(col.id, col.name);
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
                                                onUpdateLocalValue={(val) => onUpdateCell(entry.ID, col.categoryLink, val)}
                                            />
                                        </td>
                                    ))}

                                    <td className="p-3 text-right">
                                        <button onClick={() => onToggleEntryInCollection(entry.ID)} className="text-text-secondary hover:text-red-400 opacity-50 hover:opacity-100"><XCircleIcon className="w-4 h-4" /></button>
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
                            onClick={() => onSetIsSelectingMode(false)}
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
                                onChange={(e) => onSetSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background">
                        <div className="max-w-5xl mx-auto pb-20 space-y-2">
                            {searchTerm.trim() && (
                                <button
                                    onClick={onQuickAddDraft}
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
                                        <button onClick={() => onRemoveDraft(draft)} className="p-1 hover:bg-black/20 rounded text-accent"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}

                                {searchResults.map(entry => {
                                    const isSelected = activeCollection.entryIds.includes(entry.ID);
                                    return (
                                        <div
                                            key={entry.ID}
                                            onClick={() => onToggleEntryInCollection(entry.ID)}
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

            <CollectionsDraftsReview
                show={showDraftsReview}
                drafts={activeCollection.drafts || []}
                onConfirm={onConfirmDrafts}
                onClose={() => onSetShowDraftsReview(false)}
                onDiscardSelection={() => { onSetShowDraftsReview(false); onSetIsSelectingMode(false); }}
            />
        </div>
    );
};

CollectionsPanel.displayName = 'CollectionsPanel';

export default CollectionsPanel;
