/**
 * FloatingWidget.tsx — F1: Widget flotante con docking a bordes de pantalla.
 *
 * F2: Persiste posición y estado de dock en localStorage (loxar_floating_widget_v1).
 * F3: Quick actions: búsqueda, añadir palabra, toggle capture mode.
 * F4: Integra con el widget bridge existente vía window.loxarBridge.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SearchIcon from './icons/SearchIcon';
import PlusIcon from './icons/PlusIcon';
import SparkleIcon from './icons/SparkleIcon';

type DockPosition = 'left' | 'right' | 'bottom' | null;

interface WidgetState {
  docked: DockPosition;
  position: { x: number; y: number };
}

const STORAGE_KEY = 'loxar_floating_widget_v1';
const WIDGET_WIDTH = 320;
const WIDGET_HEIGHT = 480;

// Default state: docked to right edge
const defaultState: WidgetState = { docked: 'right', position: { x: 0, y: 0 } };

/** Load persisted widget state from localStorage. */
function loadState(): WidgetState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<WidgetState>;
      if (parsed && typeof parsed === 'object') {
        return {
          docked: parsed.docked !== undefined ? parsed.docked : 'right',
          position: parsed.position ?? defaultState.position,
        };
      }
    }
  } catch {
    // Corrupt data — fall back to defaults
  }
  return defaultState;
}

/** Save widget state to localStorage. */
function saveState(state: WidgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

interface FloatingWidgetProps {
  /** True when there is active text in the clipboard capture flow. */
  isCapturing?: boolean;
  /** Words found in clipboard that aren't in the lexicon. */
  missingWords?: string[];
  /** Callback when user requests to add a word to the lexicon. */
  onAddWord?: (word: string) => void;
  /** Callback when user requests to search the lexicon. */
  onSearch?: (term: string) => void;
  /** Callback when user toggles the capture mode. */
  onToggleCapture?: () => void;
  /** The last search result, if any. */
  lastResult?: { lexeme: string; categoria: string; significado: string[] } | null;
}

export function FloatingWidget({
  isCapturing = false,
  missingWords = [],
  onAddWord,
  onSearch,
  onToggleCapture,
  lastResult,
}: FloatingWidgetProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<WidgetState>(defaultState);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load persisted state on mount
  useEffect(() => {
    setState(loadState());
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Dock position → CSS anchor classes
  const getDockClasses = () => {
    switch (state.docked) {
      case 'left':
        return 'left-4 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-4 top-1/2 -translate-y-1/2';
      case 'bottom':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      default:
        return 'right-4 top-1/2 -translate-y-1/2';
    }
  };

  const dockOrder: DockPosition[] = ['right', 'bottom', 'left', null];
  const cycleDock = useCallback(() => {
    const currentIndex = dockOrder.indexOf(state.docked);
    const next = dockOrder[(currentIndex + 1) % dockOrder.length];
    setState(s => ({ ...s, docked: next }));
  }, [state.docked]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!state.docked) {
      // Only draggable in free (undocked) mode
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleDrag = useCallback((e: MouseEvent) => {
    if (dragOffset && !state.docked) {
      setState(s => ({
        ...s,
        position: {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        },
      }));
    }
  }, [dragOffset, state.docked]);

  const handleDragEnd = useCallback(() => {
    setDragOffset(null);
  }, []);

  useEffect(() => {
    if (dragOffset && !state.docked) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragOffset, handleDrag, handleDragEnd, state.docked]);

  const handleSearch = () => {
    if (searchTerm.trim() && onSearch) {
      onSearch(searchTerm.trim());
      setSearchTerm('');
    }
  };

  const handleAddWord = (word: string) => {
    onAddWord?.(word);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-[60] bg-accent text-white rounded-full w-12 h-12 shadow-2xl flex items-center justify-center hover:bg-accent-hover transition-all transform hover:scale-105 border-2 border-accent/30"
        style={{ right: 20, bottom: 20 }}
        aria-label="Abrir widget flotante"
        title="Widget flotante de LOXAR"
      >
        <SparkleIcon className="h-5 w-5" />
      </button>
    );
  }

  const panel = (
    <div
      className={`fixed z-[60] bg-background rounded-2xl border border-border-dark shadow-2xl flex flex-col ${state.docked ? getDockClasses() : ''}`}
      style={state.docked ? undefined : {
        left: state.position.x,
        top: state.position.y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        cursor: dragOffset && !state.docked ? 'grabbing' : undefined,
      }}
    >
      {/* Header — draggable when undocked */}
      <div
        className="flex items-center justify-between p-3 border-b border-border-dark flex-shrink-0 bg-surface/80 rounded-t-2xl"
        onMouseDown={handleDragStart}
        style={{ cursor: state.docked ? 'default' : 'grab' }}
      >
        <span className="text-xs font-black uppercase tracking-tighter text-accent">
          Widget Flotante
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={cycleDock}
            className="p-1 text-text-secondary hover:text-white rounded transition-colors"
            title={state.docked ? `Desacoplar (actual: ${state.docked})` : 'Acoplar al borde'}
            aria-label="Cambiar posición de dock"
          >
            {/* Dock position indicator */}
            <span className="text-xs">◐</span>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-text-secondary hover:text-danger rounded transition-colors"
            aria-label="Cerrar widget"
            title="Cerrar"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Capture mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={onToggleCapture}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              isCapturing
                ? 'bg-success/20 text-success border border-success/30'
                : 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
            }`}
          >
            <ClipboardIcon className="h-3 w-3" />
            {isCapturing ? 'Capturando...' : 'Capturar Portapapeles'}
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar en léxico..."
            className="flex-1 bg-background/50 border border-subtle rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent text-text-primary"
          />
          <button
            onClick={handleSearch}
            disabled={!searchTerm.trim()}
            className="px-2 py-1 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors disabled:opacity-50"
            aria-label="Buscar"
          >
            <SearchIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Search result */}
        {lastResult && (
          <div className="p-2 bg-surface rounded border border-subtle text-xs">
            <div className="font-black text-accent font-mono">{lastResult.lexeme}</div>
            <span className="px-1 py-0.5 bg-accent/10 text-[9px] font-bold text-accent rounded uppercase">
              {lastResult.categoria}
            </span>
            <p className="text-text-secondary mt-1 italic">{lastResult.significado.join(', ')}</p>
          </div>
        )}

        {/* Missing words */}
        {missingWords.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-text-secondary uppercase">Conceptos para expandir:</p>
            {missingWords.slice(0, 8).map(word => (
              <button
                key={word}
                onClick={() => handleAddWord(word)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-accent/20 text-accent transition-all text-xs"
              >
                <span className="font-bold">{word}</span>
                <PlusIcon className="h-3 w-3" />
              </button>
            ))}
            {missingWords.length > 8 && (
              <p className="text-xs text-text-secondary text-center">+{missingWords.length - 8} más</p>
            )}
          </div>
        )}

        {!missingWords.length && !lastResult && (
          <div className="text-center py-8 opacity-40">
            <ClipboardIcon className="h-6 w-6 mb-2 mx-auto" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              {isCapturing ? 'Procesando portapapeles...' : 'Captura texto o busca'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
