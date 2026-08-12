
import React, { useState, useMemo } from 'react';
import { MissingWord, LexiconMetadata } from '../types';
import LightBulbIcon from './icons/LightBulbIcon';
import PlusIcon from './icons/PlusIcon';
import SparkleIcon from './icons/SparkleIcon';
import XCircleIcon from './icons/XCircleIcon';
import FilterIcon from './icons/FilterIcon';

interface SuggestionsWorkbenchProps {
    suggestions: MissingWord[];
    listName: string;
    onClose: () => void;
    onAddManually: (word: MissingWord) => void;
    onGenerateAI: (word: MissingWord) => void;
    isLoading: boolean;
    activeMetadata: LexiconMetadata | null;
}

const SuggestionsWorkbench = ({ suggestions, listName, onClose, onAddManually, onGenerateAI, isLoading, activeMetadata }: SuggestionsWorkbenchProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const categories = useMemo(() => {
        const cats = new Set(suggestions.map(s => s.Categoría));
        return Array.from(cats).sort();
    }, [suggestions]);

    const isInitial = suggestions.length === 0 && !isLoading;

    const filteredSuggestions = useMemo(() => {
        return suggestions.filter(s => {
            const matchesSearch = s.Significado.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || s.Categoría === filterCategory;
            return matchesSearch && matchesCategory;
        });
    }, [suggestions, searchTerm, filterCategory]);

    return (
        <div className="bg-surface rounded-lg shadow-lg border border-subtle flex flex-col h-full min-h-[500px] animate-fade-in overflow-hidden">
            <header className="p-4 border-b border-subtle bg-background/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LightBulbIcon className="h-5 w-5 text-accent" />
                    <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">{listName}</h2>
                </div>
                {suggestions.length > 0 && (
                    <div className="flex items-center gap-2">
                         <input
                            id="suggestions-search"
                            name="suggestionsSearch"
                            type="text"
                            placeholder="Filtrar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoading}
                            className="w-24 sm:w-32 bg-background border border-subtle rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                         <button onClick={onClose} className="p-1 text-text-secondary hover:text-danger rounded" title="Ocultar sugerencias">
                            <XCircleIcon className="h-4 w-4"/>
                        </button>
                    </div>
                )}
            </header>
           
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-background/10">
                <table className="w-full text-sm text-left table-fixed">
                    <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm z-10">
                        <tr className="border-b border-subtle">
                            <th className="p-3 font-semibold text-text-secondary w-[40%] uppercase">{activeMetadata?.mainLanguage || 'Significado'}</th>
                            <th className="p-3 font-semibold text-text-secondary w-[30%]">Categoría</th>
                            <th className="p-3 font-semibold text-text-secondary w-[30%] text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && suggestions.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center p-12">
                                    <SparkleIcon className="h-8 w-8 text-accent animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-text-secondary animate-pulse">Analizando léxico y buscando conceptos faltantes...</p>
                                </td>
                            </tr>
                        ) : isInitial ? (
                            <tr>
                                <td colSpan={3} className="text-center p-12 space-y-4">
                                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <SparkleIcon className="h-8 w-8 text-accent" />
                                    </div>
                                    <h3 className="text-text-primary font-bold">Listas de Sugerencias</h3>
                                    <p className="text-xs text-text-secondary max-w-[250px] mx-auto">
                                        Compara tu léxico con listas universales (Swadesh) y conceptos comunes para expandir tu idioma.
                                    </p>
                                    <p className="text-[10px] text-text-secondary italic">Haz clic en "Analizar Léxico" arriba para empezar.</p>
                                </td>
                            </tr>
                        ) : filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map((word) => (
                                <tr key={word.Significado} className="border-t border-subtle hover:bg-accent/5 transition-colors group">
                                    <td className="p-3 text-text-primary font-bold text-sm truncate">{word.Significado}</td>
                                    <td className="p-3 text-text-secondary text-xs truncate italic">{word.Categoría}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button 
                                                onClick={() => onAddManually(word)}
                                                disabled={isLoading}
                                                className="p-1.5 bg-background border border-subtle hover:border-accent hover:text-accent rounded transition-all disabled:opacity-30"
                                                title="Añadir manualmente"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => onGenerateAI(word)}
                                                disabled={isLoading} 
                                                className="p-1.5 bg-background border border-accent/30 text-accent hover:bg-accent hover:text-white rounded shadow-sm transition-all disabled:opacity-30"
                                                title="Generar con IA"
                                            >
                                                <SparkleIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan={3} className="text-center p-12 text-text-secondary">
                                    {searchTerm 
                                        ? 'No hay resultados para esta búsqueda.'
                                        : 'Todo el léxico está cubierto por ahora.'
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <footer className="p-3 border-t border-subtle bg-background/20 text-[10px] text-text-secondary italic leading-tight">
                Haz clic en + para editar manualmente o usa el destello para que la IA proponga una palabra.
            </footer>
        </div>
    );
};

export default SuggestionsWorkbench;
