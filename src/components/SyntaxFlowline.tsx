/**
 * SyntaxFlowline.tsx — Sintaxis Lego
 * ─────────────────────────────────────
 * Constructor visual de oraciones para LOXAR.
 *
 * Flowline de bloques (Lego) expandibles donde cada bloque = slot gramatical.
 * Cada bloque tiene pines internos (determinante, género, raíz, caso...).
 * Se pueden arrastrar lexemas del léxico a los pines.
 * El preview se genera en tiempo real usando el motor de gramática (realizeClause).
 *
 * Phase G — Sintaxis Lego:
 *   G1: Bloques generados desde manifest.roles + manifest.typology.wordOrder
 *   G2: Preview usa realizeClause (grammar engine) en lugar de [root] simple
 *   G3: Gestión de bloques — añadir/quitar/reordenar (movimiento Lego)
 *   G4: Persistencia en localStorage + onPreviewChange a GraphCanvas
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { GrammarManifest, LexiconEntry } from '../types';
import { realizeClause } from '../services/grammar/syntax';
import {
  BLOCK_COLORS,
  BLOCK_ICONS,
  FALLBACK_OPTIONS,
  PLACEHOLDER_LEXEME,
  PLACEHOLDER_SELECT,
  ROLE_TO_FUNCTION,
  buildBlocksFromManifest,
  getMorphoOptions,
  handleDropOutside,
  loadState,
  saveState,
  shuffle,
} from '../utils/syntaxFlowlineModel';
import type { FlowlineBlock, PinDef } from '../utils/syntaxFlowlineModel';

// Re-exported for backward compatibility: tests and external consumers import
// the pure domain helpers from this component module.
export {
  buildBlocksFromManifest,
  extractMorphologicalProperties,
  getMorphoOptions,
  handleDropOutside,
} from '../utils/syntaxFlowlineModel';
export type { FlowlineBlock, PinDef, PinValue } from '../utils/syntaxFlowlineModel';

type SyntaxFlowlineProps = {
  lexicon: LexiconEntry[];
  grammar?: GrammarManifest;    // G1: grammar manifest for role/word-order driven blocks
  conlangName?: string;
  /** Callback al cambiar el preview (G4) */
  onPreviewChange?: (text: string, errors: string[]) => void;
};

// ── Component ──────────────────────────────────────────

