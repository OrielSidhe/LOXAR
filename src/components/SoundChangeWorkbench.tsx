/**
 * SoundChangeWorkbench.tsx
 * ----------------------------------------------------------------------------
 * Workbench para definir y aplicar sound changes a Léxemas/Raíces.
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { applyRulesToText, previewSoundChange, type SoundChangeRule } from '../services/soundChanger';
import type { LexiconData } from '../types';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';

export interface SoundChangeWorkbenchProps {
  lexicon: LexiconData;
}

const SoundChangeWorkbench: React.FC<SoundChangeWorkbenchProps> = ({ lexicon }) => {
  const [rules, setRules] = React.useState<SoundChangeRule[]>([
    { id: '1', name: 'Aspiración', find: 'p', replace: 'ph', scope: 'lexeme' },
    { id: '2', name: 'Lenición', find: 't', replace: 'd', scope: 'root' },
  ]);
  const [text, setText] = React.useState('pata');
  const [preview, setPreview] = React.useState('');

  const handleApply = () => {
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

  const handleResetExample = () => {
    setRules([
      { id: '1', name: 'Aspiración', find: 'p', replace: 'ph', scope: 'lexeme' },
      { id: '2', name: 'Lenición', find: 't', replace: 'd', scope: 'root' },
    ]);
    setText('pata');
    setPreview('');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Reglas</label>
          {rules.map((rule, idx) => (
            <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-3 rounded border p-1.5 text-xs bg-background"
                value={rule.find}
                onChange={(e) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, find: e.target.value } : x)))}
                placeholder="Buscar"
              />
              <input
                className="col-span-3 rounded border p-1.5 text-xs bg-background"
                value={rule.replace}
                onChange={(e) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, replace: e.target.value } : x)))}
                placeholder="Reemplazar"
              />
              <select
                className="col-span-3 rounded border p-1.5 text-xs bg-background"
                value={rule.scope || 'lexeme'}
                onChange={(e) => setRules((r) => r.map((x, i) => (i === idx ? { ...x, scope: e.target.value as 'lexeme' | 'root' } : x)))}
              >
                <option value="lexeme">Léxema</option>
                <option value="root">Raíz</option>
              </select>
              <button
                type="button"
                onClick={() => setRules((r) => r.filter((_, i) => i !== idx))}
                className="col-span-2 rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
              >
                Quitar
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
            onClick={handleApply}
            className="w-full rounded bg-black px-3 py-1.5 text-sm text-white"
          >
            Aplicar cambios
          </button>
          <button
            type="button"
            onClick={handleResetExample}
            className="w-full rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
          >
            Volver al ejemplo
          </button>
          {preview && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
                title="Copiar resultado"
              >
                <ClipboardIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded border border-subtle px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:border-accent transition-colors"
                title="Descargar resultado"
              >
                <DownloadIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {preview && (
        <div className="rounded border bg-gray-50 p-3 text-xs whitespace-pre-wrap">
          {preview}
        </div>
      )}
    </div>
  );
};

export default SoundChangeWorkbench;
