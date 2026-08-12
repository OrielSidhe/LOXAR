

import React, { useState, useMemo } from 'react';
import { LexiconEntry, CategoryOperation } from '../types';
import CombineIcon from './icons/CombineIcon';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Tooltip from './Tooltip';

interface CategoryManagerModalProps {
    lexicon: LexiconEntry[];
    onManage: (operations: CategoryOperation[]) => void;
    onClose: () => void;
}

interface CategoryInfo {
    name: string;
    count: number;
}

const CategoryManagerModal = ({ lexicon, onManage, onClose }: CategoryManagerModalProps) => {
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [mergeTarget, setMergeTarget] = useState('');
    const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
    const [renameInput, setRenameInput] = useState('');
    
    const categoryList: CategoryInfo[] = useMemo(() => {
        const counts = new Map<string, number>();
        lexicon.forEach(entry => {
            const cat = entry.Categoría || 'desconocida';
            counts.set(cat, (counts.get(cat) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [lexicon]);

    const handleToggleSelection = (categoryName: string) => {
        setSelectedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) {
                newSet.delete(categoryName);
            } else {
                newSet.add(categoryName);
            }
            // Auto-fill merge target if only one is selected
            if (newSet.size === 1) {
                setMergeTarget(Array.from(newSet)[0]);
            }
            return newSet;
        });
    };

    const handleMerge = () => {
        if (selectedCategories.size < 2 || !mergeTarget.trim()) {
            alert("Selecciona al menos dos categorías y proporciona un nombre de destino para fusionar.");
            return;
        }
        const operation: CategoryOperation = {
            type: 'merge',
            from: Array.from(selectedCategories),
            to: mergeTarget.trim(),
        };
        onManage([operation]);
    };

    const handleStartRename = (categoryName: string) => {
        setRenamingCategory(categoryName);
        setRenameInput(categoryName);
    };

    const handleConfirmRename = () => {
        if (renamingCategory && renameInput.trim() && renamingCategory !== renameInput.trim()) {
             const operation: CategoryOperation = {
                type: 'rename',
                from: renamingCategory,
                to: renameInput.trim(),
            };
            onManage([operation]);
        }
        setRenamingCategory(null);
    };

    const handleDelete = (categoryName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar la categoría "${categoryName}"? Todas las entradas con esta categoría pasarán a ser "desconocida".`)) {
             const operation: CategoryOperation = {
                type: 'delete',
                category: categoryName,
            };
            onManage([operation]);
        }
    };
    

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <CombineIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Gestor de Categorías</h2>
                            <p className="text-sm text-text-secondary">Unifica, renombra y organiza las categorías de tu léxico.</p>
                        </div>
                    </div>
                     <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>

                <main className="p-6 flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category List */}
                    <div className="flex flex-col h-full">
                         <h3 className="text-lg font-semibold text-text-primary mb-2 flex-shrink-0">Categorías Existentes</h3>
                         <div className="flex-grow overflow-y-auto bg-background p-2 rounded-md border border-subtle">
                            {categoryList.map(cat => (
                                renamingCategory === cat.name ? (
                                    <div key={cat.name} className="flex items-center justify-between p-2 my-1 bg-accent/20 rounded-md">
                                        <input 
                                            type="text"
                                            value={renameInput}
                                            onChange={(e) => setRenameInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                                            autoFocus
                                            className="bg-surface border border-accent rounded-md py-1 px-2 text-sm w-full"
                                        />
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={handleConfirmRename} className="text-success hover:text-green-400">Guardar</button>
                                            <button onClick={() => setRenamingCategory(null)} className="text-danger hover:text-red-400">Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={cat.name} className="flex items-center justify-between p-2 my-1 rounded-md hover:bg-subtle/50">
                                        <label className="flex items-center gap-3 flex-grow cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.has(cat.name)}
                                                onChange={() => handleToggleSelection(cat.name)}
                                                className="form-checkbox h-4 w-4 rounded bg-subtle text-accent focus:ring-accent"
                                            />
                                            <span className="text-text-primary">{cat.name}</span>
                                            <span className="text-xs text-text-secondary bg-background px-2 py-0.5 rounded-full">{cat.count}</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <Tooltip text="Renombrar categoría"><button onClick={() => handleStartRename(cat.name)} className="text-text-secondary hover:text-accent"><EditIcon className="h-4 w-4"/></button></Tooltip>
                                            <Tooltip text="Eliminar categoría"><button onClick={() => handleDelete(cat.name)} className="text-text-secondary hover:text-danger"><TrashIcon className="h-4 w-4"/></button></Tooltip>
                                        </div>
                                    </div>
                                )
                            ))}
                         </div>
                    </div>
                    {/* Action Panel */}
                    <div className="bg-background/50 p-4 rounded-md border border-subtle">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Fusionar Categorías Seleccionadas</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Categorías a fusionar:</label>
                                <div className="p-3 bg-background rounded-md min-h-[50px] border border-subtle text-sm">
                                    {selectedCategories.size > 0 ? Array.from(selectedCategories).join(', ') : <span className="text-text-secondary">Selecciona 2 o más de la lista...</span>}
                                </div>
                            </div>
                             <div>
                                <label htmlFor="mergeTarget" className="block text-sm font-medium text-text-secondary mb-1">Nombre de la nueva categoría:</label>
                                <input
                                    type="text"
                                    id="mergeTarget"
                                    value={mergeTarget}
                                    onChange={(e) => setMergeTarget(e.target.value)}
                                    placeholder="Ej: sustantivo"
                                    disabled={selectedCategories.size === 0}
                                    className="w-full bg-background border border-subtle rounded-md py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                />
                            </div>
                             <button
                                onClick={handleMerge}
                                disabled={selectedCategories.size < 2 || !mergeTarget.trim()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white font-semibold rounded-md shadow-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                            >
                                <CombineIcon className="h-5 w-5"/>
                                Fusionar {selectedCategories.size} Categorías
                            </button>
                        </div>
                    </div>
                </main>

                 <footer className="p-4 flex justify-end gap-4 border-t border-subtle flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors">
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CategoryManagerModal;