import { useState, memo } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';

interface CreateLexiconModalProps {
    onClose: () => void;
    onCreate: (name: string, language: string) => void;
}

const CreateLexiconModal = ({ onClose, onCreate }: CreateLexiconModalProps) => {
    const [name, setName] = useState('');
    const [language, setLanguage] = useState('Español');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('El nombre del léxico es obligatorio.');
            return;
        }

        if (!language.trim()) {
            setError('El idioma principal es obligatorio.');
            return;
        }

        onCreate(name.trim(), language.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="create-lexicon-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle">
                    <div className="flex items-center gap-3">
                        <PlusIcon className="h-6 w-6 text-accent" />
                        <h2 id="create-lexicon-title" className="text-xl font-bold text-text-primary font-display">Crear Nuevo Léxico</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="lexicon-name" className="block text-sm font-medium text-text-secondary mb-2">
                            Nombre del Léxico
                        </label>
                        <input
                            type="text"
                            id="lexicon-name"
                            name="lexiconName"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="Ej: Mi Conlang"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="main-language" className="block text-sm font-medium text-text-secondary mb-2">
                            Idioma Principal
                        </label>
                        <input
                            type="text"
                            id="main-language"
                            name="mainLanguage"
                            value={language}
                            onChange={(e) => {
                                setLanguage(e.target.value);
                                setError('');
                            }}
                            className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="Ej: Español"
                        />
                    </div>

                    {error && (
                        <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-md p-3">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Crear Léxico
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default memo(CreateLexiconModal);
