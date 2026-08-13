/**
 * SoundChangeWorkbench.tsx
 * ----------------------------------------------------------------------------
 * Workbench productivo para definir, probar y aplicar sound changes.
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import {
  applyRulesToText,
  previewSoundChange,
  applySoundChangesToLexicon,
  createSnapshot,
  canUndo,
  canRedo,
  undo as soundUndo,
  redo as soundRedo,
  type SoundChangeRule,
  type SoundChangeBatchResult,
  type SoundChangeHistory,
} from '../services/soundChanger';
import type { LexiconData, LexiconEntry } from '../types';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';

export interface SoundChangeWorkbenchProps {
  lexicon: LexiconData;
  onApplyBatch?: (entries: LexiconEntry[], result: SoundChangeBatchResult) => void;
}

const PRESET_RULES: SoundChangeRule[] = [
  { id: 'preset-1', name: 'Aspiración', find: 'p', replace: 'ph', scope: 'lexeme' },
  { id: 'preset-2', name: 'Lenición sorda', find: 't', replace: 'd', scope: 'root' },
  { id: 'preset-3', name: 'Degeminación', find: 'bb', replace: 'b', scope: 'lexeme' },
  { id: 'preset-4', name: 'Prenasalización', find: 'mb', replace: 'mb', scope: 'lexeme', environment: '_' },
];

const SoundChangeWorkbench: React.FC<SoundChangeWorkbenchProps> = ({ lexicon, onApplyBatch }) => {
  const [rules, setRules] = React.useState<SoundChangeRule[]>(PRESET_RULES);
  const [text, setText] = React.useState('pata');
  const [preview, setPreview] = React.useState('');
  const [history, setHistory] = React.useState<SoundChangeHistory>({
    snapshots: [createSnapshot(lexicon.entries, 'lexicon')],
    cursor: 0,
  });
  const [lastBatchResult, setLastBatchResult] = React.useState<SoundChangeBatchResult | null>(null);
  const [environmentDraft, setEnvironmentDraft] = React.useState<Record<string, string>>({});

  const currentSnapshot = history.snapshots[history.cursor] ?? history.snapshots[0];

  const handlePreview = () => {
    const next = previewSoundChange(text, rules);
    setPreview(next);
  };

  const handleCopy = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
    alert('Resultado copiado al portapapeles');
  };

  const handleDownload = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sound-change-result.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyToLexicon = () => {
    const result = applySoundChangesToLexicon(currentSnapshot.entries, rules);
    const nextSnapshot = createSnapshot(result.entries, currentSnapshot.name);
    const newSnapshots = history.snapshots.slice(0, history.cursor + 1);
    const trimmed = [...newSnapshots, nextSnapshot].slice(-20);
    const nextHistory: SoundChangeHistory = {
      snapshots: trimmed,
      cursor: trimmed.length - 1,
    };

    setHistory(nextHistory);
    setLastBatchResult(result);
    onApplyBatch?.(result.entries, result);
  };

  const handleUndo = () => {
    const next = soundUndo(history);
    if (next) setHistory(next);
  };

  const handleRedo = () => {
    const next = soundRedo(history);
    if (next) setHistory(next);
  };

  const handleResetExample = () => {
    setRules(PRESET_RULES);
    setText('pata');
    setPreview('');
    setEnvironmentDraft({});
  };

  const handleAddPreset = (rule: SoundChangeRule) => {
    const exists = rules.some((r) => r.id === rule.id);
    if (!exists) setRules((r) => [...r, rule]);
  };

  const updateRule = (id: string, patch: Partial<SoundChangeRule>) => {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeRule = (id: string) => {
    setRules((r) => r.filter((x) => x.id !== id));
  };

  if (!lexicon?.entries?.length) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary">Sound Change Workbench</h3>
        <p className="text-sm text-text-secondary">Seleccioná o creá un léxico primero para usar esta herramienta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Reglas</label>
          {rules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-2 rounded border p-1.5 text-xs bg-background"
                value={rule.find}
                onChange={(e) => updateRule(rule.id, { find: e.target.value })}
                placeholder="Buscar"
              />
              <input
                className="col-span-2 rounded border p-1.5 text-xs bg-background"
                value={rule.replace}
                onChange={(e) => updateRule(rule.id, { replace: e.target.value })}
                placeholder="Reemplazar"
              />
              <input
                className="col-span-3 rounded border p-1.5 text-xs bg-background"
                value={environmentDraft[rule.id] ?? rule.environment ?? ''}
                onChange={(e) => {
                  setEnvironmentDraft((prev) => ({ ...prev, [rule.id]: e.target.value }));
                  updateRule(rule.id, { environment: e.target.value });
                }}
                placeholder="Entorno (_a = después de a)"
              />
              <select
                className="col-span-2 rounded border p-1.5 text-xs bg-background"
                value={rule.scope || 'lexeme'}
                onChange={(e) => updateRule(rule.id, { scope: e.target.value as 'lexeme' | 'root' })}
              >
                <option value="lexeme">Léxema</option>
                <option value="root">Raíz</option>
              </select>
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="col-span-1 rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
              >
                X
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRules((r) => [...r, { id: Date.now().toString(), name: '', find: '', replace: '', scope: 'lexeme' }])}
            className="rounded border border-dashed border-text-secondary/40 px-3 py-1.5 text-xs text-text-secondary hover:text-white"
          >
            + Agregar regla
          </button>

          <div className="flex items-center gap-2 pt-1">
            <select
              className="rounded border p-1.5 text-xs bg-background"
              defaultValue=""
              onChange={(e) => {
                const preset = PRESET_RULES.find((p) => p.id === e.target.value);
                if (preset) handleAddPreset(preset);
                e.target.value = '';
              }}
            >
              <option value="" disabled>
                Presets
              </option>
              {PRESET_RULES.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyToLexicon}
              className="rounded bg-accent px-3 py-1.5 text-xs font-bold text-white"
              aria-label="Aplicar reglas al léxico"
            >
              Aplicar al léxico
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo(history)}
              className="rounded border border-subtle p-1.5 text-text-secondary disabled:opacity-40"
              aria-label="Deshacer"
            >
              <UndoIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo(history)}
              className="rounded border border-subtle p-1.5 text-text-secondary disabled:opacity-40"
              aria-label="Rehacer"
            >
              <RedoIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Entrada</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded border p-2 text-sm bg-background"
            rows={6}
            placeholder="Escribí texto o pegá lexemas..."
          />
          <button
            type="button"
            onClick={handlePreview}
            className="w-full rounded bg-black px-3 py-1.5 text-sm text-white"
            aria-label="Previsualizar cambios de sonido"
          >
            Previsualizar
          </button>
          <button
            type="button"
            onClick={handleResetExample}
            className="w-full rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
            aria-label="Volver al ejemplo"
          >
            Volver al ejemplo
          </button>
          {preview && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
                aria-label="Copiar resultado"
              >
                <ClipboardIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
                aria-label="Descargar resultado"
              >
                <DownloadIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {lastBatchResult && (
        <div className="rounded border bg-gray-50 p-3 text-xs space-y-1">
          <p className="font-bold">Resultado del lote</p>
          <p>Entradas modificadas: {lastBatchResult.changedEntryIds.length}</p>
          <p>Cambios aplicados: {lastBatchResult.results.length}</p>
          <p className="text-text-secondary italic">
            Historial: {history.cursor + 1}/{history.snapshots.length} · Undo:{' '}
            {canUndo(history) ? 'sí' : 'no'} · Redo: {canRedo(history) ? 'sí' : 'no'}
          </p>
        </div>
      )}

      {preview && (
        <div className="rounded border bg-gray-50 p-3 text-xs whitespace-pre-wrap">{preview}</div>
      )}
    </div>
  );
};

export default SoundChangeWorkbench;
