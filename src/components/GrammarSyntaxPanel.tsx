import React from 'react';
import type { GrammarManifest, LexiconEntry } from '../types';
import InfoHint from './InfoHint';
import ASTEditor from './ASTEditor';
import { buildClauseAST, validatePhonology } from '../services/grammar';
import { realizeEditedTree } from '../services/grammar/ast-view';
import { getEntryLabel, getDefaultPreviewEntries, buildPreviewSentence } from '../utils/grammarPreview';

export interface GrammarSyntaxPanelProps {
  effectiveManifest: GrammarManifest;
  lexicon: LexiconEntry[];
  syntaxSubTab: 'canvas' | 'ast' | 'preview';
  editableAst: any;
  preview: {
    sentence: string;
    gloss: string;
    entries: { subject: LexiconEntry; verb: LexiconEntry; object: LexiconEntry };
    violations: string[];
    diagram: any;
  };
  onSetSyntaxSubTab: (tab: 'canvas' | 'ast' | 'preview') => void;
  onSetEditableAst: (ast: any) => void;
  onUpdateManifest: (updates: Partial<GrammarManifest>) => void;
  onUpdatePreview: (updates: Partial<NonNullable<GrammarManifest['preview']>>) => void;
}

const GrammarSyntaxPanel = ({
  effectiveManifest,
  lexicon,
  syntaxSubTab,
  editableAst,
  preview,
  onSetSyntaxSubTab,
  onSetEditableAst,
  onUpdateManifest,
  onUpdatePreview,
}: GrammarSyntaxPanelProps) => {
  const entryOptions = lexicon.slice(0, 300);

  const regenerateTree = () => {
    onUpdateManifest({
      clauseTree: buildClauseAST([
        { role: 'subject', lexeme: preview.entries.subject, features: {} },
        { role: 'verb', lexeme: preview.entries.verb, features: {} },
        { role: 'object', lexeme: preview.entries.object, features: {} },
      ].filter((p) => p.lexeme) as any),
    });
  };

  return (
    <div className="flex flex-col h-full gap-0">
      <h3 className="text-xl font-bold text-white mb-4">
        Sintaxis
        <InfoHint text="La sintaxis es el orden y la estructura de las palabras en una frase (quién hace qué a quién). El Árbol AST muestra la estructura jerárquica de la oración y el 'Preview Rápido' muestra cómo tu idioma ordena Sujeto-Verbo-Objeto." />
      </h3>
      <div className="flex gap-1 mb-4 p-1 bg-surface rounded-xl border border-border-dark w-fit">
        <button
          onClick={() => onSetSyntaxSubTab('ast')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${syntaxSubTab === 'ast' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-white'}`}
        >
          🌳 Árbol AST
        </button>
        <button
          onClick={() => onSetSyntaxSubTab('preview')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${syntaxSubTab === 'preview' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-white'}`}
        >
          ▶ Preview Rápido
        </button>
        <button
          onClick={regenerateTree}
          title="Reconstruye el árbol AST desde tu gramática (tipología + paradigmas + léxico del preview)"
          className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
        >
          ↻ Regenerar árbol desde gramática
        </button>
      </div>

      {syntaxSubTab === 'ast' && editableAst && (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          <div className="text-xs uppercase tracking-widest text-text-secondary">
            Árbol AST editable — arrastra los nodos, selecciona para añadir/hijos/borrar, rueda para zoom
          </div>
          <div className="flex-1 min-h-0 bg-surface rounded-lg border border-border-dark p-2" style={{ minHeight: 260, position: 'relative' }}>
            <ASTEditor
              ast={editableAst}
              onChange={onSetEditableAst}
              onInspect={(id) => console.log('inspect AST node', id)}
            />
          </div>
          {(() => {
            const sentence = realizeEditedTree(editableAst, effectiveManifest);
            const violations = sentence
              ? validatePhonology(sentence.replace(/ /g, ''), effectiveManifest.phonology)
              : [];
            return (
              <div className="bg-background rounded-lg p-4 border border-primary/30">
                <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">Oración del árbol editado</div>
                <div className="text-2xl font-bold text-white font-display break-words">{sentence || '(vacío)'}</div>
                {violations.length > 0 && (
                  <div className="mt-2 text-xs text-danger space-y-1">
                    {violations.map((v: string, i: number) => (
                      <div key={i}>⚠ {v}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {syntaxSubTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-background rounded-lg p-6 border border-border-dark space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Preview Autónomo</h3>
              <p className="text-sm text-text-secondary mt-1">La vista previa se calcula localmente desde tu léxico y reglas. No llama a IA.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { key: 'subjectEntryId' as const, label: 'Sujeto', entry: preview.entries.subject },
                { key: 'verbEntryId' as const, label: 'Verbo', entry: preview.entries.verb },
                { key: 'objectEntryId' as const, label: 'Objeto', entry: preview.entries.object },
              ].map(({ key, label, entry }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">{label}</label>
                  <select
                    value={effectiveManifest.preview?.[key] || entry?.ID || ''}
                    onChange={(e) => onUpdatePreview({ [key]: e.target.value || undefined })}
                    className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">Auto</option>
                    {entryOptions.map((option) => (
                      <option key={option.ID} value={option.ID}>
                        {getEntryLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="bg-surface rounded-lg p-5 border border-primary/30">
              <div className="text-xs uppercase tracking-widest text-text-secondary mb-2">
                Orden {effectiveManifest.typology.wordOrder || 'SVO'} / Glosa {preview.gloss}
              </div>
              <div className="text-3xl font-bold text-white font-display break-words">{preview.sentence}</div>
            </div>

            {preview.violations && preview.violations.length > 0 && (
              <div className="mt-3 text-xs text-danger space-y-1">
                {preview.violations.map((v, i) => (
                  <div key={i}>⚠ {v}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

GrammarSyntaxPanel.displayName = 'GrammarSyntaxPanel';

export default GrammarSyntaxPanel;
