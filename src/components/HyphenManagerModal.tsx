

import React, { useState } from 'react';
import { HyphenOperation } from '../types';
import HyphenIcon from './icons/HyphenIcon';
import XCircleIcon from './icons/XCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface HyphenManagerModalProps {
    onApply: (operation: HyphenOperation) => void;
    onClose: () => void;
}

const CATEGORIES = ['prefijo', 'sufijo', 'infijo', 'verbo'];

const HyphenManagerModal = ({ onApply, onClose }: HyphenManagerModalProps) => {
    const [addSelection, setAddSelection] = useState<Record<string, boolean>>({});
    const [removeSelection, setRemoveSelection] = useState<Record<string, boolean>>({});

    const handleCheckboxChange = (
        type: 'add' | 'remove',
        category: string,
        isChecked: boolean
    ) => {
        const setter = type === 'add' ? setAddSelection : setRemoveSelection;
        setter(prev => ({ ...prev, [category]: isChecked }));
    };

    const handleApply = (type: 'add' | 'remove') => {
        const selection = type === 'add' ? addSelection : removeSelection;
        const categories = Object.keys(selection).filter(cat => selection[cat]);
        if (categories.length > 0) {
            onApply({ type, categories });
        }
    };
    
    const renderSection = (
        type: 'add' | 'remove',
        title: string,
        description: string
    ) => {
        const selection = type === 'add' ? addSelection : removeSelection;
        const isButtonDisabled = Object.values(selection).every(v => !v);

        return (
            <div className="bg-background/50 p-4 rounded-md border border-subtle">
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary mb-3">{description}</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {CATEGORIES.map(cat => (
                        <label key={cat} className="flex items-center gap-2 p-2 bg-background rounded-md hover:bg-subtle/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selection[cat] || false}
                                onChange={(e) => handleCheckboxChange(type, cat, e.target.checked)}
                                className="form-checkbox h-4 w-4 rounded bg-subtle text-accent focus:ring-accent"
                            />
                            <span className="capitalize text-text-primary">{cat}</span>
                        </label>
                    ))}
                </div>
                <button
                    onClick={() => handleApply(type)}
                    disabled={isButtonDisabled}
                    className="w-full px-4 py-2 bg-accent text-white font-semibold rounded-md shadow-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    Aplicar
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <HyphenIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Administrador de Guiones</h2>
                            <p className="text-sm text-text-secondary">Añade o elimina guiones para mantener la consistencia.</p>
                        </div>
                    </div>
                     <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-4">
                    <div className="p-3 bg-warning/20 border border-warning text-amber-300 rounded-md text-sm flex items-start gap-3" role="alert">
                        <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>Atención:</strong> Estas acciones modifican permanentemente los datos de tu léxico. Se recomienda hacer una copia de seguridad antes de proceder.
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderSection('add', 'Añadir Guiones', 'Añade guiones a los lexemas de las categorías seleccionadas que no los tengan.')}
                        {renderSection('remove', 'Quitar Guiones', 'Elimina los guiones al principio y al final de los lexemas en las categorías seleccionadas.')}
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

export default HyphenManagerModal;