import React from 'react';
import { WorkQueueItem } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';
import LightBulbIcon from './icons/LightBulbIcon';

interface WorkQueueBarProps {
    items: WorkQueueItem[];
    cursor: number;
    onPrev: () => void;
    onNext: () => void;
    onTogglePending: (key: string) => void;
    onRemove: () => void;
    onClear: () => void;
}

const WorkQueueBar = ({ items, cursor, onPrev, onNext, onTogglePending, onRemove, onClear }: WorkQueueBarProps) => {
    if (items.length === 0) return null;
    const current = items[Math.min(cursor, items.length - 1)];
    const safeCursor = Math.min(cursor, items.length - 1);
    const pendingCount = items.filter(i => i.pending).length;

    return (
        <div className="bg-surface border border-subtle rounded-lg shadow-lg p-2.5 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-accent">
                    <LightBulbIcon className="h-4 w-4" />
                    Cola de trabajo
                </div>
                <span className="text-[11px] font-mono font-bold text-text-secondary">
                    {safeCursor + 1}/{items.length}
                    {pendingCount > 0 && <span className="ml-1 text-warning">· {pendingCount} pendiente(s)</span>}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={onPrev} disabled={items.length <= 1} className="p-1.5 rounded hover:bg-subtle disabled:opacity-30" title="Anterior">
                    <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0 text-center">
                    <p className="text-sm font-bold text-text-primary truncate">{current?.Significado || '—'}</p>
                    <p className="text-[10px] text-text-secondary italic truncate">
                        {current?.Categoría || 'sin categoría'}
                        {current?.Raíz ? ` · ${current.Raíz}` : ''}
                        {current?.pending ? ' · PENDIENTE' : ''}
                    </p>
                </div>
                <button onClick={onNext} disabled={items.length <= 1} className="p-1.5 rounded hover:bg-subtle disabled:opacity-30" title="Siguiente">
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => { if (current) onTogglePending(current.key); onNext(); }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-all ${current?.pending ? 'bg-warning/20 border-warning text-warning' : 'bg-background border-subtle text-text-secondary hover:border-warning/50'}`}
                    title="Dejar pendiente y pasar a la siguiente"
                >
                    <CheckCircleIcon className="h-3.5 w-3.5 inline mr-1" /> Pendiente
                </button>
                <button
                    onClick={onRemove}
                    className="p-1.5 rounded bg-background border border-subtle text-text-secondary hover:border-danger hover:text-danger transition-all"
                    title="Quitar esta palabra de la cola"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={onClear}
                    className="p-1.5 rounded bg-background border border-subtle text-text-secondary hover:border-danger hover:text-danger transition-all"
                    title="Vaciar la cola"
                >
                    <XCircleIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
};

export default WorkQueueBar;
