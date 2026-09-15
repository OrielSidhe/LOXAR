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
} from '../services/grammarDb';
import { displayOf } from '../data/taxonomy';
import InfoHint from './InfoHint';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface GrammarPragmaticPanelProps {
  manifest: GrammarManifest;
  lexicon: LexiconEntry[];
  onUpdateManifest: (updates: Partial<GrammarManifest>) => void;
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
}) => {
  const engine = manifest.pragmaticEngine ?? {
    typology: 'isolating',
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

  // Cargar datos del catálogo
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
  }, []);

  // Cuando cambia el tipo de oración, recalcular slots
  const handleClauseTypeChange = (id: PragmaticClauseTypeId) => {
    setClauseTypeId(id);
    const newSlots = buildInitialSlots(id, engine.typology);
    setSlots(newSlots);
    onUpdateManifest({
      pragmaticEngine: {
        ...engine,
        activeClauseType: id,
        slots: newSlots,
      },
    });
    // Cargar plantillas
    getTemplates(id, engine.typology).then(setTemplates);
  };

  // Cuando cambia la tipología, recargar plantillas
  React.useEffect(() => {
    if (clauseTypeId) {
      getTemplates(clauseTypeId, engine.typology).then(setTemplates);
    }
  }, [engine.typology, clauseTypeId]);

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

  // Orden de módulos para el tipo seleccionado
  const moduleOrder = useMemo(() => {
    if (!clauseTypeId) return Object.keys(PRAGMATIC_BLOCKS) as PragmaticBlockId[];
    const ct = clauseTypes[clauseTypeId];
    return (ct?.defaultOrder ?? Object.keys(PRAGMATIC_BLOCKS)) as PragmaticBlockId[];
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

  const typology: TypologyProfile = engine.typology;

  return (
    <div className="space-y-4">
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
                  const newEngine = { ...engine, typology: t };
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

        {/* Tipos de oración */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Tipo de oración
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CLAUSE_TYPE_LABELS).map(([id, label]) => (
              <button
                key={id}
                onClick={() => handleClauseTypeChange(id as PragmaticClauseTypeId)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  clauseTypeId === id
                    ? 'bg-primary/20 text-white border-primary'
                    : 'bg-surface text-text-secondary border-border-dark hover:border-primary/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Constructor de slots ── */}
      {clauseTypeId && (
        <div className="bg-background rounded-lg p-6 border border-border-dark">
          <h3 className="text-lg font-bold text-white mb-4">
            Constructor — {CLAUSE_TYPE_LABELS[clauseTypeId]}
          </h3>

          {/* Módulos en orden */}
          <div className="space-y-3">
            {moduleOrder.map((bid, idx) => {
              const blk = PRAGMATIC_BLOCKS[bid];
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
                    {blk.allowedFunctions.map((fnId) => {
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
                        if (!slot.functionId) return true;
                        const fn = functions[slot.functionId!];
                        if (!fn) return true;
                        return e.Categoría?.toLowerCase().replace(/\s+/g, '_') === slot.functionId;
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
    </div>
  );
};

GrammarPragmaticPanel.displayName = 'GrammarPragmaticPanel';

export default GrammarPragmaticPanel;
