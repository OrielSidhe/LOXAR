/**
 * LexiconAuditPanel.tsx
 * ══════════════════════
 * Vista previa del flujo de generación → asignación semántica → auditoría.
 *
 * Presenta al usuario las palabras generadas con sus asignaciones
 * semánticas pre-determinadas. El usuario puede:
 *   - Editar la asignación de cada palabra
 *   - Aprobar todo el pool
 *   - Rechazar palabras individuales
 *   - Volver a editar si no está conforme
 *
 * Solo tras la aprobación, las palabras se guardan en el léxico principal.
 */

import React, { useState } from 'react';
import type { AssignedWord, CoreLexiconEntry } from '../types/coreLexicon';

interface LexiconAuditPanelProps {
  /** Pool de palabras con asignaciones */
  assignedPool: AssignedWord[];
  /** Callback: aprobar todo el pool */
  onApprove: (approved: AssignedWord[]) => void;
  /** Callback: editar una asignación */
  onEdit: (index: number, edits: Partial<AssignedWord>) => void;
  /** Callback: rechazar una palabra */
  onReject: (index: number) => void;
  /** Callback: volver al workbench */
  onBack: () => void;
  /** Conceptos disponibles para el selector de categoría */
  coreLexicon?: CoreLexiconEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Naturaleza': '#22c55e',
  'Elementos': '#3b82f6',
  'Anatomía': '#ef4444',
  'Verbs of Motion': '#f59e0b',
  'Verbs of Perception': '#8b5cf6',
  'Verbs of Communication': '#06b6d4',
  'Verbs of Thinking': '#ec4899',
  'Verbs of Emotion': '#f43f5e',
  'Verbs of State': '#6366f1',
  'Adjetivos de Calidad': '#14b8a6',
  'Cantidad y Número': '#84cc16',
  'Tiempo': '#64748b',
  'Lugar y Dirección': '#a855f7',
  'Personas y Roles': '#e11d48',
  'Objetos Cotidianos': '#0ea5e9',
};

export const LexiconAuditPanel: React.FC<LexiconAuditPanelProps> = ({
  assignedPool,
  onApprove,
  onEdit,
  onReject,
  onBack,
  coreLexicon = [],
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editableConcept, setEditableConcept] = useState('');
  const [editableCategory, setEditableCategory] = useState('');

  const pendingCount = assignedPool.filter(a => a.status === 'pending').length;
  const approvedCount = assignedPool.filter(a => a.status === 'approved').length;
  const rejectedCount = assignedPool.filter(a => a.status === 'rejected').length;

  const handleEditStart = (index: number) => {
    const word = assignedPool[index];
    setEditingIndex(index);
    setEditableConcept(word.concept);
    setEditableCategory(word.category);
  };

  const handleEditSave = (index: number) => {
    onEdit(index, {
      concept: editableConcept,
      category: editableCategory as any,
    });
    setEditingIndex(null);
  };

  const handleApproveAll = () => {
    const approved = assignedPool.map(a => ({ ...a, status: 'approved' as const }));
    onApprove(approved);
  };

  const handleRejectAll = () => {
    assignedPool.forEach((_, i) => onReject(i));
  };

  // Campos semánticos únicos cubiertos
  const fieldsCovered = [...new Set(assignedPool.map(a => a.semanticField).filter(Boolean))];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">
            📋 Auditoría de Pool Generado
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">
              ⏳ {pendingCount} pendientes
            </span>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
              ✅ {approvedCount} aprobadas
            </span>
            <span className="px-2 py-1 rounded bg-red-500/20 text-red-300">
              ❌ {rejectedCount} rechazadas
            </span>
          </div>
        </div>
        <p className="text-text-secondary text-sm">
          Se generaron {assignedPool.length} palabras con el perfil fonológico actual.
          El sistema las asignó inteligentemente a {coreLexicon.length} conceptos del
          Extended Core Lexicon. Por favor, revisa, edita y aprueba.
        </p>
        {fieldsCovered.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {fieldsCovered.slice(0, 6).map(field => (
              <span key={field} className="px-2 py-0.5 rounded text-[10px] bg-surface text-text-secondary border border-white/10">
                {field}
              </span>
            ))}
            {fieldsCovered.length > 6 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-surface text-text-secondary border border-white/10">
                +{fieldsCovered.length - 6} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabla de asignaciones */}
      <div className="bg-background rounded-lg border border-border-dark overflow-hidden">
        {/* Header de tabla */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface/50 border-b border-border-dark text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          <div className="col-span-1">Estado</div>
          <div className="col-span-3">Forma</div>
          <div className="col-span-3">Concepto</div>
          <div className="col-span-2">Categoría</div>
          <div className="col-span-3">Campo Semántico</div>
        </div>

        {/* Filas */}
        <div className="max-h-96 overflow-y-auto">
          {assignedPool.map((word, idx) => (
            <div
              key={`${word.form}-${idx}`}
              className={`grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 items-center hover:bg-white/5 transition-colors ${
                word.status === 'rejected' ? 'opacity-40' : ''
              }`}
            >
              {/* Estado */}
              <div className="col-span-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                  word.status === 'pending'
                    ? 'bg-amber-500/20 text-amber-300'
                    : word.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                }`}>
                  {word.status === 'pending' && '⏳'}
                  {word.status === 'approved' && '✅'}
                  {word.status === 'rejected' && '❌'}
                </span>
              </div>

              {/* Forma */}
              <div className="col-span-3">
                <span className="text-white font-mono text-sm">{word.form}</span>
              </div>

              {/* Concepto */}
              <div className="col-span-3">
                {editingIndex === idx ? (
                  <input
                    type="text"
                    value={editableConcept}
                    onChange={(e) => setEditableConcept(e.target.value)}
                    className="w-full bg-surface border border-border-dark rounded px-2 py-1 text-sm text-white focus:border-accent outline-none"
                  />
                ) : (
                  <span className="text-text-secondary text-sm">{word.concept || '—'}</span>
                )}
              </div>

              {/* Categoría */}
              <div className="col-span-2">
                {editingIndex === idx ? (
                  <select
                    value={editableCategory}
                    onChange={(e) => setEditableCategory(e.target.value)}
                    className="w-full bg-surface border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-accent outline-none"
                  >
                    {Object.entries(CATEGORY_COLORS).map(([cat]) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                    backgroundColor: `${CATEGORY_COLORS[word.category] ?? '#666'}20`,
                    color: CATEGORY_COLORS[word.category] ?? '#666',
                  }}>
                    {word.category}
                  </span>
                )}
              </div>

              {/* Campo Semántico */}
              <div className="col-span-3">
                <span className="text-[10px] text-text-secondary">{word.semanticField}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-white/10 text-white transition-colors border border-white/10"
        >
          <span>↩️</span><span className="text-sm">Volver al Workbench</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRejectAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors text-sm"
          >
            ❌ Rechazar Todo
          </button>
          <button
            onClick={handleApproveAll}
            disabled={pendingCount === 0}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ Aprobar Todas ({pendingCount})
          </button>
        </div>
      </div>
    </div>
  );
};

LexiconAuditPanel.displayName = 'LexiconAuditPanel';

export default LexiconAuditPanel;
