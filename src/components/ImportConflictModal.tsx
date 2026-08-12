
import React from 'react';
import { Conflict } from '../hooks/useLexicon';

interface ImportConflictModalProps {
    conflict: Conflict;
    onResolve: (resolution: 'keep' | 'replace') => void;
    onCancel: () => void;
}

const ConflictField = ({ label, existing, incoming }: { label: string, existing: string, incoming: string }) => {
    const isDifferent = existing !== incoming;
    return (
        <div>
            <h4 className="text-sm font-semibold text-text-secondary capitalize">{label}</h4>
            <p className={`p-2 rounded-md ${isDifferent ? 'bg-warning/20 text-warning' : 'bg-background text-text-primary'}`}>
                {incoming}
            </p>
        </div>
    );
}


const ImportConflictModal = ({ conflict, onResolve, onCancel }: ImportConflictModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-subtle">
                <header className="p-4 border-b border-subtle">
                    <h2 className="text-2xl font-bold text-text-primary">Resolver Conflicto de Importación</h2>
                    <p className="text-sm text-text-secondary mt-1">Una entrada importada coincide con una existente pero tiene datos diferentes. Elige qué versión conservar.</p>
                </header>
                <main className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Existing Entry */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-accent border-b-2 border-accent pb-1">Entrada Existente (en el Léxico)</h3>
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary">Significado</h4>
                            <p className="p-2 bg-background rounded-md">{conflict.existing.Significado.join(', ')}</p>
                        </div>
                         <div>
                            <h4 className="text-sm font-semibold text-text-secondary">Categoría</h4>
                            <p className="p-2 bg-background rounded-md">{conflict.existing.Categoría}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary">Raíz</h4>
                            <p className="p-2 bg-background rounded-md">{conflict.existing.Raíz}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-text-secondary">Léxema</h4>
                            <p className="p-2 bg-background rounded-md">{conflict.existing.Léxema.join(', ')}</p>
                        </div>
                    </div>

                    {/* Incoming Entry */}
                     <div className="space-y-3">
                        <h3 className="text-lg font-bold text-warning border-b-2 border-warning pb-1">Entrada Nueva (del Archivo)</h3>
                        <ConflictField label="Significado" existing={conflict.existing.Significado.join(', ')} incoming={conflict.incoming.Significado.join(', ')} />
                        <ConflictField label="Categoría" existing={conflict.existing.Categoría} incoming={conflict.incoming.Categoría} />
                        <ConflictField label="Raíz" existing={conflict.existing.Raíz} incoming={conflict.incoming.Raíz} />
                        <ConflictField label="Léxema" existing={conflict.existing.Léxema.join(', ')} incoming={conflict.incoming.Léxema.join(', ')} />
                    </div>
                </main>
                <footer className="p-4 flex justify-between items-center border-t border-subtle">
                    <button onClick={onCancel} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors">
                        Cancelar Importación
                    </button>
                    <div className="flex gap-4">
                        <button onClick={() => onResolve('keep')} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">
                            Conservar Existente
                        </button>
                         <button onClick={() => onResolve('replace')} className="px-6 py-2 bg-warning text-black font-semibold rounded-md shadow-lg hover:bg-amber-400 transition-colors">
                            Usar Importada
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ImportConflictModal;
