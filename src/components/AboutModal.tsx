import { memo } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import AppLogoIcon from './icons/AppLogoIcon';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: string;
    appName: string;
    appDescription: string;
}

const AboutModal = ({ isOpen, onClose, version, appName, appDescription }: AboutModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-end items-center border-b border-subtle flex-shrink-0">
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="p-8 pt-4 flex-grow overflow-y-auto space-y-6 flex flex-col items-center text-center">
                    <AppLogoIcon className="w-20 h-20 text-accent" />
                    <div className="space-y-2">
                        <h2 id="about-title" className="text-3xl font-bold text-text-primary font-display">{appName}</h2>
                        <p className="text-accent font-semibold">Versión {version}</p>
                    </div>
                    <p className="text-text-secondary">{appDescription}</p>
                    <div className="text-sm text-text-secondary pt-4 space-y-2">
                        <p className="font-semibold text-text-primary">Creado por</p>
                        <p className="text-accent font-bold">Victor Sidhe</p>
                        <p className="text-xs text-subtle mt-4">Desarrollado con React, Electron, y Google Gemini AI</p>
                    </div>
                </main>
                <footer className="p-4 flex justify-between gap-4 border-t border-subtle flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-subtle text-text-primary rounded-md hover:bg-subtle/80 transition-colors">
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default memo(AboutModal);
