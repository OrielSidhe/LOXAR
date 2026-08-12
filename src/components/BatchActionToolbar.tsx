import { useState, memo } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';

interface BatchActionToolbarProps {
    selectedCount: number;
    customFunctions: string[];
    onClearSelection: () => void;
    onBatchDelete: () => void;
    onBatchChangeFunction: (newFunction: string) => void;
}

const BatchActionToolbar = ({ selectedCount, customFunctions, onClearSelection, onBatchDelete, onBatchChangeFunction }: BatchActionToolbarProps) => {
    const [targetFunction, setTargetFunction] = useState('');

    const handleApplyFunctionChange = () => {
        if (targetFunction) {
            onBatchChangeFunction(targetFunction);
            setTargetFunction('');
        }
    };

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-auto max-w-[90%] bg-surface border border-subtle rounded-lg shadow-2xl p-3 flex items-center justify-center gap-x-4 gap-y-2 flex-wrap animate-fade-in z-40">
            <span className="font-semibold text-text-primary">{selectedCount} {selectedCount === 1 ? 'entrada seleccionada' : 'entradas seleccionadas'}</span>
            
            <button onClick={onClearSelection} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors" title="Limpiar selección" aria-label="Deseleccionar todo">
                <XCircleIcon className="h-5 w-5" />
                Deseleccionar
            </button>

            <div className="flex items-center gap-2 border-l border-subtle pl-4">
                <select 
                    id="batch-function-target"
                    name="batchFunctionTarget"
                    value={targetFunction} 
                    onChange={e => setTargetFunction(e.target.value)}
                    className="bg-background border border-subtle rounded-md shadow-sm py-1 px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Seleccionar nueva función para el lote"
                >
                    <option value="">Cambiar función...</option>
                    {customFunctions.map(fn => <option key={fn} value={fn}>{fn}</option>)}
                </select>
                <button
                    onClick={handleApplyFunctionChange}
                    disabled={!targetFunction}
                    className="p-2 bg-accent text-white rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    title="Aplicar cambio de función"
                    aria-label="Confirmar cambio de función"
                >
                    <CheckCircleIcon className="h-5 w-5" />
                </button>
            </div>
            
            <button onClick={onBatchDelete} className="flex items-center gap-2 p-2 bg-danger text-white rounded-md hover:bg-danger-hover transition-colors" title="Eliminar entradas seleccionadas" aria-label="Eliminar entradas seleccionadas">
                <TrashIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export default memo(BatchActionToolbar);
