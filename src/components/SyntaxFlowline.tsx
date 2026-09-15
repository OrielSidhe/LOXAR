/**
 * SyntaxFlowline.tsx
 * ────────────────
 * Constructor visual de oraciones para LOXAR.
 *
 * Flowline de bloques expandibles donde cada bloque = slot gramatical.
 * Cada bloque tiene pines internos (determinante, género, raíz, caso...).
 * Se pueden arrastrar lexemas del léxico a los pines.
 * El preview se genera en tiempo real usando el motor de gramática.
 *
 * Flexible: funciona con cualquier conlang (Quavanol, etc.).
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';

// ── Types ──────────────────────────────────────────────
type PinValue = { root: string; function: string; meaning: string } | null;

type PinDef = {
  id: string;
  label: string;
  expectedFunction: string;     // key canónica de taxonomy
  required: boolean;
  value: PinValue;
  options?: string[];           // opciones predefinadas (género, caso, etc.)
};

type FlowlineBlock = {
  id: string;
  label: string;
  icon: string;
  color: string;
  pins: PinDef[];
  expanded: boolean;
};

type SyntaxFlowlineProps = {
  lexicon: Array<{ ID: string; Raíz: string; Léxema: string[]; Categoría: string; Significado: string[] }>;
  onPreviewChange?: (text: string, errors: string[]) => void;
};

// ── Helpers ────────────────────────────────────────────
const PLACEHOLDER_LEXEME = '— arrastrá un lexema —';
const PLACEHOLDER_SELECT = '— seleccioná —';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ── Component ──────────────────────────────────────────
const SyntaxFlowline: React.FC<SyntaxFlowlineProps> = ({ lexicon, onPreviewChange }) => {
  const [blocks, setBlocks] = useState<FlowlineBlock[]>([
    {
      id: 'entidad', label: 'ENTIDAD', icon: '🏷️', color: 'cyan', expanded: false,
      pins: [
        { id: 'det', label: 'Determinante', expectedFunction: 'determinante', required: false, value: null },
        { id: 'root', label: 'Raíz', expectedFunction: 'sustantivo', required: true, value: null },
        { id: 'case', label: 'Caso', expectedFunction: 'caso', required: false, value: null, options: ['nominativo', 'acusativo', 'dativo', 'genitivo', 'vocativo', 'instrumental', 'locativo'] },
      ],
    },
    {
      id: 'accion', label: 'ACCIÓN', icon: '⚡', color: 'purple', expanded: false,
      pins: [
        { id: 'particle', label: 'Partícula', expectedFunction: 'particula', required: false, value: null, options: ['ó (neg)', 'vo (perf)', 'mæ (subj)', 'kwa (int)'] },
        { id: 'root', label: 'Raíz verbal', expectedFunction: 'verbo', required: true, value: null },
        { id: 'conj', label: 'Conjugación', expectedFunction: 'conjugacion', required: false, value: null, options: ['-é (presente)', '-as (pasado)', '-ila (futuro)', '-en (compuesto)'] },
      ],
    },
    {
      id: 'objeto', label: 'OBJETO', icon: '🎯', color: 'amber', expanded: false,
      pins: [
        { id: 'det', label: 'Determinante', expectedFunction: 'determinante', required: false, value: null },
        { id: 'root', label: 'Raíz', expectedFunction: 'sustantivo', required: true, value: null },
        { id: 'case', label: 'Caso', expectedFunction: 'caso', required: false, value: null, options: ['nominativo', 'acusativo', 'dativo', 'genitivo'] },
      ],
    },
    {
      id: 'modificador', label: 'MODIFICADOR', icon: '✨', color: 'emerald', expanded: false,
      pins: [
        { id: 'root', label: 'Raíz', expectedFunction: 'adjetivo', required: true, value: null },
        { id: 'degree', label: 'Grado', expectedFunction: 'grado', required: false, value: null, options: ['positivo', 'comparativo', 'superlativo'] },
      ],
    },
  ]);

  const [draggedLexeme, setDraggedLexeme] = useState<typeof lexicon[0] | null>(null);
  const [importText, setImportText] = useState('');
  const [importTarget, setImportTarget] = useState<string | null>(null);
  const [randomSeed, setRandomSeed] = useState(0);

  // ── Fill pin with lexeme ────────────────────────────
  const fillPin = useCallback((blockId: string, pinId: string, lexeme: typeof lexicon[0] | null) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, pins: b.pins.map(p => p.id === pinId ? { ...p, value: lexeme ? { root: lexeme.Raíz, function: lexeme.Categoría, meaning: lexeme.Significado[0] ?? '' } : null } : p) };
    }));
  }, []);

  // ── Fill pin with option ────────────────────────────
  const fillPinOption = useCallback((blockId: string, pinId: string, option: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, pins: b.pins.map(p => p.id === pinId ? { ...p, value: { root: option.split(' ')[0], function: p.expectedFunction, meaning: option } } : p) };
    }));
  }, []);

  // ── Toggle expand ───────────────────────────────────
  const toggleExpand = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, expanded: !b.expanded } : b));
  }, []);

  // ── Random fill ─────────────────────────────────────
  const randomFill = useCallback(() => {
    if (lexicon.length === 0) return;
    const shuffled = shuffle(lexicon);
    let idx = 0;
    setBlocks(prev => prev.map(b => ({
      ...b,
      pins: b.pins.map(p => {
        if (p.expectedFunction === 'sustantivo' || p.expectedFunction === 'verbo' || p.expectedFunction === 'adjetivo') {
          const match = shuffled.find((l, i) => i >= idx && l.Categoría.toLowerCase().includes(p.expectedFunction.slice(0, 3)));
          if (match) { idx++; return { ...p, value: { root: match.Raíz, function: match.Categoría, meaning: match.Significado[0] ?? '' } }; }
          // Fallback: any lexeme
          const any = shuffled[idx % shuffled.length];
          idx++;
          return { ...p, value: { root: any.Raíz, function: any.Categoría, meaning: any.Significado[0] ?? '' } };
        }
        // For non-root pins, randomly fill from options
        if (p.options && Math.random() > 0.3) {
          const opt = p.options[Math.floor(Math.random() * p.options.length)];
          return { ...p, value: { root: opt.split(' ')[0], function: p.expectedFunction, meaning: opt } };
        }
        return { ...p, value: null };
      }),
    })));
    setRandomSeed(s => s + 1);
  }, [lexicon]);

  // ── Clear all ───────────────────────────────────────
  const clearAll = useCallback(() => {
    setBlocks(prev => prev.map(b => ({ ...b, expanded: false, pins: b.pins.map(p => ({ ...p, value: null })) })));
  }, []);

  // ── Parse import ────────────────────────────────────
  const handleImport = useCallback(() => {
    if (!importText.trim() || !importTarget) return;
    const lines = importText.trim().split('\n').filter(l => l.trim());
    // Simple parse: tab/comma separated → options
    const options = lines.slice(1).map(line => {
      const parts = line.split(/[\t,|]+/).map(s => s.trim());
      return parts.join(' | ');
    }).filter(Boolean);
    if (options.length > 0) {
      setBlocks(prev => prev.map(b => {
        if (b.id !== importTarget) return b;
        return { ...b, pins: b.pins.map(p => p.options ? { ...p, options: [...(p.options), ...options] } : p) };
      }));
    }
    setImportText('');
    setImportTarget(null);
  }, [importText, importTarget]);

  // ── Generate preview ────────────────────────────────
  const { previewText, errors } = useMemo(() => {
    const errors: string[] = [];
    const parts: string[] = [];

    blocks.forEach(block => {
      const filledPins = block.pins.filter(p => p.value);
      const missingRequired = block.pins.filter(p => p.required && !p.value);

      if (missingRequired.length > 0 && filledPins.length > 0) {
        errors.push(`${block.label}: falta "${missingRequired[0].label}"`);
      }

      filledPins.forEach(pin => {
        if (pin.value) parts.push(`[${pin.value.root}]`);
      });
    });

    if (parts.length === 0 && lexicon.length === 0) {
      errors.push('No hay lexemas. Añadí palabras al léxico primero.');
    }

    return { previewText: parts.join(' '), errors };
  }, [blocks, lexicon.length, randomSeed]);

  React.useEffect(() => {
    onPreviewChange?.(previewText, errors);
  }, [previewText, errors, onPreviewChange]);

  // ── Render ──────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={randomFill} disabled={lexicon.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <span>🎲</span><span>Random</span>
        </button>
        <button onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
          <span>🗑️</span><span>Limpiar</span>
        </button>
        <div className="ml-auto text-[10px] text-white/40">
          {lexicon.length} lexemas disponibles
        </div>
      </div>

      {/* Flowline */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {blocks.map((block) => {
          const filledCount = block.pins.filter(p => p.value).length;
          const totalCount = block.pins.length;
          const colorMap: Record<string, string> = {
            cyan: 'border-cyan-400/50 bg-cyan-500/5',
            purple: 'border-purple-400/50 bg-purple-500/5',
            amber: 'border-amber-400/50 bg-amber-500/5',
            emerald: 'border-emerald-400/50 bg-emerald-500/5',
          };

          return (
            <div key={block.id} className={`rounded-xl border-2 transition-all ${colorMap[block.color] ?? 'border-white/10 bg-white/5'} ${block.expanded ? 'p-3' : 'p-2'}`}>
              {/* Block Header */}
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(block.id)}>
                <span className="text-lg">{block.icon}</span>
                <span className="text-xs font-bold text-white tracking-wide">{block.label}</span>
                <span className="text-[10px] text-white/40 ml-1">{filledCount}/{totalCount}</span>
                <div className="ml-auto flex items-center gap-1">
                  {/* Status dots */}
                  {block.pins.map(p => (
                    <span key={p.id} className={`w-2 h-2 rounded-full ${p.value ? 'bg-emerald-400' : p.required ? 'bg-amber-400/60' : 'bg-white/20'}`} />
                  ))}
                  <span className={`text-[10px] text-white/40 transition-transform ${block.expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>

              {/* Expanded: Pins */}
              {block.expanded && (
                <div className="mt-3 space-y-2">
                  {block.pins.map(pin => (
                    <div key={pin.id} className="flex items-center gap-2">
                      {/* Pin label */}
                      <span className={`text-[10px] font-mono w-20 truncate ${pin.required ? 'text-amber-400' : 'text-white/50'}`}>
                        {pin.label}{pin.required && '*'}
                      </span>
                      {/* Pin value / drop zone */}
                      {!pin.options ? (
                        <div
                          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-accent/20'); }}
                          onDragLeave={e => e.currentTarget.classList.remove('bg-accent/20')}
                          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('bg-accent/20'); if (draggedLexeme) fillPin(block.id, pin.id, draggedLexeme); }}
                          onClick={() => pin.value && fillPin(block.id, pin.id, null)}
                          className={`flex-1 rounded-lg border border-dashed px-3 py-1.5 text-xs cursor-pointer transition-colors min-h-[28px] flex items-center ${
                            pin.value ? 'border-accent/40 bg-accent/10 text-white' : 'border-white/20 bg-white/5 text-white/30 hover:border-accent/30'
                          }`}
                        >
                          {pin.value ? (
                            <span><span className="text-accent font-mono font-bold">{pin.value.root}</span> <span className="text-white/40">({pin.value.meaning})</span></span>
                          ) : (
                            <span>{PLACEHOLDER_LEXEME}</span>
                          )}
                        </div>
                      ) : (
                        <select
                          value={pin.value?.meaning ?? ''}
                          onChange={e => fillPinOption(block.id, pin.id, e.target.value)}
                          className="flex-1 bg-black/30 border border-white/20 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-accent/50 cursor-pointer"
                        >
                          <option value="" className="bg-background">{PLACEHOLDER_SELECT}</option>
                          {pin.options?.map(opt => (
                            <option key={opt} value={opt} className="bg-background text-white">{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                  {/* Import button for this block */}
                  <button
                    onClick={() => setImportTarget(block.id)}
                    className="text-[10px] text-accent/60 hover:text-accent transition-colors mt-1"
                  >
                    + Importar tabla
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import Modal */}
      {importTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-dark rounded-xl p-4 w-full max-w-md mx-4">
            <h3 className="text-sm font-bold text-white mb-2">Importar tabla para: {blocks.find(b => b.id === importTarget)?.label}</h3>
            <p className="text-[10px] text-white/50 mb-2">Pegá una tabla (tab/comma/pipe separado). Primera fila = headers.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              placeholder="caso&#9;sg-vocal&#9;sg-consonante&#9;plural&#10;nominativo&#9;-&#9;-u&#9;a→u&#10;acusativo&#9;-ar&#9;-ar&#9;-aur&#10;dativo&#9;-ala&#9;-ala&#9;-alu"
              className="w-full h-32 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-mono resize-none focus:outline-none focus:border-accent/50 mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportTarget(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20">Cancelar</button>
              <button onClick={handleImport} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30">Importar</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-xl border border-accent/30 bg-black/30 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">Preview</span>
          {errors.length > 0 && <span className="text-[9px] text-amber-400">⚠ {errors.length} aviso(s)</span>}
        </div>
        <div className="text-sm font-mono text-white min-h-[24px]">
          {previewText || <span className="text-white/20 italic">— Llená los bloques o usá Random —</span>}
        </div>
        {errors.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {errors.map((err, i) => (
              <div key={i} className="text-[9px] text-amber-400/80">⚠ {err}</div>
            ))}
          </div>
        )}
      </div>

      {/* Lexeme Palette */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">Léxico disponible (arrastrá a los pines)</div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {lexicon.length === 0 ? (
            <span className="text-[10px] text-white/30 italic">No hay lexemas. Andá al Léxico para añadir palabras.</span>
          ) : (
            lexicon.slice(0, 50).map(entry => (
              <span key={entry.ID}
                draggable
                onDragStart={() => setDraggedLexeme(entry)}
                onDragEnd={() => setDraggedLexeme(null)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white cursor-grab active:cursor-grabbing hover:bg-accent/10 hover:border-accent/30 transition-colors select-none"
              >
                <span className="text-accent font-mono font-bold">{entry.Raíz}</span>
                <span className="text-white/30">{entry.Categoría}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SyntaxFlowline;
