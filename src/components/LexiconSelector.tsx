
import React, { useState, useEffect } from 'react';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import Tooltip from './Tooltip';

interface LexiconSelectorProps {
    lexiconNames: string[];
    activeLexiconName: string | null;
    onSelect: (name: string) => void;
    onCreate: (name: string) => void;
    onDelete: (name: string) => void;
    onRename: (oldName: string, newName: string) => void;
}

const LexiconSelector = ({ lexiconNames, activeLexiconName, onSelect, onCreate, onDelete, onRename }: LexiconSelectorProps) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [nameInput, setNameInput] = useState('');

    useEffect(() => {
        if (!isRenaming && activeLexiconName) {
            setNameInput(activeLexiconName);
        }
    }, [activeLexiconName, isRenaming]);

    const handleStartCreating = () => {
        setIsCreating(true);
        setNameInput('');
    };

    const handleCancelCreating = () => {
        setIsCreating(false);
        setNameInput('');
    };

    const handleConfirmCreate = () => {
        if (nameInput.trim()) {
            onCreate(nameInput.trim());
        }
        handleCancelCreating();
    };

    const handleDeleteClick = () => {
        if (activeLexiconName) {
            onDelete(activeLexiconName);
        }
    };

    const handleStartRenaming = () => {
        if (activeLexiconName) {
            setIsRenaming(true);
            setNameInput(activeLexiconName);
        }
    };

    const handleCancelRenaming = () => {
        setIsRenaming(false);
        if (activeLexiconName) {
            setNameInput(activeLexiconName);
        }
    };

    const handleConfirmRename = () => {
        if (activeLexiconName && nameInput && nameInput.trim() !== '' && nameInput.trim() !== activeLexiconName) {
            onRename(activeLexiconName, nameInput.trim());
        }
        setIsRenaming(false);
    };

    const renderContent = () => {
        if (isCreating) {
            return (
                 <>
                    <input
                        id="new-lexicon-name"
                        name="newLexiconName"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmCreate();
                            if (e.key === 'Escape') handleCancelCreating();
                        }}
                        placeholder="Nombre del nuevo léxico..."
                        autoFocus
                        className="w-full sm:w-auto flex-grow bg-background border border-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleConfirmCreate} className="p-2 bg-success text-white rounded-md hover:bg-green-400" title="Guardar"><SaveIcon className="h-5 w-5" /></button>
                        <button onClick={handleCancelCreating} className="p-2 bg-subtle text-white rounded-md hover:bg-gray-600" title="Cancelar"><CancelIcon className="h-5 w-5" /></button>
                    </div>
                </>
            );
        }

        if (isRenaming && activeLexiconName) {
             return (
                 <>
                    <input
                        id="rename-lexicon-name"
                        name="renameLexiconName"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRenaming();
                        }}
                        autoFocus
                        className="w-full sm:w-auto flex-grow bg-background border border-accent rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleConfirmRename} className="p-2 bg-success text-white rounded-md hover:bg-green-400" title="Guardar"><SaveIcon className="h-5 w-5" /></button>
                        <button onClick={handleCancelRenaming} className="p-2 bg-subtle text-white rounded-md hover:bg-gray-600" title="Cancelar"><CancelIcon className="h-5 w-5" /></button>
                    </div>
                </>
             );
        }

        return (
            <>
                <select
                    id="lexicon-selector"
                    name="lexiconSelector"
                    value={activeLexiconName ?? ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full sm:w-auto flex-grow bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    {lexiconNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2">
                     <Tooltip text="Renombrar el léxico activo actual.">
                        <button
                            onClick={handleStartRenaming}
                            disabled={!activeLexiconName}
                            className="p-2 bg-background text-text-secondary font-semibold rounded-md shadow-sm hover:bg-subtle border border-subtle focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Renombrar léxico activo"
                        >
                            <EditIcon className="h-5 w-5" />
                        </button>
                    </Tooltip>
                     <Tooltip text="Crear un nuevo léxico vacío.">
                        <button
                            onClick={handleStartCreating}
                            className="p-2 bg-background text-text-secondary font-semibold rounded-md shadow-sm hover:bg-subtle border border-subtle focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                            aria-label="Crear nuevo léxico"
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </Tooltip>
                     <Tooltip text="Eliminar permanentemente el léxico activo. No se puede eliminar si es el único léxico que existe.">
                        <button
                            onClick={handleDeleteClick}
                            disabled={!activeLexiconName || lexiconNames.length <= 1}
                            className="p-2 bg-danger text-white font-semibold rounded-md shadow-sm hover:bg-danger-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-hover transition-colors disabled:bg-gray-600/50 disabled:border-gray-600 disabled:cursor-not-allowed"
                            aria-label="Eliminar léxico activo"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </Tooltip>
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center flex-grow">
            <label htmlFor="lexicon-selector" className="text-lg font-semibold text-text-primary whitespace-nowrap">
                Léxico Activo
            </label>
            <div className="flex-grow flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default LexiconSelector;
