import React from 'react';
import { GenerativeProfile, LexiconEntry } from '../types';
import DnaIcon from './icons/DnaIcon';
import XCircleIcon from './icons/XCircleIcon';
import GenerativeProfileEditor from './GenerativeProfileEditor';

interface GenerativeProfileModalProps {
    profile: GenerativeProfile;
    lexicon: LexiconEntry[];
    onSave: (profile: GenerativeProfile) => void;
    onClose: () => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
}

const GenerativeProfileModal = ({ profile, lexicon, onSave, onClose, showNotification }: GenerativeProfileModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <DnaIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Perfil Generativo del Lenguaje</h2>
                            <p className="text-sm text-text-secondary">Define las reglas fonológicas y gramaticales para guiar a la IA.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="flex-grow overflow-hidden min-h-0">
                    <GenerativeProfileEditor
                        profile={profile}
                        lexicon={lexicon}
                        showNotification={showNotification}
                        onSave={onSave}
                        onCancel={onClose}
                    />
                </main>
            </div>
        </div>
    );
};

export default GenerativeProfileModal;
