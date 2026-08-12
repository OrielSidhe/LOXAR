import React, { useMemo } from 'react';
import { lintPhonotactics } from '../services/phonology/linter';
import type { PhonologyConfig } from '../types';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface PhonotacticLinterFeedbackProps {
  text: string;
  consonants: string[];
  vowels: string[];
  syllableStructures: string[];
  consonantClusters?: string[];
}

const PhonotacticLinterFeedback: React.FC<PhonotacticLinterFeedbackProps> = ({
  text,
  consonants,
  vowels,
  syllableStructures,
  consonantClusters = [],
}) => {
  const issues = useMemo(() => {
    if (!text || consonants.length === 0 || vowels.length === 0) return [];
    
    const config: PhonologyConfig = {
      inventory: { consonants, vowels },
      phonotactics: {
        syllableStructures,
        maxConsonantClusters: Math.max(2, ...consonantClusters.map(c => c.length), 2),
        consonantClusters: consonantClusters.length > 0 ? consonantClusters : undefined,
      },
    };
    
    const words = text.split(/\s+/).filter(Boolean);
    const allIssues: { word: string; issues: ReturnType<typeof lintPhonotactics> }[] = [];
    
    for (const word of words) {
      const wordIssues = lintPhonotactics(word, config);
      if (wordIssues.length > 0) {
        allIssues.push({ word, issues: wordIssues });
      }
    }
    
    return allIssues;
  }, [text, consonants, vowels, syllableStructures, consonantClusters]);

  if (!text) return null;

  if (issues.length === 0) {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-start gap-2">
        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800 dark:text-green-200">
          <strong className="font-semibold">Phonotactics OK:</strong> All words match your phonology constraints.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
          Phonotactic issues found ({issues.length} word{issues.length > 1 ? 's' : ''}):
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {issues.map(({ word, issues: wordIssues }) => (
          <li key={word} className="border-l-2 border-yellow-300 dark:border-yellow-700 pl-3">
            <span className="font-mono font-semibold text-yellow-900 dark:text-yellow-100">{word}</span>
            <ul className="mt-1 space-y-1">
              {wordIssues.map((issue, i) => (
                <li key={i} className={issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-300'}>
                  <span className="font-medium">{issue.severity === 'error' ? '✕' : '⚠'}</span> {issue.msg}
                  {issue.suggestion && <span className="text-gray-500 dark:text-gray-400"> — {issue.suggestion}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PhonotacticLinterFeedback;
