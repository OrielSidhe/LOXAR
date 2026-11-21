import React from 'react';
import InfoHint from './InfoHint';
import ImportReport from './ImportReport';
import type { GrammarManifest } from '../types';
import type { ImportValidationReport } from '../services/grammar/declarativeFormat';

export interface GrammarOverviewProps {
  overallProgress: number;
  metrics: { category: string; completed: number; total: number; items: string[] }[];
  rolesCount: number;
  strategiesCount: number;
  lastUpdated?: string;
  importReport?: ImportValidationReport | null;
  /** FASE FLU (gauntlet v3.14): manifiesto "first run" (sin fonología ni tipología). */
  isFirstRun?: boolean;
  /** FASE FLU: abre el asistente de gramática bajo demanda (ya no es un modal forzado). */
  onOpenWizard?: () => void;
}

const GrammarOverview = ({
  overallProgress,
  metrics,
  rolesCount,
  strategiesCount,
  lastUpdated,
  importReport,
  isFirstRun = false,
  onOpenWizard,
}: GrammarOverviewProps) => {
  return (
    <div className="space-y-6">
      {isFirstRun && (
        <div
          data-testid="grammar-first-run-banner"
          className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1">Empieza por el léxico</h3>
            <p className="text-sm text-text-secondary">
              La fonología y la morfología no se definen antes de tener datos: se extraen del
              léxico. Carga entradas y usa "Extraer del léxico" en esos módulos; el asistente de
              perfil es opcional.
            </p>
          </div>
          {onOpenWizard && (
            <button
              type="button"
              onClick={onOpenWizard}
              className="self-start sm:self-auto px-4 py-2 bg-primary text-background-dark text-sm font-semibold rounded-md hover:bg-primary-dark transition-colors"
            >
              Abrir asistente de gramática
            </button>
          )}
        </div>
      )}

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-xl font-bold text-white mb-4">Progreso General</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 bg-surface rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-white">{overallProgress}%</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(metric => (
            <div key={metric.category} className="bg-surface rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-text-primary">{metric.category}</span>
                <span className="text-xs text-text-secondary">{metric.completed}/{metric.total}</span>
              </div>
              <div className="bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(metric.completed / metric.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-xl font-bold text-white mb-4">
          Resumen
          <InfoHint text="El resumen es un vistazo general al progreso de la gramática de tu conlang: cuántas piezas (roles, estrategias, paradigmas) ya definiste. No es un área para escribir, solo te muestra dónde vas." />
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Roles definidos:</span>
            <span className="text-white font-semibold">{rolesCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Estrategias definidas:</span>
            <span className="text-white font-semibold">{strategiesCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Última actualización:</span>
            <span className="text-white font-semibold">
              {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Nunca'}
            </span>
          </div>
        </div>
      </div>

      {importReport && (
        <div className="bg-background rounded-lg p-6 border border-border-dark">
          <h3 className="text-xl font-bold text-white mb-2">Reporte de validación</h3>
          <ImportReport report={importReport} />
        </div>
      )}
    </div>
  );
};

GrammarOverview.displayName = 'GrammarOverview';

export default GrammarOverview;
