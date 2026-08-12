

import React from 'react';
import XCircleIcon from './icons/XCircleIcon';
import WandIcon from './icons/WandIcon';
import SparkleIcon from './icons/SparkleIcon';
import AutoFixIcon from './icons/AutoFixIcon';

interface AiAssistantModalProps {
    onClose: () => void;
    onCompleteCategories: () => void;
    onFillMissing: () => void;
    stats: { needsCategory: number; totalIncomplete: number; };
    disabled: boolean;
}

const AiAssistantModal = ({ onClose, onCompleteCategories, onFillMissing, stats, disabled }: AiAssistantModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <WandIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Asistente IA</h2>
                            <p className="text-sm text-text-secondary">Automatiza tareas de completado para tu léxico.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-4">
                    <button
                        onClick={onCompleteCategories}
                        disabled={disabled || stats.needsCategory === 0}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                        <div className="text-accent bg-accent/20 p-2 rounded-md"><SparkleIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Completar Categorías ({stats.needsCategory})</p>
                             <p className="text-sm text-text-secondary">Usa la IA para rellenar la categoría gramatical de las entradas que no la tienen.</p>
                        </div>
                    </button>
                    <button
                        onClick={onFillMissing}
                        disabled={disabled || (stats.totalIncomplete === 0 && stats.needsCategory === 0)}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                         <div className="text-accent bg-accent/20 p-2 rounded-md"><AutoFixIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Completar todo con IA</p>
                             <p className="text-sm text-text-secondary">Rellena categorías, luego genera lexemas y raíces faltantes. Requiere un Perfil Generativo.</p>
                        </div>
                    </button>
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

export default AiAssistantModal;