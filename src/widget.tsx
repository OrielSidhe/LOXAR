import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { useDebounce } from './hooks/useDebounce';
import { LexiconEntry, InflectionProfile, LexiconMetadata, InflectionParadigm, InflectionRule } from './types';
import './index.css';
import XCircleIcon from './components/icons/XCircleIcon';
import GitMergeIcon from './components/icons/GitMergeIcon';
import ClipboardIcon from './components/icons/ClipboardIcon';
import ArrowLeftIcon from './components/icons/ArrowLeftIcon';
import PlusIcon from './components/icons/PlusIcon';

import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

declare global {
  interface WidgetAPI {
    send: (channel: string, data?: any) => void;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    readClipboardText: () => Promise<string>;
    lemmatizeAndCheck: (words: string[], lexicon: LexiconEntry[]) => Promise<string[]>;
  }

  interface Window {
    widgetAPI: WidgetAPI;
  }
}

// Polyfill Widget API natively using Tauri v2
if (!window.widgetAPI && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const tauriWidgetAPI: Partial<WidgetAPI> = {
        send: (channel: string, data: any) => {
            if (channel === 'widget:close') {
                getCurrentWebviewWindow().close();
                return;
            }
            emit(channel, data);
        },
        on: (channel: string, callback: (...args: any[]) => void) => {
            let unlistenFn: (() => void) | undefined;
            listen(channel, (event) => { callback(event.payload); }).then(fn => { unlistenFn = fn; });
            return () => { if (unlistenFn) unlistenFn(); };
        },
        readClipboardText: async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (e) {
                console.error("No se pudo leer el portapapeles:", e);
                return "";
            }
        },
        lemmatizeAndCheck: async (words: string[], lexicon: LexiconEntry[]) => {
            // Native frontend replacement for lemmatizeAndCheck using geminiService mechanism
            // Since this is a simple check, we will mock the LLM check to be fast in this layer, 
            // OR ideally call geminiService. For now, we assume words are missing based on exact match 
            // since true lemmatization requires async LLM calls.
            const lexiconMeanings = new Set(lexicon.flatMap(e => e.Significado).map(normalizeText));
            return words.filter(word => !lexiconMeanings.has(normalizeText(word)));
        }
    };
    window.widgetAPI = tauriWidgetAPI as WidgetAPI;
}

// Helper functions for inflection logic
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const filterParadigmsForFunction = (paradigms: InflectionParadigm[], targetFunction: string): InflectionParadigm[] => {
  if (!paradigms) return [];
  const results: InflectionParadigm[] = [];
  for (const paradigm of paradigms) {
    const applies = !paradigm.appliesTo || paradigm.appliesTo.length === 0 || paradigm.appliesTo.includes(targetFunction);
    const filteredSubParadigms = paradigm.paradigms ? filterParadigmsForFunction(paradigm.paradigms, targetFunction) : [];
    if (applies || filteredSubParadigms.length > 0) {
      results.push({ ...paradigm, paradigms: filteredSubParadigms });
    }
  }
  return results;
};

const getParadigmOptions = (paradigms: InflectionParadigm[], prefix = ''): { label: string, value: string }[] => {
  let options: { label: string, value: string }[] = [];
  for (const paradigm of paradigms) {
    const label = prefix ? `${prefix} > ${paradigm.name}` : paradigm.name;
    options.push({ label, value: paradigm.id });
    if (paradigm.paradigms?.length) {
      options = options.concat(getParadigmOptions(paradigm.paradigms, label));
    }
  }
  return options;
};

const findParadigmById = (paradigms: InflectionParadigm[], id: string): InflectionParadigm | null => {
  for (const paradigm of paradigms) {
    if (paradigm.id === id) return paradigm;
    if (paradigm.paradigms) {
      const found = findParadigmById(paradigm.paradigms, id);
      if (found) return found;
    }
  }
  return null;
};

