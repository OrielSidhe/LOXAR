import { useState, useMemo, memo } from 'react';
import { LexiconEntry, FunctionOperation } from '../types';
import CombineIcon from './icons/CombineIcon';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import Tooltip from './Tooltip';
import PlusIcon from './icons/PlusIcon';

interface FunctionManagerModalProps {
    lexicon: LexiconEntry[];
    customFunctions: string[];
    onManage: (operations: FunctionOperation[]) => void;
    onAdd: (newFunction: string) => void;
    onClose: () => void;
}

interface FunctionInfo {
    name: string;
    count: number;
}

const FunctionManagerModal = ({ lexicon, customFunctions, onManage, onAdd, onClose }: FunctionManagerModalProps) => {
    const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set());
    const [mergeTarget, setMergeTarget] = useState('');
    const [renamingFunction, setRenamingFunction] = useState<string | null>(null);
    const [renameInput, setRenameInput] = useState('');
    const [newFunctionInput, setNewFunctionInput] = useState('');
    
    const functionList: FunctionInfo[] = useMemo(() => {
        const counts = new Map<string, number>();
        lexicon.forEach(entry => {
            const cat = entry.Categoría || 'desconocida';
            counts.set(cat, (counts.get(cat) || 0) + 1);
        });
        customFunctions.forEach(func => { if (!counts.has(func)) counts.set(func, 0); });
        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [lexicon, customFunctions]);

    const handleToggleSelection = (functionName: string) => {
        setSelectedFunctions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(functionName)) newSet.delete(functionName);
            else newSet.add(functionName);
            if (newSet.size === 1) setMergeTarget(Array.from(newSet)[0]);
            return newSet;
        });
    };

    const handleMerge = () => {
        if (selectedFunctions.size < 2 || !mergeTarget.trim()) {
            alert("Selecciona al menos dos categoriaes y proporciona un nombre de destino para fusionar.");
            return;
        }
        if (window.confirm(`¿Seguro que quieres fusionar ${selectedFunctions.size} categoriaes en "${mergeTarget.trim()}"?`)) {
            const operation: FunctionOperation = { type: 'merge', from: Array.from(selectedFunctions), to: mergeTarget.trim() };
            onManage([operation]);
            setSelectedFunctions(new Set());
            setMergeTarget('');
        }
    };

    const handleStartRename = (functionName: string) => {
        setRenamingFunction(functionName);
        setRenameInput(functionName);
    };

    const handleConfirmRename = () => {
        if (renamingFunction && renameInput.trim() && renamingFunction !== renameInput.trim()) {
             const operation: FunctionOperation = { type: 'rename', from: renamingFunction, to: renameInput.trim() };
            onManage([operation]);
        }
        setRenamingFunction(null);
    };

    const handleDelete = (functionName: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar la función "${functionName}"? Las entradas afectadas pasarán a ser "desconocida".`)) {
             const operation: FunctionOperation = { type: 'delete', category: functionName };
            onManage([operation]);
        }
    };

    const handleAddNewFunction = () => {
        if (newFunctionInput.trim()) {
            onAdd(newFunctionInput.trim());
            setNewFunctionInput('');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="functions-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <CombineIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 id="functions-title" className="text-2xl font-bold text-text-primary font-display">Gestor de Funciones</h2>
                            <p className="text-sm text-text-secondary">Unifica, renombra y organiza las categoriaes gramaticales de tu léxico.</p>
                        </div>
                    </div>
                     <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>

                <main className="p-6 flex-grow overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col h-full">
                         <h3 className="text-lg font-semibold text-text-primary mb-2 flex-shrink-0">Funciones del Léxico</h3>
                         <div className="flex-grow overflow-y-auto bg-background p-2 rounded-md border border-subtle">
                            {functionList.map(cat => (
                                renamingFunction === cat.name ? (
                                    <div key={cat.name} className="flex items-center justify-between p-2 my-1 bg-accent/20 rounded-md">
                                        <input type="text" value={renameInput} onChange={e => setRenameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConfirmRename()} autoFocus className="bg-surface border border-accent rounded-md py-1 px-2 text-sm w-full"/>
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={handleConfirmRename} className="text-success hover:text-green-400">Guardar</button>
                                            <button onClick={() => setRenamingFunction(null)} className="text-danger hover:text-red-400">Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={cat.name} className="flex items-center justify-between p-2 my-1 rounded-md hover:bg-subtle/50">
                                        <label className="flex items-center gap-3 flex-grow cursor-pointer">
                                            <input type="checkbox" checked={selectedFunctions.has(cat.name)} onChange={() => handleToggleSelection(cat.name)} className="form-checkbox h-4 w-4 rounded bg-subtle text-accent focus:ring-accent"/>
                                            <span className="text-text-primary">{cat.name}</span>
                                            <span className="text-xs text-text-secondary bg-background px-2 py-0.5 rounded-full">{cat.count}</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <Tooltip text="Renombrar función"><button onClick={() => handleStartRename(cat.name)} className="text-text-secondary hover:text-accent" aria-label={`Renombrar ${cat.name}`}><EditIcon className="h-4 w-4"/></button></Tooltip>
                                            <Tooltip text="Eliminar función"><button onClick={() => handleDelete(cat.name)} className="text-text-secondary hover:text-danger" aria-label={`Eliminar ${cat.name}`}><TrashIcon className="h-4 w-4"/></button></Tooltip>
                                        </div>
                                    </div>
                                )
                            ))}
                         </div>
                         <div className="flex-shrink-0 mt-2 flex items-center gap-2">
                            <input type="text" value={newFunctionInput} onChange={(e) => setNewFunctionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewFunction()} placeholder="Añadir nueva función..." className="flex-grow bg-background border border-subtle rounded-md py-1 px-2 text-sm"/>
                            <button onClick={handleAddNewFunction} className="p-2 bg-accent text-white rounded-md hover:bg-accent-hover" aria-label="Añadir nueva función"><PlusIcon className="h-4 w-4"/></button>
                        </div>
                    </div>
                    <div className="bg-background/50 p-4 rounded-md border border-subtle">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Fusionar Funciones Seleccionadas</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Funciones a fusionar:</label>
                                <div className="p-3 bg-background rounded-md min-h-[50px] border border-subtle text-sm">
                                    {selectedFunctions.size > 0 ? Array.from(selectedFunctions).join(', ') : <span className="text-text-secondary">Selecciona 2 o más de la lista...</span>}
                                </div>
                            </div>
                             <div>
                                <label htmlFor="mergeTarget" className="block text-sm font-medium text-text-secondary mb-1">Nombre de la nueva función:</label>
                                <input type="text" id="mergeTarget" value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} placeholder="Ej: sustantivo" disabled={selectedFunctions.size === 0} className="w-full bg-background border border-subtle rounded-md py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"/>
                            </div>
                             <button onClick={handleMerge} disabled={selectedFunctions.size < 2 || !mergeTarget.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white font-semibold rounded-md shadow-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                                <CombineIcon className="h-5 w-5"/>
                                Fusionar {selectedFunctions.size} Funciones
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

export default memo(FunctionManagerModal);
