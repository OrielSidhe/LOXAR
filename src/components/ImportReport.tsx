import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import InfoIcon from './icons/InfoIcon';
import XCircleIcon from './icons/XCircleIcon';

export interface ImportValidationReport {
  ok: boolean;
  score: number;
  sections: Record<string, 'ok' | 'partial' | 'empty' | 'unparsed' | 'missing'>;
  problems: Array<{ severity: 'error' | 'warning' | 'info'; location: string; message: string; fix?: string }>;
  suggestions: string[];
}

interface ImportReportProps {
  report: ImportValidationReport;
}

const SectionBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    ok: 'bg-success/15 text-success',
    partial: 'bg-warning/15 text-warning',
    empty: 'bg-danger/15 text-danger',
    unparsed: 'bg-danger/15 text-danger',
    missing: 'bg-danger/15 text-danger',
  };
  const label: Record<string, string> = {
    ok: 'OK',
    partial: 'Parcial',
    empty: 'Vacío',
    unparsed: 'No parseado',
    missing: 'Falta',
  };
  return <span className={`text-xs font-semibold px-2 py-1 rounded ${map[status] || 'bg-surface text-text-secondary'}`}>{label[status] || status}</span>;
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === 'error') return <XCircleIcon className="h-4 w-4 text-danger" />;
  if (severity === 'warning') return <AlertTriangleIcon className="h-4 w-4 text-warning" />;
  return <InfoIcon className="h-4 w-4 text-primary" />;
};

const ImportReport = ({ report }: ImportReportProps) => {
  const severityColor: Record<string, string> = {
    error: 'border-danger/40 bg-danger/5',
    warning: 'border-warning/40 bg-warning/5',
    info: 'border-primary/40 bg-primary/5',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`text-xs font-semibold px-2 py-1 rounded ${report.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
          {report.ok ? 'Importación válida' : 'Importación con problemas'}
        </div>
        <div className="text-2xl font-bold font-mono text-white">{report.score}/100</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(report.sections).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between bg-surface rounded-md border border-subtle px-3 py-2">
            <span className="text-xs text-text-secondary capitalize">{key}</span>
            <SectionBadge status={value} />
          </div>
        ))}
      </div>

      {report.problems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Problemas detectados</h4>
          <div className="space-y-2">
            {report.problems.map((problem, idx) => (
              <div key={idx} className={`rounded-md border p-3 ${severityColor[problem.severity] || 'border-subtle bg-surface'}`}>
                <div className="flex items-start gap-2">
                  <SeverityIcon severity={problem.severity} />
                  <div>
                    <div className="text-sm text-white font-medium">{problem.message}</div>
                    <div className="text-xs text-text-secondary">{problem.location}</div>
                    {problem.fix && <div className="text-xs text-text-secondary mt-1">Sugerencia: {problem.fix}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Sugerencias</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            {report.suggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImportReport;
