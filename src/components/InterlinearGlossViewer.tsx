/**
 * InterlinearGlossViewer.tsx
 * ----------------------------------------------------------------------------
 * Componente mínimo para visualizar glosado interlineal estilo Leipzig.
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { glossSentence, formatInterlinear, type InterlinearGloss, type GlossOptions } from '../services/interlinearGlossService';
import type { LexiconData } from '../types';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';

export interface InterlinearGlossViewerProps {
  lexicon: LexiconData;
  sentence?: string;
  options?: GlossOptions;
}

const InterlinearGlossViewer: React.FC<InterlinearGlossViewerProps> = ({ lexicon, sentence = '', options }) => {
  const [text, setText] = React.useState(sentence || 'El gato come pescado');
  const [result, setResult] = React.useState<InterlinearGloss | null>(null);

  if (!lexicon?.entries?.length) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-text-primary">Glosado Interlineal</h3>
        <p className="text-sm text-text-secondary">Seleccioná o creá un léxico primero para usar esta herramienta.</p>
      </div>
    );
  }

  const handleAnalyze = () => {
    const gloss = glossSentence(text, lexicon.entries, options);
    setResult(gloss);
  };

  const handleCopy = async () => {
    if (!result) return;
    const formatted = formatInterlinear(result, options);
    await navigator.clipboard.writeText(formatted);
    alert('Glosado copiado al portapapeles');
  };

  const handleDownload = () => {
    if (!result) return;
    const formatted = formatInterlinear(result, options);
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glosado-interlineal.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetExample = () => {
    setText('El gato come pescado');
    setResult(null);
  };

  React.useEffect(() => {
    if (!sentence && !result) {
      handleAnalyze();
    }
  }, []);

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribí una oración para glosar..."
        className="w-full rounded border p-2 text-sm"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
          aria-label="Analizar oración"
        >
          Glosar
        </button>
        <button
          type="button"
          onClick={handleResetExample}
          className="rounded border border-subtle px-3 py-1.5 text-sm text-text-secondary hover:text-white hover:border-accent transition-colors"
          title="Volver al ejemplo"
          aria-label="Volver al ejemplo"
        >
          Volver al ejemplo
        </button>
        {result && (
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-subtle px-3 py-1.5 text-sm text-text-secondary hover:text-white hover:border-accent transition-colors"
              title="Copiar glosado"
              aria-label="Copiar glosado"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded border border-subtle px-3 py-1.5 text-sm text-text-secondary hover:text-white hover:border-accent transition-colors"
              title="Descargar glosado"
              aria-label="Descargar glosado"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {result && (
        <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">
          {formatInterlinear(result, options)}
        </pre>
      )}
    </div>
  );
};

export default InterlinearGlossViewer;
