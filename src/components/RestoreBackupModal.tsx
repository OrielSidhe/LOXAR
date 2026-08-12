

import React, { useState, useMemo } from 'react';
import RestoreIcon from './icons/RestoreIcon';
import XCircleIcon from './icons/XCircleIcon';

interface RestoreBackupModalProps {
    backups: string[];
    onRestore: (fileName: string) => void;
    onClose: () => void;
}

const RestoreBackupModal = ({ backups, onRestore, onClose }: RestoreBackupModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBackups = useMemo(() => {
        if (!searchTerm) return backups;
        return backups.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [backups, searchTerm]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <RestoreIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Restaurar Copia de Seguridad</h2>
                            <p className="text-sm text-text-secondary">Selecciona una copia para reemplazar el léxico actual.</p>
                        </div>
                    </div>
                     <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <div className="p-4 flex-shrink-0">
                    <input
                        id="backup-search"
                        name="backupSearch"
                        type="text"
                        placeholder="Buscar por fecha o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <main className="px-6 pb-6 flex-grow overflow-y-auto">
                    <div className="border border-subtle rounded-md">
                        {filteredBackups.length > 0 ? (
                            <ul className="divide-y divide-subtle">
                                {filteredBackups.map(backupFile => (
                                    <li key={backupFile} className="flex items-center justify-between p-3 hover:bg-subtle/50">
                                        <span className="text-text-primary font-mono text-sm">{backupFile}</span>
                                        <button
                                            onClick={() => onRestore(backupFile)}
                                            className="px-3 py-1 bg-accent text-white text-sm font-semibold rounded-md hover:bg-accent-hover"
                                        >
                                            Restaurar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center p-8 text-text-secondary">
                                {searchTerm ? 'No se encontraron copias de seguridad.' : 'No hay copias de seguridad disponibles en la carpeta de exportación.'}
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default RestoreBackupModal;
