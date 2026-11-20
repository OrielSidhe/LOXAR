/**
 * LexiconCompareModal.tsx
 * ───────────────────────
 * FASE CMP del gauntlet v3.14: compara el léxico activo contra otro léxico
 * guardado o contra un archivo suelto (JSON/CSV) y fusiona las entradas que
 * falten, todas o una por una.
 *
 * Toda la lógica de comparación vive en `src/utils/lexiconExport.ts`
 * (`compareLexicons`) y la carga de archivos en `src/utils/lexiconCompareFile.ts`;
 * este componente es solo estado de UI + render.
 */
import React, { useMemo, useRef, useState } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import GitMergeIcon from './icons/GitMergeIcon';
import UploadIcon from './icons/UploadIcon';
import CombineIcon from './icons/CombineIcon';
import type { LexiconEntry } from '../types';
import { compareLexicons, type LexiconComparison, type LexiconFieldDiff } from '../utils/lexiconExport';
import { parseLexiconCompareFile } from '../utils/lexiconCompareFile';

type SourceKind = 'lexicon' | 'file';

export interface LexiconCompareModalProps {
  open: boolean;
  onClose: () => void;
  /** Entradas del léxico activo (base de la comparación). */
  baseEntries: LexiconEntry[];
  baseName: string | null;
  /** Nombres de otros léxicos guardados (el activo se excluye). */
  comparisonNames: string[];
  /** Carga las entradas de un léxico guardado. */
  onLoadLexicon: (name: string) => Promise<LexiconEntry[] | null>;
  /** Fusiona entradas en el léxico activo. */
  onMergeEntries: (entries: LexiconEntry[]) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

/** Garantiza IDs únicos y estables para la selección. */
const withUniqueIds = (entries: LexiconEntry[]): LexiconEntry[] =>
  entries.map((entry, index) => ({ ...entry, ID: `cmp-${index + 1}` }));

const entryLabel = (entry: LexiconEntry): string => {
  const lexeme = entry.Léxema?.join(', ') || entry.Raíz || entry.ID;
  return entry.Categoría ? `${lexeme} (${entry.Categoría})` : lexeme;
};

const DiffField: React.FC<{ diff: LexiconFieldDiff }> = ({ diff }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background text-xs">
    <span className="text-text-secondary">{diff.field}:</span>
    <span className="line-through text-text-secondary">{diff.base || '—'}</span>
    <span className="text-accent">{diff.other || '—'}</span>
  </span>
);

const LexiconCompareModal: React.FC<LexiconCompareModalProps> = ({
  open,
  onClose,
  baseEntries,
  baseName,
  comparisonNames,
  onLoadLexicon,
  onMergeEntries,
  showNotification,
}) => {
  const [source, setSource] = useState<SourceKind>('lexicon');
  const [selectedName, setSelectedName] = useState<string>('');
  const [otherEntries, setOtherEntries] = useState<LexiconEntry[] | null>(null);
  const [otherLabel, setOtherLabel] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const comparison: LexiconComparison | null = useMemo(
    () => (otherEntries ? compareLexicons(baseEntries, otherEntries) : null),
    [baseEntries, otherEntries],
  );

  if (!open) return null;

  const resetComparison = () => {
    setOtherEntries(null);
    setOtherLabel('');
    setSelected(new Set());
    setError(null);
  };

  const handleCompareLexicon = async () => {
    if (!selectedName) {
      setError('Elegí un léxico para comparar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const entries = await onLoadLexicon(selectedName);
      if (!entries) {
        setError(`No se pudo cargar el léxico "${selectedName}".`);
        return;
      }
      setOtherEntries(withUniqueIds(entries));
      setOtherLabel(selectedName);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el léxico.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const content = await file.text();
      const entries = await parseLexiconCompareFile(content);
      if (entries.length === 0) {
        setError('El archivo no contiene entradas de léxico.');
        return;
      }
      setOtherEntries(withUniqueIds(entries));
      setOtherLabel(file.name);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const missingInBase = comparison?.missingInBase ?? [];
  const selectedEntries = missingInBase.filter((entry) => selected.has(entry.ID));

  const handleMerge = (entries: LexiconEntry[]) => {
    if (entries.length === 0) {
      showNotification('No hay entradas para añadir.', 'error');
      return;
    }
    onMergeEntries(entries);
    setSelected(new Set());
    showNotification(`${entries.length} entrada(s) añadidas al léxico activo.`, 'success');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-subtle">
        <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <GitMergeIcon className="h-7 w-7 text-accent" />
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Comparar y fusionar léxicos</h2>
              <p className="text-sm text-text-secondary">
                Base: <span className="text-text-primary font-semibold">{baseName || 'léxico activo'}</span>
                {otherLabel ? ` · Comparado con: ${otherLabel}` : ' · Elegí el léxico o archivo a comparar'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
            <XCircleIcon className="h-7 w-7" />
          </button>
        </header>

        <main className="p-6 flex-grow overflow-y-auto space-y-4">
          {!comparison ? (
            <div className="space-y-4">
              <div className="flex gap-2" role="tablist" aria-label="Origen de la comparación">
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'lexicon'}
                  onClick={() => setSource('lexicon')}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    source === 'lexicon' ? 'border-accent text-accent bg-accent/10' : 'border-border-dark text-text-secondary'
                  }`}
                >
                  Léxico guardado
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'file'}
                  onClick={() => setSource('file')}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    source === 'file' ? 'border-accent text-accent bg-accent/10' : 'border-border-dark text-text-secondary'
                  }`}
                >
                  Archivo (JSON/CSV)
                </button>
              </div>

              {source === 'lexicon' ? (
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedName}
                    onChange={(event) => setSelectedName(event.target.value)}
                    className="flex-grow bg-background border border-border-dark rounded-md px-3 py-2 text-text-primary"
                    aria-label="Léxico a comparar"
                  >
                    <option value="">Seleccioná un léxico…</option>
                    {comparisonNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCompareLexicon}
                    disabled={busy}
                    className="px-4 py-2 rounded-md bg-accent text-white disabled:opacity-60"
                  >
                    Comparar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileSelected}
                    className="hidden"
                    aria-label="Archivo de léxico a comparar"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="px-4 py-2 rounded-md bg-background border border-border-dark text-text-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    <UploadIcon className="h-4 w-4" /> Elegir archivo
                  </button>
                  <span className="text-sm text-text-secondary">JSON de backup, JSON de filas o CSV con cabecera.</span>
                </div>
              )}

              {comparisonNames.length === 0 && source === 'lexicon' && (
                <p className="text-sm text-text-secondary">No hay otros léxicos guardados para comparar.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-background text-text-secondary">
                  Solo en la base: <strong className="text-text-primary">{comparison.missingInOther.length}</strong>
                </span>
                <span className="px-2 py-1 rounded bg-background text-text-secondary">
                  Faltantes en la base: <strong className="text-accent">{missingInBase.length}</strong>
                </span>
                <span className="px-2 py-1 rounded bg-background text-text-secondary">
                  Con diferencias: <strong className="text-text-primary">{comparison.changed.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={resetComparison}
                  className="ml-auto px-2 py-1 rounded text-text-secondary hover:text-white"
                >
                  Cambiar origen
                </button>
              </div>

              {missingInBase.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Faltantes en la base ({missingInBase.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMerge(missingInBase)}
                        className="px-3 py-1.5 rounded-md bg-accent text-white text-sm flex items-center gap-1"
                      >
                        <CombineIcon className="h-4 w-4" /> Añadir todas las faltantes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMerge(selectedEntries)}
                        disabled={selectedEntries.length === 0}
                        className="px-3 py-1.5 rounded-md bg-background border border-border-dark text-text-primary text-sm disabled:opacity-60"
                      >
                        Añadir seleccionadas ({selectedEntries.length})
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {missingInBase.map((entry) => (
                      <li key={entry.ID} className="flex items-center gap-2 px-2 py-1.5 rounded bg-background">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.ID)}
                          onChange={() => toggleSelected(entry.ID)}
                          aria-label={`Seleccionar ${entryLabel(entry)}`}
                        />
                        <span className="text-text-primary">{entryLabel(entry)}</span>
                        {entry.Significado?.length ? (
                          <span className="text-text-secondary text-sm">{entry.Significado.join(', ')}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {comparison.changed.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Diferencias campo a campo ({comparison.changed.length})
                  </h3>
                  <ul className="space-y-1">
                    {comparison.changed.map((item) => (
                      <li key={item.entry.ID} className="px-2 py-1.5 rounded bg-background">
                        <div className="text-text-primary font-semibold">{entryLabel(item.entry)}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.diffs.map((diff) => (
                            <DiffField key={diff.field} diff={diff} />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {comparison.missingInOther.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Solo en la base ({comparison.missingInOther.length})
                  </h3>
                  <ul className="space-y-1">
                    {comparison.missingInOther.map((entry) => (
                      <li key={entry.ID} className="px-2 py-1.5 rounded bg-background text-text-secondary">
                        {entryLabel(entry)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {missingInBase.length === 0 && comparison.changed.length === 0 && comparison.missingInOther.length === 0 && (
                <p className="text-sm text-text-secondary">Los dos léxicos son idénticos.</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {busy && <p className="text-sm text-text-secondary">Cargando…</p>}
        </main>
      </div>
    </div>
  );
};

LexiconCompareModal.displayName = 'LexiconCompareModal';

export default LexiconCompareModal;