type WidgetView = 'search' | 'inflections' | 'capture';
type LexiconData = { entries: LexiconEntry[], inflectionProfile: InflectionProfile, metadata: LexiconMetadata };

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<LexiconEntry | null | undefined>(undefined);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [view, setView] = useState<WidgetView>('search');
  const [lexiconData, setLexiconData] = useState<LexiconData | null>(null);
  const [missingWords, setMissingWords] = useState<string[]>([]);
  const [selectedParadigmId, setSelectedParadigmId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    if (debouncedSearchTerm) {
      setResult(undefined); // Reset result to show loading state
      window.widgetAPI.send('widget:search', debouncedSearchTerm);
    } else {
      setResult(undefined);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const unsubscribeResult = window.widgetAPI.on('widget:search-result', (foundEntry: LexiconEntry | null) => {
      setResult(foundEntry);
    });
    const unsubscribeData = window.widgetAPI.on('widget:lexicon-data', (data: { entries: LexiconEntry[], inflectionProfile: InflectionProfile, metadata: LexiconMetadata }) => {
      if (data) setLexiconData(data);
    });
    return () => {
      unsubscribeResult();
      unsubscribeData();
    };
  }, []);

  const handleCapture = async () => {
    if (!lexiconData) return;
    setIsLoading(true);
    setLoadingMessage('Leyendo portapapeles...');
    try {
      const text = await window.widgetAPI.readClipboardText();
      const words = text.split(/[\s,.;:!?()"]+/).map((w: string) => w.trim()).filter(Boolean);
      const uniqueWords = Array.from(new Set(words));
      const lexiconMeanings = new Set(lexiconData.entries.flatMap(e => e.Significado).map(normalizeText));

      const initiallyMissing = uniqueWords.filter(word => !lexiconMeanings.has(normalizeText(word as string)));

      if (initiallyMissing.length > 0) {
        setLoadingMessage('Analizando morfología...');
        const trulyMissing = await window.widgetAPI.lemmatizeAndCheck(initiallyMissing, lexiconData.entries);
        setMissingWords(trulyMissing);
      } else {
        setMissingWords([]);
      }

      setView('capture');
    } catch (e) {
      console.error("Failed to process clipboard:", e);
      alert(e instanceof Error ? e.message : "Error desconocido al procesar el texto.");
    }
    finally { setIsLoading(false); setLoadingMessage(''); }
  };

  const handleRequestAdd = (word: string) => {
    window.widgetAPI.send('widget:request-add-word', word);
  };

  const paradigmOptions = useMemo(() => {
    if (!result || !lexiconData) return [];
    return getParadigmOptions(filterParadigmsForFunction(lexiconData.inflectionProfile.paradigms || [], result.Categoría));
  }, [lexiconData, result]);

  const selectedParadigm = useMemo(() => {
    return selectedParadigmId && lexiconData ? findParadigmById(lexiconData.inflectionProfile.paradigms || [], selectedParadigmId) : null;
  }, [lexiconData, selectedParadigmId]);

  const inflectedForms = useMemo(() => {
    if (!result || !selectedParadigm) return [];
    const baseLexeme = (result.Léxema[0] || result.Raíz).replace(/-$/, '');
    const applyRule = (rule: InflectionRule): { name: string, result: string } => {
      let res = baseLexeme;
      if (rule.type === 'simple' && rule.template) {
        res = rule.template.replace(/\{RAÍZ\}|\[RAÍZ\]/g, baseLexeme);
      } else if (rule.type === 'conditional' && rule.conditionValue && rule.actionValue) {
        const conditionMet =
          (rule.conditionType === 'endsWith' && baseLexeme.endsWith(rule.conditionValue)) ||
          (rule.conditionType === 'startsWith' && baseLexeme.startsWith(rule.conditionValue)) ||
          (rule.conditionType === 'contains' && baseLexeme.includes(rule.conditionValue));
        if (conditionMet) {
          if (rule.actionType === 'replaceEnding' && baseLexeme.endsWith(rule.conditionValue)) res = baseLexeme.slice(0, -rule.conditionValue.length) + rule.actionValue;
          else if (rule.actionType === 'addSuffix') res = baseLexeme + rule.actionValue;
          else if (rule.actionType === 'addPrefix') res = rule.actionValue + baseLexeme;
        }
      }
      return { name: rule.name, result: res };
    };
    const getAllRules = (p: InflectionParadigm): { name: string, result: string }[] => [...p.rules.map(applyRule), ...(p.paradigms?.flatMap(getAllRules) || [])];
    return getAllRules(selectedParadigm);
  }, [result, selectedParadigm]);

  const handleBack = () => {
    setView('search');
    setResult(undefined);
    setSearchTerm('');
  }

  return (
    <div className="flex flex-col h-screen bg-surface/80 backdrop-blur-md rounded-xl border border-accent/30 text-text-primary overflow-hidden shadow-2xl" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <header className="flex items-center justify-between px-3 py-2 bg-accent/10 flex-shrink-0 border-b border-accent/10">
        <div className="flex items-center gap-2">
          {view !== 'search' && <button onClick={handleBack} className="p-1 hover:bg-accent/20 rounded-full transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><ArrowLeftIcon className="h-3 w-3" /></button>}
          <h1 className="text-[10px] font-black uppercase tracking-tighter text-accent">{view === 'capture' ? 'Captura' : view === 'inflections' ? 'Flexiones' : 'Diccionario'}</h1>
        </div>
        <button onClick={() => window.widgetAPI.send('widget:close')} className="p-1 text-text-secondary hover:text-danger transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} title="Cerrar Widget">
          <XCircleIcon className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-grow p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar bg-black/10">
        {view === 'search' && <>
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
                 <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full bg-background/50 border border-accent/20 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-white placeholder-text-secondary" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} autoFocus />
            </div>
            <button onClick={handleCapture} disabled={isLoading} className="p-2 bg-accent/20 border border-accent/30 rounded-lg hover:bg-accent text-white transition-all shadow-lg" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} title="Capturar texto del portapapeles"><ClipboardIcon className="h-4 w-4" /></button>
          </div>
          <div className="flex-grow bg-background/30 rounded-lg p-3 text-xs overflow-y-auto border border-white/5">
            {isLoading && (
                 <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{loadingMessage || 'Cargando'}</p>
                 </div>
            )}
            {!isLoading && debouncedSearchTerm && result === undefined && <p className="text-text-secondary italic text-center py-4">Buscando en el léxico...</p>}
            {!isLoading && debouncedSearchTerm && result === null && (
                <div className="text-center py-4 space-y-2">
                    <p className="text-danger font-bold">Concepto no registrado.</p>
                    <button onClick={() => handleRequestAdd(debouncedSearchTerm)} className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] text-accent font-bold hover:bg-accent hover:text-white transition-all" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>+ AÑADIR A PENDIENTES</button>
                </div>
            )}
            {!isLoading && result && <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-start border-b border-white/5 pb-2">
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-accent font-mono tracking-tight">{result.Léxema[0]}</h2>
                    <span className="px-1.5 py-0.5 bg-accent/10 text-[9px] font-bold text-accent rounded uppercase">{result.Categoría}</span>
                  </div>
                  <button onClick={() => setView('inflections')} className="p-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><GitMergeIcon className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 p-2 rounded-md border border-white/5">
                    <span className="block text-text-secondary font-bold uppercase mb-0.5">Raíz</span>
                    <span className="font-mono text-white">{result.Raíz}</span>
                </div>
                <div className="bg-white/5 p-2 rounded-md border border-white/5">
                    <span className="block text-text-secondary font-bold uppercase mb-0.5">ID</span>
                    <span className="font-mono text-white">#{result.ID}</span>
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-md border border-white/5">
                  <span className="block text-text-secondary font-bold uppercase mb-1">Sinónimos</span>
                  <p className="text-white italic">{result.Significado.join(', ')}</p>
              </div>
            </div>}
            {!isLoading && !debouncedSearchTerm && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-40">
                    <ClipboardIcon className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Pega texto o busca<br/>un significado</p>
                </div>
            )}
          </div>
        </>}
        {view === 'capture' && <div className="flex-grow bg-background/30 rounded-lg p-2 text-xs overflow-y-auto border border-white/5">
          <p className="text-[10px] font-bold text-text-secondary uppercase mb-2 px-1 tracking-widest">Conceptos para expandir:</p>
          {missingWords.length > 0 ? (
              <div className="grid grid-cols-1 gap-1">
                  {missingWords.map(word => (
                    <button key={word} onClick={() => handleRequestAdd(word)} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-accent/20 text-accent transition-all group border border-white/5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                        <span className="font-bold">{word}</span>
                        <PlusIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
              </div>
          ) : <p className="p-4 text-text-secondary italic text-center">Todo el texto capturado ya está en tu léxico.</p>}
        </div>}
        {view === 'inflections' && result && <>
          <div className="bg-accent/10 p-2 rounded-lg border border-accent/20 mb-2">
             <p className="text-[10px] text-text-secondary font-bold uppercase text-center mb-1">Base de Flexión</p>
             <p className="text-center text-sm font-black text-accent font-mono">{(result.Léxema[0] || result.Raíz).replace(/-$/, '')}</p>
          </div>
          <select value={selectedParadigmId} onChange={e => setSelectedParadigmId(e.target.value)} className="w-full bg-background/50 border border-accent/20 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/50 text-white" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <option value="">-- Seleccionar Paradigma --</option>
            {paradigmOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <div className="flex-grow bg-background/30 rounded-lg overflow-hidden border border-white/5 mt-2">
            <table className="w-full text-left table-fixed">
                <tbody className="divide-y divide-white/5">
                {selectedParadigm ? inflectedForms.map((form, i) => (
                    <tr key={`${form.name}-${i}`} className="hover:bg-white/5 transition-colors group">
                        <td className="p-2 text-[10px] font-bold text-text-secondary uppercase truncate">{form.name}</td>
                        <td className="p-2 text-right whitespace-nowrap">
                           <span className="text-accent font-black font-mono text-xs truncate group-hover:text-white transition-colors inline-block align-middle mr-2">{form.result}</span>
                           <button onClick={() => window.widgetAPI.send('widget:request-add-inflection', { parentId: result.ID, formName: form.name, word: form.result, originalMeaning: result.Significado[0] })} className="inline-block align-middle opacity-0 group-hover:opacity-100 p-1 bg-white/10 hover:bg-accent rounded text-white transition-all outline-none focus:outline-none" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><PlusIcon className="w-3 h-3" /></button>
                        </td>
                    </tr>
                )) : (
                    <tr><td colSpan={2} className="p-8 text-text-secondary text-center italic text-[10px]">Selecciona un paradigma para ver las formas flexionadas.</td></tr>
                )}
                </tbody>
            </table>
          </div>
        </>}
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}