import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

export interface Collection {
    id: string;
    name: string;
    entryIds: string[];
    columns?: { id: string; name: string; categoryLink: string }[];
    drafts?: string[];
    description?: string;
    customCells?: Record<string, Record<string, string>>;
}

export interface CollectionsDraftsReviewProps {
    show: boolean;
    drafts: string[];
    onConfirm: () => void;
    onClose: () => void;
    onDiscardSelection: () => void;
}

const CollectionsDraftsReview: React.FC<CollectionsDraftsReviewProps> = ({
    show,
    drafts,
    onConfirm,
    onClose,
    onDiscardSelection,
}) => {
    if (!show) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border-dark rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-white mb-2">Nuevas Palabras Detectadas</h3>
                <p className="text-text-secondary text-sm mb-4">
                    Has creado {drafts.length} borradores rápidos. ¿Quieres agregarlos al Léxico Principal ahora?
                </p>

                <div className="bg-background-dark rounded border border-border-dark p-3 max-h-40 overflow-y-auto mb-6">
                    {drafts.map((d, i) => (
                        <div key={i} className="text-white font-mono text-sm border-b border-border-dark/50 last:border-0 py-1">{d}</div>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    <button onClick={onConfirm} className="w-full py-3 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors">
                        Sí, agregar y finalizar
                    </button>
                    <button onClick={onDiscardSelection} className="w-full py-2 bg-surface-light hover:bg-surface-light/80 text-text-secondary rounded-lg transition-colors">
                        No, guardar solo selección (descartar borradores)
                    </button>
                    <button onClick={onClose} className="w-full py-2 text-text-secondary hover:text-white transition-colors text-xs">
                        Cancelar (Volver a editar)
                    </button>
                </div>
            </div>
        </div>
    );
};

CollectionsDraftsReview.displayName = 'CollectionsDraftsReview';

export default CollectionsDraftsReview;