const SyntaxFlowline: React.FC<SyntaxFlowlineProps> = ({
  lexicon = [],
  grammar,
  conlangName: _conlangName,
  onPreviewChange,
}) => {
  // G1: Build blocks from grammar manifest
  const initialBlocks = useMemo(() => buildBlocksFromManifest(grammar), [grammar]);
  const [blocks, setBlocks] = useState<FlowlineBlock[]>(() => loadState(initialBlocks));

  // G4: Sync when grammar changes (manifest update)
  useEffect(() => {
    const fresh = buildBlocksFromManifest(grammar);
    const restored = loadState(fresh);
    setBlocks(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammar]);

  const [draggedLexeme, setDraggedLexeme] = useState<LexiconEntry | null>(null);
  const [importText, setImportText] = useState('');
  const [importTarget, setImportTarget] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState<{ blockId: string; pinId: string } | null>(null);

  // ── G1: Add a new block (from palette / + button) ──
  const availableBlocks = useMemo(() => {
    const usedRoleIds = new Set(blocks.map(b => b.roleId));
    const available = (grammar?.roles ?? []).filter(r => {
      const roleKey = r.id;
      const isUsed = usedRoleIds.has(roleKey);
      // Allow adding modifier/adjunct multiple times, but not subject/verb/object
      const singleton = ['subject', 'verb', 'object', 'predicate'].includes(roleKey);
      return !singleton || !isUsed;
    });
    return available.map(r => ({
      id: `new_${r.id}`,
      label: (r.name || r.id).toUpperCase(),
      icon: BLOCK_ICONS[r.id] || '🧩',
      color: BLOCK_COLORS[r.id] || 'gray',
      roleId: r.id,
    }));
  }, [blocks, grammar?.roles]);

  const addBlock = useCallback((blockTemplate: { id: string; label: string; icon: string; color: string; roleId: string }) => {
    const functionKey = ROLE_TO_FUNCTION[blockTemplate.roleId] || 'sustantivo';
    const pins: PinDef[] = [
      { id: uid('root'), label: 'Raíz', expectedFunction: functionKey, required: true, value: null },
    ];
    if (blockTemplate.roleId === 'subject' || blockTemplate.roleId === 'object') {
      const manifestOptions = getMorphoOptions(grammar, functionKey, 'case');
      pins.push({
        id: uid('case'), label: 'Caso', expectedFunction: 'caso', required: false, value: null,
        options: manifestOptions || FALLBACK_OPTIONS.case.options,
        feature: 'case',
        morphoCategory: functionKey,
      });
    }
    if (blockTemplate.roleId === 'verb' || blockTemplate.roleId === 'predicate') {
      const manifestOptions = getMorphoOptions(grammar, functionKey, 'tense');
      pins.push({
        id: uid('conj'), label: 'Conjugación', expectedFunction: 'conjugacion', required: false, value: null,
        options: manifestOptions || FALLBACK_OPTIONS.conj.options,
        feature: 'tense',
        morphoCategory: functionKey,
      });
    }

    const newBlock: FlowlineBlock = {
      id: `block_${Date.now()}`,
      label: blockTemplate.label,
      icon: blockTemplate.icon,
      color: blockTemplate.color,
      roleId: blockTemplate.roleId,
      expanded: true,
      pins,
    };
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      saveState(updated);
      return updated;
    });
  }, [grammar]);

  // G3: Remove a block
  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== blockId);
      saveState(updated);
      return updated;
    });
  }, []);

  // G3: Reorder blocks (Lego movement)
  const moveBlock = useCallback((fromIdx: number, toIdx: number) => {
    setBlocks(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      saveState(arr);
      return arr;
    });
  }, []);

  // ── Fill pin with lexeme ──
  const fillPin = useCallback((blockId: string, pinId: string, lexeme: LexiconEntry | null) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        pins: b.pins.map(p => p.id === pinId
          ? { ...p, value: lexeme ? { root: lexeme.Raíz, function: lexeme.Categoría, meaning: lexeme.Significado[0] ?? '', lexeme } : null }
          : p),
      };
    }));
  }, []);

  // ── Fill pin with option ──
  const fillPinOption = useCallback((blockId: string, pinId: string, option: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        pins: b.pins.map(p => p.id === pinId
          ? { ...p, value: { root: option.split(' ')[0], function: p.expectedFunction, meaning: option } }
          : p),
      };
    }));
  }, []);

  // ── Toggle expand ──
  const toggleExpand = useCallback((blockId: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, expanded: !b.expanded } : b));
  }, []);

  // ── G3: Random fill ──
  const randomFill = useCallback(() => {
    if (lexicon.length === 0) return;
    const shuffled = shuffle(lexicon);
    let idx = 0;
    setBlocks(prev => prev.map(b => ({
      ...b,
      pins: b.pins.map(p => {
        const funcLower = p.expectedFunction.toLowerCase();
        if (funcLower === 'sustantivo' || funcLower === 'verbo' || funcLower === 'adjetivo') {
          const prefix = funcLower.slice(0, 3);
          const match = shuffled.find((l, i) => i >= idx && l.Categoría.toLowerCase().includes(prefix));
          if (match) { idx++; return { ...p, value: { root: match.Raíz, function: match.Categoría, meaning: match.Significado[0] ?? '', lexeme: match } }; }
          const any = shuffled[idx % shuffled.length];
          idx++;
          return { ...p, value: { root: any.Raíz, function: any.Categoría, meaning: any.Significado[0] ?? '', lexeme: any } };
        }
        if (p.options && Math.random() > 0.3) {
          const opt = p.options[Math.floor(Math.random() * p.options.length)];
          return { ...p, value: { root: opt.split(' ')[0], function: p.expectedFunction, meaning: opt } };
        }
        return { ...p, value: null };
      }),
    })));
  }, [lexicon]);

  // ── Clear all ──
  const clearAll = useCallback(() => {
    setBlocks(prev => prev.map(b => ({ ...b, expanded: false, pins: b.pins.map(p => ({ ...p, value: null })) })));
  }, []);

  // ── Parse import ──
  const handleImport = useCallback(() => {
    if (!importText.trim() || !importTarget) return;
    const lines = importText.trim().split('\n').filter(l => l.trim());
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

  // ── G2: Generate real preview using grammar engine ──
  const { previewText, errors } = useMemo(() => {
    const errors: string[] = [];
    const participants: { role: string; lexeme: LexiconEntry; features: Record<string, string> }[] = [];
    const freeMorphemes: { role: string; form: string }[] = [];

    blocks.forEach(block => {
      const filledPins = block.pins.filter(p => p.value);
      const missingRequired = block.pins.filter(p => p.required && !p.value);

      if (missingRequired.length > 0 && filledPins.length > 0) {
        errors.push(`${block.label}: falta "${missingRequired[0].label}"`);
      }

      // Collect root lexeme as a participant
      const rootPin = block.pins.find(p => p.expectedFunction === ROLE_TO_FUNCTION[block.roleId] && p.value);
      if (rootPin && rootPin.value?.lexeme) {
        const features: Record<string, string> = {};
        // Collect feature pins (case, conjugation, etc.)
        // G5/G6: Use pin.feature as the feature key; fall back to pin.id for legacy pins
        block.pins.forEach(p => {
          if (p.id !== rootPin.id && p.value) {
            const featureKey = p.feature || p.id;
            // For option pins: extract the feature value from the option string (e.g. "case=nominativo")
            if (p.options && p.value?.meaning) {
              // The value.root is the first word of the option (e.g. "nominativo" from "-é (presente)")
              features[featureKey] = p.value.root;
            } else if (p.value.root) {
              features[featureKey] = p.value.root;
            }
          }
        });
        participants.push({
          role: block.roleId,
          lexeme: rootPin.value.lexeme,
          features,
        });
      }

      // Collect option-value pins as free morphemes
      block.pins.forEach(p => {
        if (p.value && p.options) {
          freeMorphemes.push({ role: p.id, form: p.value.root });
        }
      });
    });

    if (participants.length === 0 && lexicon.length === 0) {
      errors.push('No hay lexemas. Añadí palabras al léxico primero.');
      return { previewText: '', errors };
    }

    // G2: Use realizeClause from the grammar engine
    if (grammar && participants.length > 0) {
      try {
        const clauseFeatures = { participants, freeMorphemes: freeMorphemes.length > 0 ? freeMorphemes : undefined };
        const result = realizeClause(clauseFeatures, grammar);
        return { previewText: result.sentence, errors };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Error del motor: ${msg}`);
        // Fallback to simple preview
        const parts = participants.map(p => p.lexeme.Raíz);
        return { previewText: parts.join(' '), errors };
      }
    }

    // Fallback: simple preview (original behavior)
    const parts: string[] = [];
    blocks.forEach(block => {
      block.pins.filter(p => p.value).forEach(pin => {
        if (pin.value) parts.push(`[${pin.value.root}]`);
      });
    });
    return { previewText: parts.join(' '), errors };
  }, [blocks, lexicon.length, grammar]);

  // G4: Emit preview change
  React.useEffect(() => {
    onPreviewChange?.(previewText, errors);
  }, [previewText, errors, onPreviewChange]);

  // G4: Persist on change
  useEffect(() => {
    saveState(blocks);
  }, [blocks]);

  // ── Render ──
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={randomFill}
          disabled={lexicon.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>🎲</span><span>Random</span>
        </button>
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
        >
          <span>🗑️</span><span>Limpiar</span>
        </button>

        {/* G3: Block palette (add blocks) */}
        {availableBlocks.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-white/40">Añadir:</span>
            {availableBlocks.map(b => (
              <button
                key={b.id}
                onClick={() => addBlock(b)}
                title={`Añadir ${b.label}`}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-accent/10 hover:border-accent/30 text-xs transition-colors"
              >
                <span>{b.icon}</span>
                <span className="text-[10px] text-white">{b.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto text-[10px] text-white/40">
          {lexicon.length} lexemas disponibles
        </div>
      </div>

      {/* Flowline — G3: draggable with reorder handle */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {blocks.map((block, idx) => {
          const filledCount = block.pins.filter(p => p.value).length;
          const totalCount = block.pins.length;
          const colorMap: Record<string, string> = {
            cyan: 'border-cyan-400/50 bg-cyan-500/5',
            purple: 'border-purple-400/50 bg-purple-500/5',
            amber: 'border-amber-400/50 bg-amber-500/5',
            emerald: 'border-emerald-400/50 bg-emerald-500/5',
            pink: 'border-pink-400/50 bg-pink-500/5',
            indigo: 'border-indigo-400/50 bg-indigo-500/5',
          };

          return (
            <div
              key={block.id}
              className={`rounded-xl border-2 transition-all group ${colorMap[block.color] ?? 'border-white/10 bg-white/5'} ${block.expanded ? 'p-3' : 'p-2'}`}
              draggable
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={e => {
                e.preventDefault();
                const fromIdx = Number(e.dataTransfer.getData('application/loxar-block'));
                if (!isNaN(fromIdx) && fromIdx !== idx) moveBlock(fromIdx, idx);
              }}
            >
              {/* Block Header */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleExpand(block.id)}
                draggable
                onDragStart={e => { e.dataTransfer.setData('application/loxar-block', String(idx)); }}
                onDragEnd={e => { e.dataTransfer.setData('application/loxar-block', ''); }}
              >
                {/* G3: Reorder handle (visible on hover) */}
                <span className="cursor-move opacity-0 group-hover:opacity-60 text-white/30 text-xs transition-opacity touch-none">⠿</span>

                <span className="text-lg">{block.icon}</span>
                <span className="text-xs font-bold text-white tracking-wide">{block.label}</span>
                <span className="text-[10px] text-white/40 ml-1">{filledCount}/{totalCount}</span>

                {/* G3: Remove button */}
                <button
                  onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                  title={`Quitar ${block.label}`}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs p-0.5 rounded transition-all"
                >
                  ✕
                </button>

                <span className={`text-[10px] text-white/40 transition-transform ${block.expanded ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {/* Expanded: Pins */}
              {block.expanded && (
                <div className="mt-3 space-y-2">
                  {block.pins.map(pin => {
                    const showPropertyPopover = editingPin?.blockId === block.id && editingPin?.pinId === pin.id && pin.feature;
                    return (
                      <div key={pin.id} className="flex items-center gap-2">
                        {/* Pin label — G5: clic on feature pins opens popover */}
                        <span
                          className={`text-[10px] font-mono w-20 truncate ${pin.required ? 'text-amber-400' : 'text-white/50'} ${pin.feature ? 'cursor-pointer hover:text-accent' : ''}`}
                          onClick={() => {
                            if (pin.feature) {
                              setEditingPin({ blockId: block.id, pinId: pin.id });
                            }
                          }}
                          title={pin.feature ? `Editar propiedad: ${pin.feature}` : undefined}
                        >
                          {pin.label}{pin.required && '*'}
                        </span>

                        {/* Pin value / drop zone */}
                        {!pin.options ? (
                          <div
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-accent/20'); }}
                            onDragLeave={e => e.currentTarget.classList.remove('bg-accent/20')}
                            onDrop={e => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('bg-accent/20');
                              if (draggedLexeme) {
                                fillPin(block.id, pin.id, draggedLexeme);
                                // G7: Also handle drag-out of lexeme pieces
                                setDraggedLexeme(null);
                              }
                            }}
                            onDragEnd={e => {
                              // G7: Drag-out outside the flowline returns piece to inventory
                              // If the drag ended without dropping on a pin, the lexeme returns to palette
                            }}
                            onClick={() => pin.value && fillPin(block.id, pin.id, null)}
                            className={`flex-1 rounded-lg border border-dashed px-3 py-1.5 text-xs cursor-pointer transition-colors min-h-[28px] flex items-center ${
                              pin.value
                                ? 'border-accent/40 bg-accent/10 text-white'
                                : 'border-white/20 bg-white/5 text-white/30 hover:border-accent/30'
                            }`}
                          >
                            {pin.value ? (
                              <span>
                                <span className="text-accent font-mono font-bold">{pin.value.root}</span>
                                <span className="text-white/40"> ({pin.value.meaning})</span>
                              </span>
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

                        {/* G5: Property editor popover — appears when feature pin is clicked */}
                        {showPropertyPopover && pin.options && (
                          <div
                            className="fixed z-[200] bg-surface-dark border border-border-dark rounded-xl shadow-glow p-3 w-48"
                            style={{
                              position: 'fixed',
                              top: 100,
                              left: 100,
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="text-[9px] uppercase tracking-wider text-accent font-semibold mb-2">
                              {pin.feature} · {pin.morphoCategory}
                            </div>
                            <div className="space-y-1">
                              {(pin.options || []).map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    fillPinOption(block.id, pin.id, opt);
                                    setEditingPin(null);
                                  }}
                                  className={`w-full text-left text-[10px] px-2 py-1 rounded transition-colors ${
                                    pin.value?.meaning === opt
                                      ? 'bg-accent/20 text-accent'
                                      : 'text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setEditingPin(null)}
                              className="w-full text-[9px] text-text-secondary hover:text-text-primary mt-2 pt-1 border-t border-border-dark"
                            >
                              Cerrar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Import button for this block */}
                  <button
                    onClick={() => setImportTarget(block.id)}
                    className="text-[10px] text-accent/60 hover:text-accent transition-colors mt-1"
                  >
                    + Importar tabla
                  </button>
                </div>
              )}

              {/* G7: Drag-out handler — clicking outside returns piece to inventory */}
              {editingPin && (
                <div
                  className="fixed inset-0 z-[150]"
                  onClick={() => setEditingPin(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Import Modal */}
      {importTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-dark rounded-xl p-4 w-full max-w-md mx-4">
            <h3 className="text-sm font-bold text-white mb-2">
              Importar tabla para: {blocks.find(b => b.id === importTarget)?.label}
            </h3>
            <p className="text-[10px] text-white/50 mb-2">
              Pegá una tabla (tab/comma/pipe separado). Primera fila = headers.
            </p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="caso&#9;sg-vocal&#9;sg-consonante&#9;plural&#10;nominativo&#9;-&#9;-u&#9;a→u&#10;acusativo&#9;-ar&#9;-ar&#9;-aur&#10;dativo&#9;-ala&#9;-ala&#9;-alu"
              className="w-full h-32 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-mono resize-none focus:outline-none focus:border-accent/50 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportTarget(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20">Cancelar</button>
              <button onClick={handleImport} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30">Importar</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview — G2: uses grammar engine */}
      <div className="rounded-xl border border-accent/30 bg-black/30 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">Preview de oración</span>
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
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-semibold">
          Léxico disponible (arrastrá a los pines)
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {lexicon.length === 0 ? (
            <span className="text-[10px] text-white/30 italic">No hay lexemas. Andá al Léxico para añadir palabras.</span>
          ) : (
            lexicon.slice(0, 50).map(entry => (
              <span
                key={entry.ID}
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

/** Generate a uid for pin/block ids */
function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default SyntaxFlowline;
