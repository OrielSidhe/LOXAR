// FIX: Imported React to resolve namespace errors for React.ChangeEvent and React.FormEvent.
import React, { useState, useEffect, memo } from 'react';
import { LexiconEntry, LexiconMetadata } from '../types';
import XCircleIcon from './icons/XCircleIcon';
import EditIcon from './icons/EditIcon';
import { inferRootFromLexeme } from '../services/parser';

interface EditEntryModalProps {
    entry: LexiconEntry;
    onClose: () => void;
    onSave: (id: string, updatedEntry: LexiconEntry) => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
    customFunctions: string[];
    activeMetadata: LexiconMetadata | null;
}

const EditEntryModal = ({ entry, onClose, onSave, showNotification, customFunctions, activeMetadata }: EditEntryModalProps) => {
    const [formData, setFormData] = useState({
        Raíz: entry.Raíz || '',
        Léxema: entry.Léxema.join(', ') || '',
        Categoría: entry.Categoría || '',
        Significado: entry.Significado.join(', ') || '',
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData({
            Raíz: entry.Raíz || '',
            Léxema: entry.Léxema.join(', ') || '',
            Categoría: entry.Categoría || '',
            Significado: entry.Significado.join(', ') || '',
        });
    }, [entry]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.Significado.trim() || !formData.Categoría.trim()) {
            setError(`${activeMetadata?.mainLanguage || 'Significado'} y Categoría son obligatorios.`);
            return;
        }

        const lexemas = formData.Léxema.split(',').map(s => s.trim()).filter(Boolean);
        let raiz = formData.Raíz.trim() || (lexemas.length > 0 ? inferRootFromLexeme(lexemas[0]) : '');

        const updatedEntry: LexiconEntry = {
            ...entry,
            Raíz: raiz,
            Léxema: lexemas,
            Categoría: formData.Categoría,
            Significado: formData.Significado.split(',').map(s => s.trim()).filter(Boolean),
        };

        onSave(entry.ID, updatedEntry);
        showNotification(`'${lexemas[0] || formData.Significado}' actualizado.`, 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="edit-entry-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl border border-subtle">
                <form onSubmit={handleSubmit}>
                    <header className="p-4 flex justify-between items-center border-b border-subtle">
                        <div className="flex items-center gap-3">
                            <EditIcon className="h-6 w-6 text-accent" />
                            <h2 id="edit-entry-title" className="text-xl font-bold text-text-primary">Edición Rápida</h2>
                        </div>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                            <XCircleIcon className="h-7 w-7" />
                        </button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="Significado" className="block text-sm font-medium text-text-secondary mb-1 uppercase">{activeMetadata?.mainLanguage || 'Significado'}</label>
                                <input type="text" id="Significado" name="Significado" value={formData.Significado} onChange={handleChange} className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                            </div>
                            <div>
                                <label htmlFor="Categoría" className="block text-sm font-medium text-text-secondary mb-1">Categoría</label>
                                <select id="Categoría" name="Categoría" value={formData.Categoría} onChange={handleChange} className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                                    <option value="">Seleccionar...</option>
                                    {customFunctions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="Raíz" className="block text-sm font-medium text-text-secondary mb-1">Raíz</label>
                                <input type="text" id="Raíz" name="Raíz" value={formData.Raíz} onChange={handleChange} className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                            </div>
                            <div>
                                <label htmlFor="Léxema" className="block text-sm font-medium text-text-secondary mb-1 uppercase">{activeMetadata?.conlangName || 'Léxema'}</label>
                                <input type="text" id="Léxema" name="Léxema" value={formData.Léxema} onChange={handleChange} className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                            </div>
                        </div>
                        {error && <p className="text-danger text-sm">{error}</p>}
                    </main>
                    <footer className="p-4 flex justify-end gap-4 border-t border-subtle">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors" aria-label="Cancelar edición">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors" aria-label="Guardar cambios de la entrada">Guardar Cambios</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default memo(EditEntryModal);