
import React from 'react';
import XCircleIcon from './icons/XCircleIcon';
import WrenchIcon from './icons/WrenchIcon';
import CombineIcon from './icons/CombineIcon';
import BarChartIcon from './icons/BarChartIcon';
import HyphenIcon from './icons/HyphenIcon';
import PenToolIcon from './icons/PenToolIcon';
import BookOpenIcon from './icons/BookOpenIcon';

interface LexiconToolsModalProps {
    onClose: () => void;
    onManageCategories: () => void;
    onManageHyphens: () => void;
    onGenerateReport: () => void;
    onOpenNeography: () => void;
    onOpenGrammar: () => void;
    disabled: boolean;
    totalEntries: number;
}

const LexiconToolsModal = ({ onClose, onManageCategories, onManageHyphens, onGenerateReport, onOpenNeography, onOpenGrammar, disabled, totalEntries }: LexiconToolsModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <WrenchIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Herramientas del Léxico</h2>
                            <p className="text-sm text-text-secondary">Gestiona y analiza tu léxico.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-4 custom-scrollbar">
                     <button
                        onClick={onOpenGrammar}
                        disabled={disabled}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                        <div className="text-accent bg-accent/20 p-2 rounded-md"><BookOpenIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Editor de Gramática</p>
                             <p className="text-sm text-text-secondary">Define reglas de orden de palabras, morfología y roles sintácticos.</p>
                        </div>
                    </button>
                     <button
                        onClick={onOpenNeography}
                        disabled={disabled}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                        <div className="text-accent bg-accent/20 p-2 rounded-md"><PenToolIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Taller de Escritura</p>
                             <p className="text-sm text-text-secondary">Diseña tu propio sistema de escritura y crea una fuente para tu conlang.</p>
                        </div>
                    </button>
                    <button
                        onClick={onManageCategories}
                        disabled={disabled}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                        <div className="text-accent bg-accent/20 p-2 rounded-md"><CombineIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Gestor de Categorías</p>
                             <p className="text-sm text-text-secondary">Unifica, renombra y organiza las categorías gramaticales de tu léxico.</p>
                        </div>
                    </button>
                    <button
                        onClick={onManageHyphens}
                        disabled={disabled}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                        <div className="text-accent bg-accent/20 p-2 rounded-md"><HyphenIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Administrador de Guiones</p>
                             <p className="text-sm text-text-secondary">Añade o elimina guiones de forma permanente según la categoría.</p>
                        </div>
                    </button>
                    <button
                        onClick={onGenerateReport}
                        disabled={disabled || totalEntries === 0}
                        className="bg-background p-4 rounded-lg flex items-center gap-4 text-left w-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed hover:bg-subtle focus:ring-2 focus:ring-accent"
                    >
                         <div className="text-accent bg-accent/20 p-2 rounded-md"><BarChartIcon className="h-6 w-6"/></div>
                        <div className="flex-grow">
                             <p className="text-lg font-semibold text-text-primary">Generar Reporte</p>
                             <p className="text-sm text-text-secondary">Muestra estadísticas detalladas sobre el léxico actual.</p>
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

export default LexiconToolsModal;
