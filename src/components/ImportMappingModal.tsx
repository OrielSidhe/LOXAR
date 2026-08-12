
import React, { useState, useMemo } from 'react';
import { NewLexiconEntry } from '../types';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface ImportMappingModalProps {
    headers: string[];
    warnings?: string[];
    onConfirm: (mapping: { [key: string]: keyof NewLexiconEntry | 'extra' | '' }) => void;
    onCancel: () => void;
}

const CORE_FIELDS: (keyof NewLexiconEntry)[] = ['Significado', 'Léxema', 'Categoría', 'Raíz', 'externalID'];

const fieldDisplayNames: Record<string, string> = {
    Significado: 'Significado',
    Léxema: 'Léxema',
    Categoría: 'Categoría',
    Raíz: 'Raíz',
    externalID: 'ID Externo (opcional)',
};

const ImportMappingModal = ({ headers, warnings, onConfirm, onCancel }: ImportMappingModalProps) => {
    const [mapping, setMapping] = useState<{ [key: string]: keyof NewLexiconEntry | 'extra' | '' }>({});
    const [showWarnings, setShowWarnings] = useState(true);

    // Pre-populate mapping based on common header names
    useMemo(() => {
        const initialMapping: { [key: string]: keyof NewLexiconEntry | 'extra' | '' } = {};
        const usedFields = new Set<string>();

        const mapHeader = (header: string, field: keyof NewLexiconEntry) => {
            if (!usedFields.has(field)) {
                initialMapping[header] = field;
                usedFields.add(field);
                return true;
            }
            return false;
        };

        headers.forEach(header => {
            const lowerHeader = header.toLowerCase().replace(/[\s_-]/g, '');
            if (['significado', 'meaning', 'native', 'translation'].includes(lowerHeader)) {
                if(mapHeader(header, 'Significado')) return;
            }
            if (['léxema', 'lexema', 'word', 'conlang', 'headword'].includes(lowerHeader)) {
                if(mapHeader(header, 'Léxema')) return;
            }
            if (['categoría', 'category', 'type', 'pos', 'partofspeech'].includes(lowerHeader)) {
                if(mapHeader(header, 'Categoría')) return;
            }
            if (['raíz', 'raiz', 'root'].includes(lowerHeader)) {
                if(mapHeader(header, 'Raíz')) return;
            }
            if (['id', 'extid', 'externalid'].includes(lowerHeader)) {
                if(mapHeader(header, 'externalID')) return;
            }
            initialMapping[header] = 'extra';
        });
        setMapping(initialMapping);
    }, [headers]);

    const handleSelectChange = (header: string, value: keyof NewLexiconEntry | 'extra' | '') => {
        setMapping(prev => ({ ...prev, [header]: value }));
    };

    const handleSubmit = () => {
        const isSignificadoMapped = Object.values(mapping).some(v => v === 'Significado');
        if (!isSignificadoMapped) {
            alert("Debes mapear al menos una columna a 'Significado'.");
            return;
        }
        onConfirm(mapping);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-subtle">
                <header className="p-4 border-b border-subtle">
                    <h2 className="text-2xl font-bold text-text-primary">Mapea las Columnas de tus Datos</h2>
                    <p className="text-sm text-text-secondary mt-1">
                        La app usa las columnas: <strong>Significado</strong> (tu idioma principal), <strong>Léxema</strong> (tu conlang), <strong>Categoría</strong> y <strong>Raíz</strong>.
                        <br/>
                        Asigna las columnas de tu archivo a estos campos. Las columnas no asignadas se guardarán como 'Datos Extra'.
                    </p>
                </header>
                <main className="p-6 flex-grow overflow-y-auto">
                    {showWarnings && warnings && warnings.length > 0 && (
                        <div className="bg-warning/20 border border-warning text-warning-content p-4 rounded-lg mb-6">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <AlertTriangleIcon className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-lg text-warning">Advertencias de Análisis</h3>
                                        <p className="text-sm text-amber-300 mb-2">El importador solucionó algunos problemas en tu archivo automáticamente:</p>
                                        <ul className="list-disc list-inside text-sm text-amber-200 max-h-32 overflow-y-auto">
                                            {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <button onClick={() => setShowWarnings(false)} className="text-warning/80 hover:text-warning" title="Descartar advertencias">
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        {headers.map(header => (
                            <div key={header} className="grid grid-cols-2 items-center gap-4">
                                <span className="font-semibold text-text-primary truncate" title={header}>{header}</span>
                                <select
                                    value={mapping[header] || ''}
                                    onChange={e => handleSelectChange(header, e.target.value as any)}
                                    className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    <option value="extra">Guardar como Dato Extra</option>
                                    <option value="" disabled>--- Campos Principales ---</option>
                                    {CORE_FIELDS.map(field => (
                                        <option key={field} value={field} className="capitalize">{fieldDisplayNames[field] || field}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </main>
                <footer className="p-4 flex justify-end gap-4 border-t border-subtle">
                    <button onClick={onCancel} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">
                        Confirmar Mapeo
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ImportMappingModal;
