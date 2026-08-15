import React, { useState, useEffect, useMemo } from 'react';
import { LexiconEntry, NewLexiconEntry, InflectionProfile } from '../types';
import { generateInflections, filterParadigmsForFunction } from '../utils/inflectionUtils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import GitMergeIcon from './icons/GitMergeIcon';
import EditIcon from './icons/EditIcon';
import SparkleIcon from './icons/SparkleIcon';
import PlusIcon from './icons/PlusIcon';

export interface ParadigmCellProps {
    rowEntry: LexiconEntry;
    colCategory: string;
    lexicon: LexiconEntry[];
    inflection: InflectionProfile | undefined;
    onAddEntry: (entry: NewLexiconEntry) => void;
    localValue?: string;
    onUpdateLocalValue: (val: string) => void;
}

const ParadigmCell = ({
    rowEntry,
    colCategory,
    lexicon,
    inflection,
    onAddEntry,
    localValue = '',
    onUpdateLocalValue
}: ParadigmCellProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(localValue);

    useEffect(() => {
        setTempValue(localValue);
    }, [localValue]);

    const match = useMemo(() => {
        const targetMeaning = rowEntry.Significado[0]?.toLowerCase().trim();
        if (!targetMeaning) return null;

        return lexicon.find(e =>
            e.Categoría.toLowerCase() === colCategory.toLowerCase() &&
            e.Significado.some(s => s.toLowerCase().trim() === targetMeaning)
        );
    }, [rowEntry, colCategory, lexicon]);

    const suggestion = useMemo(() => {
        if (match || localValue || !inflection) return null;

        const relevantParadigms = filterParadigmsForFunction(inflection.paradigms, rowEntry.Categoría);

        for (const p of relevantParadigms) {
            const forms = generateInflections(rowEntry, p, inflection);
            const found = forms.find(f => f.name.toLowerCase() === colCategory.toLowerCase());
            if (found) return found.result;
        }
        return null;
    }, [match, localValue, inflection, rowEntry, colCategory]);

    const handlePushToLexicon = () => {
        const valToPush = localValue || suggestion || '';
        if (!valToPush) return;
        onAddEntry({
            Raíz: rowEntry.Raíz,
            Léxema: [valToPush],
            Categoría: colCategory,
            Significado: rowEntry.Significado,
            extraData: {
                paradigmBaseId: rowEntry.ID,
                sourceCollection: 'Colecciones Table'
            }
        });
    };

    const handleSaveLocal = () => {
        onUpdateLocalValue(tempValue.trim());
        setIsEditing(false);
    };

    // Si ya existe en el léxico principal
    if (match) {
        return (
            <div className="flex items-center gap-1.5 bg-success/10 border border-success/30 px-2.5 py-1 rounded-md text-success text-xs font-semibold shadow-[0_2px_8px_rgba(16,185,129,0.03)]" title="Esta palabra está guardada y sincronizada en tu Léxico Principal">
                <CheckCircleIcon className="w-3 h-3 text-success shrink-0" />
                <span className="truncate max-w-[120px]">{match.Léxema.join(', ')}</span>
            </div>
        );
    }

    // Modo de edición para valor local
    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    id={`edit-cell-${rowEntry.ID}-${colCategory}`}
                    name={`editCell-${rowEntry.ID}-${colCategory}`}
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLocal();
                        if (e.key === 'Escape') { setIsEditing(false); setTempValue(localValue); }
                    }}
                    placeholder="ej: boskel"
                    className="bg-background-dark border border-accent/40 rounded px-2 py-0.5 text-xs text-white outline-none w-28 focus:border-accent"
                    autoFocus
                />
                <button onClick={handleSaveLocal} className="text-success hover:bg-success/10 p-0.5 rounded"><SaveIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setIsEditing(false); setTempValue(localValue); }} className="text-text-secondary hover:bg-white/5 p-0.5 rounded"><CancelIcon className="w-3.5 h-3.5" /></button>
            </div>
        );
    }

    // Si tiene un valor local guardado en la colección (pero no en el léxico)
    if (localValue) {
        return (
            <div className="flex items-center gap-1.5 justify-between bg-warning/10 border border-warning/30 px-2.5 py-1 rounded-md text-amber-300 text-xs w-full shadow-[0_2px_8px_rgba(245,158,11,0.03)] group">
                <span className="font-bold truncate max-w-[80px]" title={`Local de la Colección: ${localValue}`}>{localValue}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handlePushToLexicon}
                        className="p-1 hover:bg-warning/20 hover:text-amber-200 rounded text-warning"
                        title="Subir / Guardar en el Léxico Principal"
                    >
                        <GitMergeIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-white/5 hover:text-white rounded text-text-secondary"
                        title="Editar"
                    >
                        <EditIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // Si hay una sugerencia por paradigma
    if (suggestion) {
        return (
            <div className="flex items-center gap-1.5 w-full justify-between">
                <button
                    onClick={() => {
                        onUpdateLocalValue(suggestion);
                    }}
                    className="text-xs text-accent hover:text-white hover:bg-accent/20 px-2 py-1 rounded border border-dashed border-accent/40 hover:border-accent transition-all flex items-center gap-1 group animate-pulse"
                    title={`Generado automáticamente por paradigma. Haz clic para guardar localmente en la Colección.`}
                >
                    <SparkleIcon className="w-3 h-3 text-accent group-hover:text-white" />
                    <span className="font-bold">{suggestion}</span>
                </button>
                <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-text-secondary hover:text-primary p-1 border border-border-dark border-dashed rounded"
                    title="Escribir otro valor"
                >
                    <PlusIcon className="w-3 h-3" />
                </button>
            </div>
        );
    }

    // Celda vacía
    return (
        <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-text-secondary hover:text-primary hover:bg-white/5 px-2 py-1 rounded border border-dashed border-border-dark hover:border-primary transition-all flex items-center gap-1"
        >
            <PlusIcon className="w-3 h-3" /> Crear
        </button>
    );
};

ParadigmCell.displayName = 'ParadigmCell';

export default ParadigmCell;
