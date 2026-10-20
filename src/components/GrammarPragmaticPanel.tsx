/**
 * GrammarPragmaticPanel.tsx
 * ───────────────────────────
 * Panel de la Capa Pragmática dentro de GrammarTab.
 *
 * Permite:
 *   1. Seleccionar el tipo de oración (Afirmación, Pregunta, Orden...)
 *   2. Ver los módulos E-A-R-I-C-K-Q-F en orden según el tipo
 *   3. Llenar cada slot con función gramatical + lexema
 *   4. Ver la previsualización de la oración generada
 *   5. Elegir plantillas pre-llenadas por tipología
 *
 * Se integra en GrammarTab como módulo 'pragmatic'.
 * Estado: se lee y escribe sobre `manifest.pragmaticEngine`.
 */

import React, { useMemo, useState } from 'react';
import type { GrammarManifest, LexiconEntry } from '../types';
import type {
  PragmaticClauseTypeId,
  PragmaticBlockId,
  PragmaticSlotState,
  TypologyProfile,
} from '../services/grammar/pragmaticTypes';
import { PRAGMATIC_BLOCKS } from '../services/grammar/pragmaticTypes';
import {
  getPragmaticClauseTypes,
  getGrammaticalFunctions,
  getTemplates,
  buildInitialSlots,
  buildModuleOrder,
  morphologyToTypologyProfile,
  getConstructionBlocks,
  saveClauseType,
  deleteClauseType,
} from '../services/grammarDb';
import { buildClauseAST } from '../services/grammar/ast-builder';
import { realizeClause } from '../services/grammar/syntax';
import { displayOf, resolveLexicalCategory, isSubcategory } from '../data/taxonomy';
import InfoHint from './InfoHint';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

/** Mapea bloques pragmáticos a roles de participante para buildClauseAST. */
export const BLOCK_ROLE_MAP: Record<PragmaticBlockId, string> = {
  E: 'subject',
  A: 'verb',
  R: 'object',
  K: 'modifier',
  Q: 'modifier',
  F: 'modifier',
  I: 'particle',
  C: 'modifier',
};

interface GrammarPragmaticPanelProps {
  manifest: GrammarManifest;
  lexicon: LexiconEntry[];
  onUpdateManifest: (updates: Partial<GrammarManifest>) => void;
  /** Callback para volver al grafo/canvas */
  onBack?: () => void;
}

const SLOT_COLORS: Record<PragmaticBlockId, string> = {
  E: '#3b82f6', // blue — Entidad
  A: '#f59e0b', // amber — Acción
  R: '#10b981', // emerald — Receptor
  I: '#8b5cf6', // violet — Intención
  C: '#06b6d4', // cyan — Condición
  K: '#ef4444', // red — Konsekvenco
  Q: '#ec4899', // pink — Qualitajo
  F: '#6b7280', // gray — Effekto
};

const CLAUSE_TYPE_LABELS: Record<PragmaticClauseTypeId, string> = {
  afirmation: 'Afirmación',
  question: 'Pregunta',
  command: 'Orden',
  report: 'Reporte',
  desire: 'Deseo',
  exclamation: 'Exclamación',
  nominal: 'Nominal',
  verse: 'Verso',
  justicial: 'Justicial',
};

const TYPOLOGY_LABELS: Record<TypologyProfile, string> = {
  flexive: 'Flexivo',
  agglutinative: 'Aglutinante',
  isolating: 'Aislante',
};

