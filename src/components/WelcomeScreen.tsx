import { useRef, ChangeEvent } from 'react';
import AppLogoIcon from './icons/AppLogoIcon';
import PlusIcon from './icons/PlusIcon';
import UploadIcon from './icons/UploadIcon';
import InfoIcon from './icons/InfoIcon';

interface WelcomeScreenProps {
    onCreateLexicon: () => void;
    onContinue: () => void;
    onImport: (content: string) => void;
    onStartTour: () => void;
}

const WelcomeScreen = ({ onCreateLexicon, onContinue, onImport, onStartTour }: WelcomeScreenProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const tryRead = (encoding: string, onFallback?: () => void) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    if (!text) return;
                    if (text.includes('\uFFFD') && onFallback) {
                        onFallback();
                    } else {
                        onImport(text);
                    }
                };
                reader.readAsText(file, encoding);
            };
            tryRead('UTF-8', () => tryRead('windows-1252'));
        }
        event.target.value = "";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-md"></div>

            <div className="relative z-10 text-center max-w-3xl bg-surface-dark/50 p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
                <AppLogoIcon className="w-24 h-24 text-primary mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-primary font-display mb-4 tracking-wider drop-shadow-sm">LOXAR</h1>
                <p className="text-lg text-text-secondary mb-10 leading-relaxed font-light tracking-wide">
                    Tu sistema avanzado para la construcción de léxicos artificiales.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <button
                        onClick={onCreateLexicon}
                        className="col-span-1 sm:col-span-2 flex items-center justify-center gap-3 px-6 py-4 bg-primary text-background-dark font-bold text-lg rounded-xl shadow-glow hover:bg-primary-dark transition-all transform hover:scale-[1.02]"
                    >
                        <PlusIcon className="h-6 w-6" />
                        Crear Nuevo Léxico
                    </button>

                    <input
                        id="welcome-import-file"
                        name="welcomeImportFile"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv,.txt,.json"
                        className="hidden"
                    />

                    <button
                        onClick={handleImportClick}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-surface-light/40 text-white font-semibold text-base rounded-xl border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm group"
                    >
                        <UploadIcon className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                        Importar Léxico
                    </button>

                    <button
                        onClick={onStartTour}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-surface-light/40 text-white font-semibold text-base rounded-xl border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm group"
                    >
                        <InfoIcon className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                        Tour Guiado
                    </button>

                    <button
                        onClick={onContinue}
                        className="col-span-1 sm:col-span-2 mt-2 text-text-muted hover:text-white text-sm font-medium transition-colors uppercase tracking-widest"
                    >
                        Continuar al Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
