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
}

const GrammarOverview = ({
  overallProgress,
  metrics,
  rolesCount,
  strategiesCount,
  lastUpdated,
  importReport,
}: GrammarOverviewProps) => {
  return (
    <div className="space-y-6">
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
