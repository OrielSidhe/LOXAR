
import React, { useState, useEffect } from 'react';
import WrenchIcon from './icons/WrenchIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ImportSanitizationModalProps {
    errorContent: string;
    errorMessage: string;
    hasValidEntries: boolean;
    onCancel: () => void;
    onProceedWithValid: () => void;
    onValidate: (updatedContent: string) => Promise<{ success: boolean; error?: string }>;
}

const ImportSanitizationModal = ({ errorContent, errorMessage, hasValidEntries, onCancel, onProceedWithValid, onValidate }: ImportSanitizationModalProps) => {
    const [content, setContent] = useState(errorContent);
    const [validationState, setValidationState] = useState<{ status: 'idle' | 'loading' | 'error'; message?: string }>({ status: 'idle' });

    useEffect(() => {
        setContent(errorContent);
    }, [errorContent]);

    useEffect(() => {
        setValidationState({ status: 'error', message: errorMessage });
    }, [errorMessage]);

    const handleValidateClick = async () => {
        setValidationState({ status: 'loading' });
        const result = await onValidate(content);
        if (!result.success) {
            setValidationState({ status: 'error', message: result.error });
        }
        // On success, the modal will close automatically because the parent state changes.
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle">
                     <div className="flex items-center gap-3">
                         <WrenchIcon className="h-7 w-7 text-accent" />
                        <h2 className="text-2xl font-bold text-text-primary">Corregir Errores de Importación</h2>
                    </div>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-4">
                    {validationState.status === 'error' && (
                         <div className="bg-danger/20 border border-danger text-red-300 p-4 rounded-lg flex gap-3">
                            <AlertTriangleIcon className="h-6 w-6 text-danger flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold">Error de Análisis</h3>
                                <p className="text-sm">{validationState.message}</p>
                            </div>
                        </div>
                    )}
                    <p className="text-text-secondary">
                        El contenido a continuación no pudo ser importado debido a errores de formato. Puedes corregir el contenido en el área de texto e intentarlo de nuevo, o importar solo las entradas que se leyeron correctamente.
                    </p>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 bg-background border border-subtle rounded-md shadow-sm p-3 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="El contenido del archivo con errores aparecerá aquí..."
                    />
                </main>
                <footer className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-subtle">
                    <button onClick={onCancel} className="px-4 py-2 w-full sm:w-auto bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors">
                        Cancelar Importación
                    </button>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                            onClick={onProceedWithValid}
                            disabled={!hasValidEntries}
                            className="px-6 py-2 w-full sm:w-auto bg-blue-700 text-white font-semibold rounded-md shadow-lg hover:bg-blue-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Importar Solo Entradas Válidas
                        </button>
                        <button
                            onClick={handleValidateClick}
                            disabled={validationState.status === 'loading'}
                            className="px-6 py-2 w-full sm:w-auto bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors disabled:bg-gray-500"
                        >
                            {validationState.status === 'loading' ? 'Validando...' : 'Validar y Continuar'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ImportSanitizationModal;
