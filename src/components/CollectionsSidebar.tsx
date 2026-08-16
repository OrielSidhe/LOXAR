import React from 'react';
import PlusIcon from './icons/PlusIcon';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';

export interface Collection {
    id: string;
    name: string;
    entryIds: string[];
    columns?: { id: string; name: string; categoryLink: string }[];
    drafts?: string[];
    description?: string;
    customCells?: Record<string, Record<string, string>>;
}

export interface CollectionsSidebarProps {
    collections: Collection[];
    activeCollectionId: string | null;
    isCreating: boolean;
    newCollectionName: string;
    onCreateCollection: () => void;
    onCreateTemplate: (templateType: string) => void;
    onImportCollection: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImportCollectionExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExportCollection: (collectionId: string) => void;
    onExportCollectionExcel: (collectionId: string) => void;
    onDeleteCollection: (collectionId: string) => void;
    onSelectCollection: (id: string) => void;
    onSetIsSelectingMode: (value: boolean) => void;
    onSetIsCreating: (value: boolean) => void;
    onSetNewCollectionName: (value: string) => void;
}

const CollectionsSidebar: React.FC<CollectionsSidebarProps> = ({
    collections,
    activeCollectionId,
    isCreating,
    newCollectionName,
    onCreateCollection,
    onCreateTemplate,
    onImportCollection,
    onImportCollectionExcel,
    onExportCollection,
    onExportCollectionExcel,
    onDeleteCollection,
    onSelectCollection,
    onSetIsSelectingMode,
    onSetIsCreating,
    onSetNewCollectionName,
}) => {
    return (
        <div id="collections-sidebar" className="w-64 bg-[#0a0a0c] border-r border-border-dark flex flex-col p-4 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white font-display">Colecciones</h2>
                <button onClick={() => onSetIsCreating(true)} className="p-1 hover:bg-white/10 rounded-full text-primary" title="Nueva Colección">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            {isCreating && (
                <div className="mb-4 bg-background p-2 rounded-lg border border-border-dark">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Nombre..."
                        className="w-full bg-transparent border-b border-primary/50 focus:border-primary outline-none text-sm text-white mb-2 pb-1"
                        value={newCollectionName}
                        onChange={e => onSetNewCollectionName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onCreateCollection()}
                    />
                    <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => onSetIsCreating(false)} className="text-text-secondary hover:text-white">Cancelar</button>
                        <button onClick={onCreateCollection} className="text-primary font-bold hover:text-primary-hover">Crear</button>
                    </div>
                </div>
            )}

            <div className="mb-3 flex flex-col gap-1">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Plantillas</div>
                <button onClick={() => onCreateTemplate('pronombres')} className="text-xs text-text-primary hover:text-white hover:bg-white/10 px-2 py-1 rounded text-left transition-colors">
                    📋 Pronombres
                </button>
                <button onClick={() => onCreateTemplate('preposiciones')} className="text-xs text-text-primary hover:text-white hover:bg-white/10 px-2 py-1 rounded text-left transition-colors">
                    📍 Preposiciones
                </button>
                <button onClick={() => onCreateTemplate('numeros')} className="text-xs text-text-primary hover:text-white hover:bg-white/10 px-2 py-1 rounded text-left transition-colors">
                    🔢 Números
                </button>
            </div>

            <div className="mb-3 flex flex-col gap-1.5">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Importar / Exportar</div>
                <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 border border-border-dark px-2.5 py-1.5 rounded text-xs font-semibold text-text-primary transition-colors flex items-center justify-center gap-1" title="Importar colección en formato JSON">
                        <UploadIcon className="w-3.5 h-3.5 text-primary" />
                        <span>JSON</span>
                        <input type="file" accept=".json" onChange={onImportCollection} />
                    </label>
                    <label className="flex-1 cursor-pointer bg-surface-light/30 hover:bg-surface-light/50 border border-border-dark px-2.5 py-1.5 rounded text-xs font-semibold text-text-primary transition-colors flex items-center justify-center gap-1" title="Importar tabla de flexión desde Excel (.xlsx)">
                        <UploadIcon className="w-3.5 h-3.5 text-success" />
                        <span>Excel</span>
                        <input type="file" accept=".xlsx" onChange={onImportCollectionExcel} />
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                {collections.map(c => (
                    <div
                        key={c.id}
                        onClick={() => { onSelectCollection(c.id); onSetIsSelectingMode(false); }}
                        className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all ${activeCollectionId === c.id ? 'bg-primary/20 text-white border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
                    >
                        <div>
                            <div className="font-semibold text-sm">{c.name}</div>
                            <div className="text-xs opacity-70">
                                {c.entryIds.length} palabras
                                {c.drafts && c.drafts.length > 0 && <span className="text-accent ml-1">+{c.drafts.length} borradores</span>}
                            </div>
                        </div>
                        <div className="flex gap-1 items-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); onExportCollection(c.id); }}
                                className={`p-1 rounded hover:bg-primary/20 hover:text-primary transition-opacity ${activeCollectionId === c.id ? 'opacity-100 text-primary-hover' : 'opacity-0 group-hover:opacity-100 text-text-secondary'}`}
                                title="Exportar JSON"
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onExportCollectionExcel(c.id); }}
                                className={`p-1 rounded hover:bg-success/20 hover:text-success transition-opacity ${activeCollectionId === c.id ? 'opacity-100 text-success' : 'opacity-0 group-hover:opacity-100 text-text-secondary'}`}
                                title="Exportar Excel (.xlsx)"
                            >
                                <span className="font-extrabold text-[10px] px-0.5">XL</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteCollection(c.id); }}
                                className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-opacity ${activeCollectionId === c.id ? 'opacity-100 text-primary-hover' : 'opacity-0 group-hover:opacity-100 text-text-secondary'}`}
                                title="Eliminar"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

CollectionsSidebar.displayName = 'CollectionsSidebar';

export default CollectionsSidebar;