const GrammarPragmaticPanel: React.FC<GrammarPragmaticPanelProps> = ({
  manifest,
  lexicon,
  onUpdateManifest,
  onBack,
}) => {
  const engine = manifest.pragmaticEngine ?? {
    typology: manifest.typologicalProfile ?? {},
    typologyLabel: morphologyToTypologyProfile(manifest.typology?.morphology),
    activeClauseType: null,
    slots: [],
  };

  const [clauseTypeId, setClauseTypeId] = useState<PragmaticClauseTypeId | null>(
    (engine.activeClauseType as PragmaticClauseTypeId) ?? null,
  );
  const [slots, setSlots] = useState<PragmaticSlotState[]>(engine.slots);
  const [clauseTypes, setClauseTypes] = useState<Record<string, any>>({});
  const [functions, setFunctions] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<string[]>([]);
  // Resultado de "Realizar" — sentence + gloss + tree, todos sincronizados
  const [realizedResult, setRealizedResult] = useState<{
    sentence: string;
    gloss: string;
    canvasNodes: any[];
    canvasConnections: any[];
  } | null>(null);
  const [customClauseName, setCustomClauseName] = useState('');
  // Blocks loaded from DB (block_slot_fillers); initial state from PRAGMATIC_BLOCKS constant
  const initialBlocks: Record<string, any> = {};
  for (const [id, blk] of Object.entries(PRAGMATIC_BLOCKS)) {
    initialBlocks[id] = { ...blk, id, allowedFunctions: blk.allowedFunctions };
  }
  const [blocks, setBlocks] = useState<Record<string, any>>(initialBlocks);

  // Cargar datos del catálogo (incluye block_slot_fillers desde DB)
  React.useEffect(() => {
    getPragmaticClauseTypes().then((cts) => {
      const map: Record<string, any> = {};
      cts.forEach((ct) => { map[ct.id] = ct; });
      setClauseTypes(map);
    });
    getGrammaticalFunctions().then((fns) => {
      const map: Record<string, any> = {};
      fns.forEach((fn) => { map[fn.id] = fn; });
      setFunctions(map);
    });
    getConstructionBlocks().then((dbBlocks) => {
      setBlocks(dbBlocks);
    });
  }, []);

  // Cuando cambia el tipo de oración, recalcular slots
  const handleClauseTypeChange = (id: string) => {
    setClauseTypeId(id as PragmaticClauseTypeId);
    const newSlots = buildInitialSlots(id, engine.typologyLabel);
    setSlots(newSlots);
    onUpdateManifest({
      pragmaticEngine: {
        ...engine,
        activeClauseType: id,
        slots: newSlots,
      },
    });
    // Cargar plantillas
    getTemplates(id, engine.typologyLabel).then(setTemplates);
  };

  // Cuando cambia la tipología, recargar plantillas
  React.useEffect(() => {
    if (clauseTypeId) {
      getTemplates(clauseTypeId, engine.typologyLabel).then(setTemplates);
    }
  }, [engine.typologyLabel, clauseTypeId]);

  // Actualizar un slot
  const updateSlot = (blockId: PragmaticBlockId, field: keyof PragmaticSlotState, value: any) => {
    const newSlots = slots.map((s) =>
      s.blockId === blockId ? { ...s, [field]: value } : s,
    );
    setSlots(newSlots);
    onUpdateManifest({
      pragmaticEngine: { ...engine, slots: newSlots },
    });
  };

  // Orden de módulos para el tipo seleccionado — derivado de ct.blocks (ordenado por .order)
  const moduleOrder = useMemo(() => {
    if (!clauseTypeId) return Object.keys(PRAGMATIC_BLOCKS) as PragmaticBlockId[];
    const ct = clauseTypes[clauseTypeId];
    if (ct?.blocks && Array.isArray(ct.blocks)) {
      return [...ct.blocks].sort((a: any, b: any) => a.order - b.order).map((b: any) => b.blockId) as PragmaticBlockId[];
    }
    return Object.keys(PRAGMATIC_BLOCKS) as PragmaticBlockId[];
  }, [clauseTypeId, clauseTypes]);

  // Generar preview de la oración
  const previewSentence = useMemo(() => {
    const parts = moduleOrder.map((bid) => {
      const slot = slots.find((s) => s.blockId === bid);
      if (!slot) return '';
      if (slot.lexemeId) {
        const entry = lexicon.find((e) => e.ID === slot.lexemeId);
        return entry?.Raíz ?? slot.customText;
      }
      if (slot.customText) return slot.customText;
      const fn = functions[slot.functionId ?? ''];
      return fn?.label ?? '?';
    });
    return parts.filter(Boolean).join(' ');
  }, [slots, moduleOrder, lexicon, functions]);

  const typology: TypologyProfile = engine.typologyLabel;

  // ── "Realizar": map slots → ClauseAST → realizeClause ──────────
  const handleRealizar = () => {
    const participants: { role: string; lexeme: any; features: Record<string, string> }[] = [];
    for (const bid of moduleOrder) {
      const slot = slots.find((s) => s.blockId === bid);
      if (!slot) continue;
      let lexeme: any = null;
      let features: Record<string, string> = {};
      if (slot.lexemeId) {
        const entry = lexicon.find((e) => e.ID === slot.lexemeId);
        if (entry) {
          lexeme = {
            ID: entry.ID,
            Raíz: entry.Léxema?.[0] || entry.Raíz,
            Léxema: entry.Léxema || [entry.Raíz],
            Categoría: entry.Categoría,
            Significado: entry.Significado || [],
            extraData: entry.extraData || {},
          };
          features = slot.features;
        }
      } else if (slot.customText) {
        const catKey = BLOCK_ROLE_MAP[bid] === 'verb' ? 'verbo' : 'sustantivo';
        lexeme = {
          ID: `custom_${bid}`,
          Raíz: slot.customText,
          Léxema: [slot.customText],
          Categoría: catKey,
          Significado: [slot.customText],
          extraData: {},
        };
      }
      if (lexeme) {
        participants.push({ role: BLOCK_ROLE_MAP[bid], lexeme, features });
      }
    }
    if (!participants.some((p) => p.role === 'verb')) return;
    let ast: any;
    try {
      ast = buildClauseAST(participants);
    } catch {
      setRealizedResult(null);
      return;
    }
    const result = realizeClause(ast, effectiveManifestFromEngine);
    setRealizedResult({
      sentence: result.sentence,
      gloss: (manifest.typology?.wordOrder || 'SVO').toUpperCase(),
      canvasNodes: result.canvas.nodes ?? [],
      canvasConnections: result.canvas.connections ?? [],
    });
  };

  // Build a GrammarManifest suitable for realizeClause from engine state
  const effectiveManifestFromEngine = useMemo(() => ({
    ...manifest,
    typology: {
      wordOrder: manifest.typology?.wordOrder || 'SVO',
      alignment: manifest.typology?.alignment || 'nominative',
      morphology: manifest.typology?.morphology || 'isolating',
      headDirection: manifest.typology?.headDirection || 'head-initial',
    },
  }), [manifest]);

  // ── Nominalización: verb in E slot → verboide_sn ────────────────
  const eSlot = slots.find((s) => s.blockId === 'E');
  const eLexeme = eSlot?.lexemeId ? lexicon.find((e) => e.ID === eSlot.lexemeId) : null;
  const eIsVerb = eLexeme && resolveLexicalCategory(eLexeme.Categoría) === 'verbo';

  const handleNominalizar = () => {
    if (!eSlot || !eLexeme) return;
    // Convert the verb entry to verboide_sn (nominalized form) — same root, different category
    // This creates a "verboide como sustantivo" which is an infinitivo nominal
    const newSlots = slots.map((s) => {
      if (s.blockId === 'E') {
        return {
          ...s,
          // Mark this slot as nominalized so the realization treats it as a noun
          features: { ...s.features, nominalizada: 'true', categoria_forzada: 'verboide_sn' },
        };
      }
      return s;
    });
    setSlots(newSlots);
    onUpdateManifest({
      pragmaticEngine: { ...engine, slots: newSlots },
    });
    if (realizedResult) {
      // Re-realize immediately with the nominalized slot
      setTimeout(handleRealizar, 0);
    }
  };

  // ── Custom clause type creation ────────────────────────────────
  const handleSaveCustomClauseType = async () => {
    if (!customClauseName.trim()) return;
    const id = `custom_${customClauseName.toLowerCase().replace(/\s+/g, '_')}`;
    const ct = {
      id,
      label: customClauseName,
      description: `Oración personalizada: ${customClauseName}`,
      blocks: moduleOrder.map((bid, i) => ({ blockId: bid, order: i + 1 })),
      templates: { flexive: [], agglutinative: [], isolating: [] },
    };
    await saveClauseType(ct as any);
    // Reload clause types
    const cts = await getPragmaticClauseTypes();
    const map: Record<string, any> = {};
    cts.forEach((c) => { map[c.id] = c; });
    setClauseTypes(map);
    setCustomClauseName('');
  };

  // Resolve clause type label (built-in or custom)
  const resolveClauseLabel = (id: string): string => {
    if (clauseTypes[id]?.label) return clauseTypes[id].label;
    return CLAUSE_TYPE_LABELS[id as PragmaticClauseTypeId] ?? id;
  };

  // Delete a custom clause type
  const handleDeleteCustomClauseType = async (id: string) => {
    if (!id.startsWith('custom_')) return;
    if (!confirm(`¿Eliminar tipo "${resolveClauseLabel(id)}"?`)) return;
    await deleteClauseType(id);
    const cts = await getPragmaticClauseTypes();
    const map: Record<string, any> = {};
    cts.forEach((c) => { map[c.id] = c; });
    setClauseTypes(map);
    if (clauseTypeId === id) setClauseTypeId(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Back to Graph ── */}
      {onBack && (
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent bg-white/5 hover:bg-accent/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span>←</span><span>Volver al Grafo</span>
          </button>
        </div>
      )}

      {/* ── Selector de tipo de oración ── */}
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-xl font-bold text-white mb-4">
          Capa Pragmática
          <InfoHint text="La Capa Pragmática define la intención de la oración (Afirmación, Pregunta, Orden...) y el orden de sus módulos (E-A-R-I-C-K-Q-F). Cada módulo se llena con una función gramatical y un lexema del léxico." />
        </h3>

        {/* Tipología */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Tipología del idioma
          </label>
          <div className="flex gap-2">
            {(['flexive', 'agglutinative', 'isolating'] as TypologyProfile[]).map((t) => (
              <button
                key={t}
                  onClick={() => {
                  const newEngine = { ...engine, typologyLabel: t, typology: engine.typology };
                  onUpdateManifest({ pragmaticEngine: newEngine });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  typology === t
                    ? 'bg-primary/20 text-white border-primary'
                    : 'bg-surface text-text-secondary border-border-dark hover:border-primary/50'
                }`}
              >
                {TYPOLOGY_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Tipos de oración (built-in + custom from DB/localStorage) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Tipo de oración
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(clauseTypes).map(([id, ct]) => (
              <button
                key={id}
                onClick={() => handleClauseTypeChange(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  clauseTypeId === id
                    ? 'bg-primary/20 text-white border-primary'
                    : 'bg-surface text-text-secondary border-border-dark hover:border-primary/50'
                }`}
                title={ct.description}
              >
                {resolveClauseLabel(id)}
                {id.startsWith('custom_') && (
                  <button
                    onClick={() => handleDeleteCustomClauseType(id)}
                    className="ml-1 p-0.5 text-text-secondary hover:text-red-400 transition-colors"
                    title={`Eliminar "${resolveClauseLabel(id)}"`}
                  >
                    <TrashIcon className="w-3 h-3 opacity-50 hover:opacity-100" />
                  </button>
                )}
              </button>
            ))}
          </div>

          {/* Crear tipo de oración personalizado */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customClauseName}
              onChange={(e) => setCustomClauseName(e.target.value)}
              placeholder="Nombre de tipo personalizado..."
              className="flex-1 bg-surface border border-border-dark rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
            />
            <button
              onClick={handleSaveCustomClauseType}
              disabled={!customClauseName.trim()}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ── Constructor de slots ── */}
      {clauseTypeId && (
        <div className="bg-background rounded-lg p-6 border border-border-dark">
          <h3 className="text-lg font-bold text-white mb-4">
            Constructor — {resolveClauseLabel(clauseTypeId ?? '')}
          </h3>
          {/* Botón "Realizar" — text→slots→lexemes→sentence+gloss+tree */}
          <button
            onClick={handleRealizar}
            className="mb-3 px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 rounded-lg text-sm font-semibold hover:bg-cyan-500/30 transition-colors"
          >
            Realizar
          </button>

          {/* Módulos en orden */}
          <div className="space-y-3">
            {moduleOrder.map((bid, idx) => {
              const blk = blocks[bid] ?? PRAGMATIC_BLOCKS[bid];
              const slot = slots.find((s) => s.blockId === bid);
              if (!slot) return null;
              const fn = slot.functionId ? functions[slot.functionId] : null;
              const lexeme = slot.lexemeId
                ? lexicon.find((e) => e.ID === slot.lexemeId)
                : null;

              return (
                <div
                  key={bid}
                  className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border-dark"
                >
                  {/* Orden */}
                  <span className="text-xs font-mono text-text-secondary w-6 text-center">
                    {idx + 1}
                  </span>

                  {/* Color block */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: SLOT_COLORS[bid] }}
                  />

                  {/* Block label */}
                  <span className="text-sm font-semibold text-white w-20 shrink-0">
                    {blk.label}
                  </span>

                  {/* Función gramatical */}
                  <select
                    value={slot.functionId ?? ''}
                    onChange={(e) => updateSlot(bid, 'functionId', e.target.value || null)}
                    className="flex-1 bg-background border border-border-dark rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                  >
                    <option value="">— función —</option>
                    {(blk.allowedFunctions as string[]).map((fnId: string) => {
                      const f = functions[fnId];
                      return (
                        <option key={fnId} value={fnId}>
                          {f?.label ?? fnId}
                        </option>
                      );
                    })}
                  </select>

                  {/* Lexema */}
                  <select
                    value={slot.lexemeId ?? ''}
                    onChange={(e) => updateSlot(bid, 'lexemeId', e.target.value || null)}
                    className="flex-1 bg-background border border-border-dark rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                  >
                    <option value="">— lexema —</option>
                    {lexicon
                      .filter((e) => {
                        const catKey = resolveLexicalCategory(e.Categoría);
                        if (!slot.functionId) {
                          // Without a selected function: only show entries matching
                          // this block's allowed functions (from block_slot_fillers).
                          // C2-BIS: hierarchical — subcategories (pronombre, nombre_propio,
                          //         articulo…) match when the parent category is allowed.
                          const blockAllowed = blocks[bid]?.allowedFunctions ?? [];
                          return blockAllowed.some((allowed: string) =>
                            catKey === allowed || isSubcategory(catKey, allowed)
                          );
                        }
                        // With a selected function: show the category AND its subcategories.
                        return slot.functionId === catKey || isSubcategory(catKey, slot.functionId);
                      })
                      .map((e) => (
                        <option key={e.ID} value={e.ID}>
                          {e.Raíz} ({e.Categoría})
                        </option>
                      ))}
                  </select>

                  {/* Texto libre */}
                  <input
                    type="text"
                    value={slot.customText}
                    onChange={(e) => updateSlot(bid, 'customText', e.target.value)}
                    placeholder="texto libre"
                    className="w-32 bg-background border border-border-dark rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                  />

                  {/* Quitar slot */}
                  <button
                    onClick={() => updateSlot(bid, 'functionId', null)}
                    className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>

                  {/* Nominalizar: verb in E → verboide_sn */}
                  {bid === 'E' && eIsVerb && !eSlot?.features?.nominalizada && (
                    <button
                      onClick={handleNominalizar}
                      title="Convertir verbo en sustantivo (infinitivo nominal / verboide_sn)"
                      className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      →ς
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Preview ── */}
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-3">Previsualización</h3>
        <div className="bg-surface rounded-lg p-4 border border-border-dark">
          <p className="text-xl text-white font-display">
            {previewSentence || '—'}
          </p>
        </div>

        {/* Plantillas */}
        {templates.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-text-secondary mb-2">
              Plantillas ({TYPOLOGY_LABELS[typology]})
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // Insert template as custom text in first empty slot
                    const newSlots = [...slots];
                    const emptySlot = newSlots.find(
                      (s) => !s.lexemeId && !s.functionId && !s.customText,
                    );
                    if (emptySlot) {
                      emptySlot.customText = tpl;
                      setSlots(newSlots);
                      onUpdateManifest({
                        pragmaticEngine: { ...engine, slots: newSlots },
                      });
                    }
                  }}
                  className="px-3 py-1.5 bg-surface border border-border-dark rounded-lg text-sm text-text-secondary hover:border-primary/50 hover:text-white transition-all font-mono"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Resultado de Realizar: sentence + gloss + tree synced ── */}
      {realizedResult && (
        <div className="bg-background rounded-lg p-6 border border-border-dark">
          <h3 className="text-lg font-bold text-white mb-3">Resultado — Realizado</h3>

          {/* Sentence */}
          <div className="bg-surface rounded-lg p-4 border border-border-dark mb-3">
            <p className="text-2xl text-white font-display text-center">
              {realizedResult.sentence || '—'}
            </p>
          </div>

          {/* Gloss */}
          <div className="mb-3">
            <span className="text-sm text-text-secondary">
              Glosa: <span className="text-white font-mono">{realizedResult.gloss}</span>
            </span>
          </div>

          {/* Tree (synced from canvas.nodes / canvas.connections) */}
          <div className="bg-surface rounded-lg p-4 border border-border-dark">
            <div className="text-sm text-text-secondary mb-2">Árbol (sintetizado de la oración realizada)</div>
            <div className="space-y-1">
              {realizedResult.canvasNodes.length === 0 ? (
                <span className="text-text-secondary">Vacío</span>
              ) : (
                realizedResult.canvasNodes.map((node: any) => (
                  <div key={node.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono text-text-secondary w-16">{node.id}</span>
                    <span
                      className="font-semibold"
                      style={{ color: SLOT_COLORS[(node.lexiconCategory ?? 'sustantivo').slice(0,1).toUpperCase().replace('SUSTANTIVO','E').replace('VERBO','A') as PragmaticBlockId] ?? '#6366f1' }}
                    >
                      {node.label ?? node.literalForm ?? '?'}
                    </span>
                    <span className="text-xs text-text-secondary">({node.category ?? node.lexiconCategory ?? '?'})</span>
                    {node.children && node.children.length > 0 && (
                      <span className="text-xs text-text-secondary">
                        ↳ {node.children.map((c: any) => c.label ?? c.literalForm ?? c.id).join(', ')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            {realizedResult.canvasConnections.length > 0 && (
              <div className="mt-2 text-xs text-text-secondary">
                Conexiones: {realizedResult.canvasConnections.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

GrammarPragmaticPanel.displayName = 'GrammarPragmaticPanel';

export default GrammarPragmaticPanel;
