import { useState, useCallback, useMemo } from 'react';
import type { LexiconEntry, WorkQueueItem, GenerationMode, MissingWord } from '../types';
import { generateRootAndLexeme } from '../services/geminiService';

export function useWorkQueue(options: {
    getLexiconSample: (count: number) => LexiconEntry[];
    activeInflectionProfile: any;
    activeLexicon: LexiconEntry[];
    generativeProfile: any;
    showNotification: (message: string, type: 'success' | 'error') => void;
    setActiveTab: (tab: any) => void;
    setAiStatus: (status: 'idle' | 'working' | 'complete' | 'error') => void;
}) {
    const { getLexiconSample, activeLexicon, generativeProfile, showNotification, setActiveTab, setAiStatus } = options;

    const [workQueue, setWorkQueue] = useState<WorkQueueItem[]>([]);
    const [queueCursor, setQueueCursor] = useState(0);

    const queueActive = workQueue.length > 0;
    const currentQueueItem = queueActive ? workQueue[Math.min(queueCursor, workQueue.length - 1)] : null;

    const enqueueItems = useCallback((items: { Significado: string; Categoría: string; Raíz?: string; Léxema?: string[] }[]) => {
        if (items.length === 0) return;
        setWorkQueue(prev => {
            const wasEmpty = prev.length === 0;
            const newItems: WorkQueueItem[] = items.map(it => ({
                key: `wq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                ...it,
            }));
            if (wasEmpty) setQueueCursor(0);
            return [...prev, ...newItems];
        });
    }, []);

    const queueAdvance = useCallback(() => {
        setQueueCursor(prev => Math.min(prev + 1, Math.max(0, workQueue.length - 1)));
    }, [workQueue.length]);

    const queuePrev = useCallback(() => setQueueCursor(prev => Math.max(0, prev - 1)), []);

    const queueTogglePending = useCallback((key: string) => {
        setWorkQueue(prev => prev.map(it => it.key === key ? { ...it, pending: !it.pending } : it));
    }, []);

    const queueRemoveCurrent = useCallback(() => {
        setWorkQueue(prev => {
            const idx = Math.min(queueCursor, prev.length - 1);
            const next = prev.filter((_, i) => i !== idx);
            setQueueCursor(c => Math.min(c, Math.max(0, next.length - 1)));
            return next;
        });
    }, [queueCursor]);

    const queueClear = useCallback(() => {
        setWorkQueue([]);
        setQueueCursor(0);
    }, []);

    const handleEnqueue = useCallback((items: MissingWord[]) => {
        enqueueItems(items.map(it => ({ Significado: it.Significado, Categoría: it.Categoría || 'desconocida' })));
        setActiveTab('workbench');
    }, [enqueueItems, setActiveTab]);

    const handleGenerateBatch = useCallback(async (items: MissingWord[], modes: GenerationMode[]) => {
        if (items.length === 0) return;
        setAiStatus('working');
        try {
            const sample = getLexiconSample(30);
            const CHUNK = 10;
            const results: { Significado: string; Categoría: string; Raíz?: string; Léxema?: string[] }[] = [];
            for (let i = 0; i < items.length; i += CHUNK) {
                const chunk = items.slice(i, i + CHUNK);
                const chunkRes = await Promise.all(chunk.map(async (w) => {
                    const cat = w.Categoría || 'desconocida';
                    try {
                        const r = await generateRootAndLexeme(w.Significado, cat, sample, generativeProfile, modes, activeLexicon);
                        return { Significado: w.Significado, Categoría: cat, Raíz: r?.raiz || '', Léxema: r?.lexema ? [r.lexema] : [] };
                    } catch {
                        return { Significado: w.Significado, Categoría: cat, Raíz: '', Léxema: [] as string[] };
                    }
                }));
                results.push(...chunkRes);
            }
            setAiStatus('complete');
            enqueueItems(results);
            showNotification(`Lote generado: ${results.length} palabra(s) en la cola de trabajo.`, 'success');
            setActiveTab('workbench');
        } catch (e) {
            setAiStatus('error');
            showNotification('Error generando el lote.', 'error');
        }
    }, [getLexiconSample, generativeProfile, activeLexicon, enqueueItems, showNotification, setActiveTab, setAiStatus]);

    const queueInitialData = useMemo(() => {
        if (!currentQueueItem) return null;
        return {
            Significado: [currentQueueItem.Significado],
            Categoría: currentQueueItem.Categoría,
            Raíz: currentQueueItem.Raíz || '',
            Léxema: currentQueueItem.Léxema && currentQueueItem.Léxema.length ? currentQueueItem.Léxema : [],
        };
    }, [currentQueueItem]);

    return {
        workQueue,
        queueCursor,
        queueActive,
        currentQueueItem,
        enqueueItems,
        queueAdvance,
        queuePrev,
        queueTogglePending,
        queueRemoveCurrent,
        queueClear,
        handleEnqueue,
        handleGenerateBatch,
        queueInitialData,
        setWorkQueue,
        setQueueCursor,
    };
}
