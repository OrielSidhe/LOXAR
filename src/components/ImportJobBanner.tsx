import React from 'react';
import { useImportStore } from '../stores/importStore';

/**
 * ImportJobBanner — Fase J3 del Gauntlet v3.12.
 *
 * Banner de la pantalla principal con el estado del trabajo de inducción de
 * gramática. Data-driven desde `useImportStore`; se oculta cuando no hay job
 * activo (null o idle). El botón Cancelar invoca `cancelJob` (dueño único del
 * AbortController del job) y ambos botones desaparecen en estados terminales.
 */
const ImportJobBanner: React.FC = () => {
    const job = useImportStore(state => state.job);
    const cancelJob = useImportStore(state => state.cancelJob);
    const clearJob = useImportStore(state => state.clearJob);

    if (!job || job.status === 'idle') return null;

    const running = job.status === 'running';
    const failedCount = job.chunks.filter(c => c.status === 'failed').length;
    const doneCount = job.chunks.filter(c => c.status === 'success').length;
    const totalChunks = job.totalChunks || job.chunks.length;

    const titleByStatus: Record<string, string> = {
        running: 'Analizando gramática',
        done: 'Análisis completado',
        cancelled: 'Análisis cancelado',
        error: 'Error en el análisis',
    };
    const title = titleByStatus[job.status] ?? 'Trabajo de gramática';

    const tone =
        job.status === 'error'
            ? 'border-danger/40 bg-danger/10 text-danger'
            : job.status === 'cancelled'
                ? 'border-warning/40 bg-warning/10 text-warning'
                : job.status === 'done'
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-accent/40 bg-accent/10 text-accent';

    return (
        <div
            className={`mx-4 mt-2 rounded-md border p-3 shadow-sm flex items-center gap-3 ${tone}`}
            role="status"
            aria-live="polite"
            aria-label={title}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{title}</span>
                    {running && job.progress && job.progress.total > 0 && (
                        <span className="text-xs font-mono">chunk {job.progress.chunk}/{job.progress.total}</span>
                    )}
                    {totalChunks > 0 && (
                        <span className="text-xs opacity-80">
                            · {doneCount} completados{failedCount > 0 ? ` · ${failedCount} fallidos` : ''}
                        </span>
                    )}
                </div>
                {running && job.progress?.message && (
                    <p className="text-xs opacity-80 truncate">{job.progress.message}</p>
                )}
                {job.status === 'error' && job.error && (
                    <p className="text-xs opacity-80 truncate">{job.error}</p>
                )}
            </div>

            {running && (
                <button
                    type="button"
                    onClick={cancelJob}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-danger text-white hover:opacity-90 transition-opacity"
                    aria-label="Cancelar análisis de gramática"
                >
                    Cancelar
                </button>
            )}
            {!running && (
                <button
                    type="button"
                    onClick={clearJob}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-subtle text-text-secondary hover:bg-background transition-colors"
                    aria-label="Cerrar aviso de análisis"
                >
                    Cerrar
                </button>
            )}
        </div>
    );
};

ImportJobBanner.displayName = 'ImportJobBanner';

export default ImportJobBanner;
