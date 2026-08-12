/**
 * InterlinearGlossViewer.tsx
 * ----------------------------------------------------------------------------
 * Componente mínimo para visualizar glosado interlineal estilo Leipzig.
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import { glossSentence, formatInterlinear, type InterlinearGloss, type GlossOptions } from '../services/interlinearGlossService';
import type { LexiconData } from '../types';

export interface InterlinearGlossViewerProps {
  lexicon: LexiconData;
  sentence?: string;
  options?: GlossOptions;
}

const InterlinearGlossViewer: React.FC<InterlinearGlossViewerProps> = ({ lexicon, sentence = '', options }) => {
  const [text, setText] = React.useState(sentence);
  const [result, setResult] = React.useState<InterlinearGloss | null>(null);

  const handleAnalyze = () => {
    const gloss = glossSentence(text, lexicon.entries, options);
    setResult(gloss);
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribí una oración para glosar..."
        className="w-full rounded border p-2 text-sm"
        rows={3}
      />
      <button
        type="button"
        onClick={handleAnalyze}
        className="rounded bg-black px-3 py-1.5 text-sm text-white"
      >
        Glosar
      </button>
      {result && (
        <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">
          {formatInterlinear(result, options)}
        </pre>
      )}
    </div>
  );
};

export default InterlinearGlossViewer;
