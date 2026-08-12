import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { FlexibleGrammar } from '../types/grammar-flexible';
import SparkleIcon from './icons/SparkleIcon';
import XCircleIcon from './icons/XCircleIcon';
import WrenchIcon from './icons/WrenchIcon';
import { isAiAvailable } from '../services/geminiService';
import { inductFromText } from '../services/grammar/inductFromText';
import { convertToLegacy } from '../services/grammarParser';
import type { DeclarativeManifest } from '../services/grammar/declarativeFormat';
import type { ImportValidationReport, Problem } from '../services/grammar/declarativeFormat';

const MiniIcon = ({ children, className = '' }: { children: string; className?: string }) => (
    <span className={`inline-flex h-4 w-4 items-center justify-center text-xs leading-none ${className}`}>{children}</span>
);

const CheckIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>✓</MiniIcon>;
const AlertIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>!</MiniIcon>;
const FileIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>T</MiniIcon>;
const CodeIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>{'{}'}</MiniIcon>;

interface GrammarImporterModalProps {
    onSaveFlexibleGrammar: (grammar: FlexibleGrammar) => void; // New handler
    onClose: () => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
    existingNotes: string;
}

const GrammarImporterModal = ({ onSaveFlexibleGrammar, onClose, showNotification, existingNotes }: GrammarImporterModalProps) => {
    const [rawText, setRawText] = useState(existingNotes);
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FlexibleGrammar | null>(null);
    const [activeTab, setActiveTab] = useState<'raw' | 'preview'>('raw');
    const [ai, setAi] = useState(true);

    useEffect(() => {
        isAiAvailable().then(setAi);
    }, []);

    function convertDeclarativeToFlexible(
      manifest: DeclarativeManifest,
      report: ImportValidationReport
    ): Omit<FlexibleGrammar, 'id' | 'name' | 'storageMode' | 'rawText' | 'lastModified'> {
      const legacy = convertToLegacy(manifest);

      const inflection = manifest.strategies
        .filter(s => s.affixRule || s.particleRule || s.toneRule || s.transformationRule)
        .map(s => {
          let pattern = '';
          let replacement = '';
          const conditions: string[] = [];

          if (s.affixRule) {
            pattern = s.affixRule.form || '';
            replacement = s.affixRule.position === 'prefix'
              ? `{formo}-${pattern}`
              : `{formo}${pattern}`;
            conditions.push(...(s.appliesToCategories || []));
          } else if (s.particleRule) {
            pattern = s.particleRule.marker || '';
            replacement = s.particleRule.relativePosition === 'before'
              ? `${pattern} {formo}`
              : `{formo} ${pattern}`;
            conditions.push(s.particleRule.relativePosition);
          } else if (s.toneRule) {
            pattern = s.toneRule.pattern || '';
            replacement = s.toneRule.description || '';
            conditions.push('tone');
          } else if (s.transformationRule) {
            pattern = s.transformationRule.pattern || '';
            replacement = s.transformationRule.replacement || '';
            conditions.push('mutation');
          }

          return {
            name: s.name || s.id,
            pattern,
            replacement,
            conditions: conditions.length > 0 ? conditions : undefined,
          };
        });

      const wordOrder = [];
      if (manifest.typology?.wordOrder) {
        wordOrder.push({
          name: 'orden_canónico',
          order: manifest.typology.wordOrder,
          description: `Orden básico: ${manifest.typology.wordOrder}`,
        });
      }

      return {
        structured: {
          manifest: legacy,
          confidence: report.score / 100,
          uninterpretedSections: report.problems.map(p => p.message),
        },
        computationalRules: {
          inflection,
          wordOrder,
        },
      };
    }

    const handleAnalyze = async () => {
        if (!rawText.trim()) return;
        setIsProcessing(true);
        try {
            const result = await inductFromText(rawText, { llmAvailable: ai });
            const fullGrammar: FlexibleGrammar = {
                ...convertDeclarativeToFlexible(result.manifest, result.report),
                id: crypto.randomUUID(),
                name: "Gramática Importada",
                storageMode: 'hybrid',
                rawText: rawText,
                lastModified: Date.now()
            };
            setAnalysisResult(fullGrammar);
            setActiveTab('preview');
            showNotification("Análisis completado. Revisa la estructura detectada.", "success");
        } catch (e) {
            showNotification(e instanceof Error ? e.message : "Error al procesar la gramática.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = () => {
        if (analysisResult) {
            onSaveFlexibleGrammar(analysisResult);
            showNotification("Gramática estructurada guardada correctamente.", "success");
        } else {
            // Fallback: Save as raw text only
            const rawGrammar: FlexibleGrammar = {
                id: crypto.randomUUID(),
                name: "Notas Gramaticales",
                storageMode: 'raw',
                rawText: rawText,
                computationalRules: { inflection: [], wordOrder: [] },
                lastModified: Date.now()
            };
            onSaveFlexibleGrammar(rawGrammar);
            showNotification("Notas guardadas correctamente.", "success");
        }
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="grammar-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0 bg-surface/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <WrenchIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 id="grammar-title" className="text-2xl font-bold text-text-primary font-display">Importador de Gramática Inteligente</h2>
                            <p className="text-sm text-text-secondary">Transforma tus notas en reglas computables.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar"><XCircleIcon className="h-7 w-7" /></button>
                </header>

                <main className="flex-grow flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-subtle bg-background/50 px-4 pt-2 gap-2">
                        <button
                            onClick={() => setActiveTab('raw')}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'raw' ? 'bg-surface text-accent border-t border-x border-subtle' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            <FileIcon className="h-4 w-4" /> Texto Original
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            disabled={!analysisResult}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'preview' ? 'bg-surface text-accent border-t border-x border-subtle' : 'text-text-secondary hover:text-text-primary disabled:opacity-50'}`}
                        >
                            <CodeIcon className="h-4 w-4" /> Estructura Detectada
                        </button>
                    </div>

                    <div className="flex-grow p-4 overflow-hidden relative">
                        {activeTab === 'raw' ? (
                            <div className="h-full flex flex-col gap-4">
                                <div className="bg-accent/10 border border-accent/20 p-3 rounded-md text-sm text-text-secondary">
                                    <p className="flex items-center gap-2"><SparkleIcon className="h-4 w-4 text-accent" /> <strong>Tip:</strong> Describe tu gramática naturalmente. Ej: "El orden es SOV. El plural se forma añadiendo -k al final."</p>
                                </div>

                                {/* File Upload Button */}
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent font-semibold rounded-md border-2 border-accent/50 cursor-pointer transition-all hover:shadow-lg">
                                        <FileIcon className="h-5 w-5" />
                                        Cargar Archivo de Gramática
                                        <input
                                            type="file"
                                            accept=".txt,.md,.doc,.docx,text/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = async (event) => {
                                                        const content = event.target?.result as string;
                                                        setRawText(content);
                                                        showNotification(`Archivo "${file.name}" cargado. Analizando...`, 'success');
                                                        // Auto-analyze after loading
                                                        setIsProcessing(true);
                                                        try {
                                                            const result = await inductFromText(content, { llmAvailable: ai });
                                                            const fullGrammar: FlexibleGrammar = {
                                                                ...convertDeclarativeToFlexible(result.manifest, result.report),
                                                                id: crypto.randomUUID(),
                                                                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                                                                storageMode: 'hybrid',
                                                                rawText: content,
                                                                lastModified: Date.now()
                                                            };
                                                            setAnalysisResult(fullGrammar);
                                                            setActiveTab('preview');
                                                            showNotification("Análisis completado. Revisa la estructura detectada.", "success");
                                                        } catch (err) {
                                                            showNotification(err instanceof Error ? err.message : "Error al procesar la gramática.", "error");
                                                        } finally {
                                                            setIsProcessing(false);
                                                        }
                                                    };
                                                    reader.readAsText(file);
                                                }
                                                e.target.value = ''; // Reset input
                                            }}
                                        />
                                    </label>
                                    <div className="text-xs text-text-secondary flex items-center">
                                        Formatos: .txt, .md, .doc
                                    </div>
                                </div>

                                <textarea
                                    value={rawText}
                                    onChange={e => setRawText(e.target.value)}
                                    placeholder="Pega aquí tu gramática, reglas o notas... o usa el botón de arriba para cargar un archivo"
                                    className="flex-grow w-full bg-background border border-subtle rounded-md p-4 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none custom-scrollbar"
                                />
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto custom-scrollbar bg-background/30 rounded-md border border-subtle p-4">
                                {analysisResult ? (
                                    <div className="space-y-6">
                                        {/* Confidence Score */}
                                        <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-subtle">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">Confianza de la IA</h4>
                                                <div className="h-2 bg-background rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${analysisResult.structured?.confidence! > 0.8 ? 'bg-success' : analysisResult.structured?.confidence! > 0.5 ? 'bg-warning' : 'bg-danger'}`}
                                                        style={{ width: `${(analysisResult.structured?.confidence || 0) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-2xl font-bold font-mono">
                                                {Math.round((analysisResult.structured?.confidence || 0) * 100)}%
                                            </span>
                                        </div>

                                        {/* Diagnostic: low confidence or no rules */}
                                        {(analysisResult.structured!.confidence < 0.5 || (analysisResult.computationalRules?.inflection?.length === 0 && analysisResult.structured!.uninterpretedSections!.length > 0)) && (
                                            <div className="bg-danger/10 border border-danger/30 p-4 rounded-md">
                                                <h4 className="text-sm font-bold text-danger mb-1 flex items-center gap-2"><AlertIcon className="h-4 w-4" /> Análisis parcial o fallido</h4>
                                                <p className="text-xs text-text-secondary">
                                                    {analysisResult.structured!.confidence < 0.5
                                                        ? `La IA solo interpretó el ${Math.round(analysisResult.structured!.confidence * 100)}% del documento. Esto puede deberse a: formato no reconocido, grammar demasiado extenso para el modelo, o errores de parseo del JSON.`
                                                        : 'No se extrajeron reglas computables. Revisa las secciones no interpretadas abajo.'}
                                                </p>
                                                <p className="text-xs text-text-secondary mt-1">Sugerencia: acorta el texto, verifica tu API key en Ajustes, o estructura el documento con títulos claros (ej. "Sustantivos:", "Verbos:", "Casos:").</p>
                                            </div>
                                        )}

                                        {/* Typology */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-3 bg-surface rounded border border-subtle">
                                                <span className="text-xs text-text-secondary block mb-1">Orden</span>
                                                <span className="font-bold text-accent">{analysisResult.structured?.manifest.typology.wordOrder}</span>
                                            </div>
                                            <div className="p-3 bg-surface rounded border border-subtle">
                                                <span className="text-xs text-text-secondary block mb-1">Alineamiento</span>
                                                <span className="font-bold text-accent">{analysisResult.structured?.manifest.typology.alignment}</span>
                                            </div>
                                            <div className="p-3 bg-surface rounded border border-subtle">
                                                <span className="text-xs text-text-secondary block mb-1">Morfología</span>
                                                <span className="font-bold text-accent">{analysisResult.structured?.manifest.typology.morphology}</span>
                                            </div>
                                            <div className="p-3 bg-surface rounded border border-subtle">
                                                <span className="text-xs text-text-secondary block mb-1">Dirección</span>
                                                <span className="font-bold text-accent">{analysisResult.structured?.manifest.typology.headDirection}</span>
                                            </div>
                                        </div>

                                        {/* Rules */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><CodeIcon className="h-5 w-5" /> Reglas Computables Detectadas</h3>
                                            <div className="space-y-2">
                                                {analysisResult.computationalRules.inflection.map((rule, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded border border-subtle">
                                                        <div>
                                                            <span className="font-bold text-text-primary">{rule.name}</span>
                                                            <code className="ml-2 text-xs bg-background px-1 py-0.5 rounded text-accent">{rule.pattern} → {rule.replacement}</code>
                                                        </div>
                                                        {rule.conditions && (
                                                            <div className="flex gap-1">
                                                                {rule.conditions.map((c, i) => <span key={i} className="text-xs bg-background px-2 py-1 rounded text-text-secondary">{c}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {analysisResult.computationalRules.inflection.length === 0 && (
                                                    <p className="text-text-secondary italic">No se detectaron reglas de inflexión claras.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Uninterpreted */}
                                        {analysisResult.structured?.uninterpretedSections && analysisResult.structured.uninterpretedSections.length > 0 && (
                                            <div className="bg-warning/10 border border-warning/30 p-4 rounded-md">
                                                <h4 className="text-sm font-bold text-warning mb-2 flex items-center gap-2"><AlertIcon className="h-4 w-4" /> Secciones no interpretadas</h4>
                                                <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                                                    {analysisResult.structured.uninterpretedSections.map((sec, i) => (
                                                        <li key={i} className="truncate">{sec}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-text-secondary">
                                        Presiona "Analizar" para ver la estructura.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                <footer className="p-4 flex justify-between items-center border-t border-subtle flex-shrink-0 bg-surface/95 backdrop-blur">
                    <div className="text-xs text-text-secondary">
                        {rawText.length} caracteres
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md hover:bg-gray-600 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={isProcessing || !rawText.trim() || !ai}
                            className="px-4 py-2 bg-surface border border-accent text-accent font-semibold rounded-md hover:bg-accent/10 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            <SparkleIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                            {isProcessing ? 'Analizando...' : 'Analizar'}
                        </button>
                        {!ai && (
                            <p className="text-xs text-text-secondary">Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente.</p>
                        )}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
                        >
                            <CheckIcon className="h-4 w-4" />
                            Guardar {analysisResult ? 'Gramática' : 'Notas'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    , document.body);
};

export default memo(GrammarImporterModal);
