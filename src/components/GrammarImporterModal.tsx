/**
 * GrammarImporterModal.tsx
 * ──────────────────────
 * Importador de gramática con IA.
 *
 * E3: Refactorizado para consumir el Zustand `importStore`.
 *  - El job de inducción vive FUERA del modal (en useImportStore).
 *  - Cerrar el modal NUNCA cancela el job (NADA se pierde).
 *  - Progress bar inline con chunk list (per-chunk status).
 *  - Auto-save de resultados parciales vía persistencia del store.
 *
 * E5: Soporte de formatos ampliado a .docx (mammoth), .csv (papaparse), .xlsx.
 *  - .doc rechazado con error claro.
 */

import { useState, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FlexibleGrammar } from '../types/grammar-flexible';
import SparkleIcon from './icons/SparkleIcon';
import XCircleIcon from './icons/XCircleIcon';
import WrenchIcon from './icons/WrenchIcon';
import { isAiAvailable, callAi, extractJson } from '../services/geminiService';
import { inductFromText } from '../services/grammar/inductFromText';
import type { InductProgress, InductResult } from '../services/grammar/inductFromText';
import type { InductJob, StoredChunk } from '../stores/importStore';
import { useImportStore } from '../stores/importStore';
import { validatePostImport } from '../services/grammar/postImportValidator';
import { convertToLegacy } from '../services/grammarParser';
import { validateLlmManifest } from '../services/grammar/llmSchema';
import { parseGrammarFile } from '../services/grammar/fileParser';
import ImportReport from './ImportReport';
import type { DeclarativeManifest } from '../services/grammar/declarativeFormat';
import type { ImportValidationReport } from '../services/grammar/declarativeFormat';

const FileIcon = ({ className = '' }: { className?: string }) => <span className={`inline-flex h-4 w-4 items-center justify-center text-xs leading-none ${className}`}>T</span>;
const CodeIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>{'{}'}</MiniIcon>;
const MiniIcon = ({ children, className = '' }: { children: string; className?: string }) => (
    <span className={`inline-flex h-4 w-4 items-center justify-center text-xs leading-none ${className}`}>{children}</span>
);

interface GrammarImporterModalProps {
    onSaveFlexibleGrammar: (grammar: FlexibleGrammar) => void;
    onClose: () => void;
    showNotification: (message: string, type: 'success' | 'error') => void;
    existingNotes: string;
}

const GrammarImporterModal = ({ onSaveFlexibleGrammar, onClose, showNotification, existingNotes }: GrammarImporterModalProps) => {
    // ── Store ──────────────────────────────────────────────────────────
    const job = useImportStore(state => state.job);
    const isModalOpen = useImportStore(state => state.isModalOpen);
    const startJob = useImportStore(state => state.startJob);
    const updateProgress = useImportStore(state => state.updateProgress);
    const completeChunk = useImportStore(state => state.completeChunk);
    const failChunk = useImportStore(state => state.failChunk);
    const setJobResult = useImportStore(state => state.setJobResult);
    const setJobGrammar = useImportStore(state => state.setJobGrammar);
    const setError = useImportStore(state => state.setError);
    const cancelJob = useImportStore(state => state.cancelJob);
    const clearJob = useImportStore(state => state.clearJob);

    // ── Local UI state ────────────────────────────────────────────────
    const [rawText, setRawText] = useState(existingNotes);
    const [analysisResult, setAnalysisResult] = useState<FlexibleGrammar | null>(null);
    const [validation, setValidation] = useState<ImportValidationReport | null>(null);
    const [activeTab, setActiveTab] = useState<'raw' | 'preview'>('raw');
    const [ai, setAi] = useState(true);
    const [fileError, setFileError] = useState<string | null>(null);

    // Sync rawText from job when it's seeded externally
    useEffect(() => {
        if (job && !rawText && job.text) {
            setRawText(job.text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.id]);

    // Load AI availability
    useEffect(() => {
        isAiAvailable().then(setAi);
    }, []);

    // Seed demo grammar if empty
    useEffect(() => {
        if (!existingNotes && !rawText && !job) {
            setRawText(DEMO_GRAMMAR);
        }
    }, [existingNotes, rawText, job]);

    // When job result arrives in the store, hydrate the preview UI
    useEffect(() => {
        if (job?.result && !analysisResult) {
            const fullGrammar = buildFlexibleGrammar(job.result, job.text, job.fileName);
            setAnalysisResult(fullGrammar);
            setJobGrammar(fullGrammar);
            setValidation(validatePostImport(job.result.manifest));
            setActiveTab('preview');
            showNotification(
                `Análisis completado (${job.result.method === 'hybrid' ? 'IA + local' : job.result.method === 'llm' ? 'IA' : 'local'}).`,
                'success',
            );
        }
    }, [job?.result, analysisResult, showNotification, setJobGrammar, job?.text, job?.fileName]);

    // Watch job error
    useEffect(() => {
        if (job?.error && job.status === 'error') {
            showNotification(job.error, 'error');
        }
    }, [job?.error, job?.status, showNotification]);

    const DEMO_GRAMMAR = `§ Tipología: SOV, aglutinante, head-final

§ Fonología: /p t k m n s l r/, /a e i o u/

§ Sustantivos: plural por -k sufijo

§ Verbos: pasado por -t sufijo, futuro por -lu sufijo

§ Estrategias: Sufijo de plural: posición suffix, forma -k`;

    // ── LLM call factory (production path) ────────────────────────────
    const createLlmCall = useCallback(async () => {
        return async (prompt: string): Promise<{ manifest: DeclarativeManifest; confidence: number }> => {
            const responseText = await callAi(prompt);
            const jsonStr = extractJson(responseText);
            if (!jsonStr) {
                throw new Error('No se encontró JSON válido en la respuesta de la IA');
            }
            const parsed = JSON.parse(jsonStr);
            const validation = validateLlmManifest(parsed);
            if (!validation.ok) {
                throw new Error(`Validación Zod fallida: ${validation.error}`);
            }
            return {
                manifest: validation.manifest,
                confidence: Math.min(95, 60 + validation.manifest.paradigms.length * 5 + validation.manifest.strategies.length * 3),
            };
        };
    }, []);

    // ── Build FlexibleGrammar from InductResult ───────────────────────
    function buildFlexibleGrammar(
        result: InductResult,
        text: string,
        fileName?: string,
    ): FlexibleGrammar {
        const fullGrammar: FlexibleGrammar = {
            ...convertDeclarativeToFlexible(result.manifest, result.report),
            id: crypto.randomUUID(),
            name: fileName || 'Gramática Importada',
            storageMode: 'hybrid',
            rawText: text,
            lastModified: Date.now(),
        };

        if (result.notes && result.notes.length > 0) {
            fullGrammar.structured = {
                ...(fullGrammar.structured || { confidence: 0.5, uninterpretedSections: [], manifest: undefined as any }),
                manifest: fullGrammar.structured?.manifest || result.manifest as any,
                confidence: fullGrammar.structured?.confidence || (result.confidence / 100),
                uninterpretedSections: [
                    ...(fullGrammar.structured?.uninterpretedSections || []),
                    ...(result.notes || []),
                ],
            } as any;
        }

        return fullGrammar;
    }

    // ── convertDeclarativeToFlexible ────────────────────────────────────
    function convertDeclarativeToFlexible(
        manifest: DeclarativeManifest,
        report: ImportValidationReport,
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
        if (manifest.typology.wordOrder) {
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

    // ── Induction entry point (E2: delegates to store) ─────────────────
    const runInduction = useCallback(async () => {
        const text = job?.text || rawText;
        if (!text.trim()) return;

        // E1: Start the job in the store (NOT in modal local state)
        startJob(text, job?.fileName, ai);

        const llmCall = ai ? await createLlmCall() : undefined;

        try {
            // E3: We pass onProgress that updates the STORE, not just UI state.
            // This way the job survives modal close. onChunkResult stores partial
            // manifests per chunk (E4: incremental manifests).
            const result = await inductFromText(text, {
                llmAvailable: ai,
                llmCall,
                onProgress: (progress: InductProgress) => {
                    // E1 fix: dedupe — chunker message no longer embeds (N/total).
                    // UI formats display without re-appending chunk/total.
                    updateProgress(progress);
                },
                onChunkResult: (chunkIndex, chunkResult, note) => {
                    if (chunkResult) {
                        completeChunk(chunkIndex + 1, chunkResult.manifest, chunkResult.confidence, [note]);
                    } else {
                        failChunk(chunkIndex + 1, note);
                    }
                },
            });

            // E2: Store the final result
            setJobResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error desconocido en la inducción');
        }
    }, [job?.text, job?.fileName, rawText, ai, startJob, updateProgress, completeChunk, failChunk, setJobResult, setError, createLlmCall]);

    // ── Handlers ────────────────────────────────────────────────────────
    const handleAnalyze = useCallback(async () => {
        const text = rawText || job?.text || '';
        if (!text.trim()) return;

        // Clear previous analysis
        setAnalysisResult(null);
        setValidation(null);
        setJobGrammar(null);

        try {
            await runInduction();
        } catch (e) {
            showNotification(e instanceof Error ? e.message : 'Error al procesar la gramática.', 'error');
        }
    }, [rawText, job?.text, runInduction, showNotification]);

    const handleSave = () => {
        if (analysisResult) {
            onSaveFlexibleGrammar(analysisResult);
            showNotification('Gramática estructurada guardada correctamente.', 'success');
        } else {
            const rawGrammar: FlexibleGrammar = {
                id: crypto.randomUUID(),
                name: 'Notas Gramaticales',
                storageMode: 'raw',
                rawText: rawText,
                computationalRules: { inflection: [], wordOrder: [] },
                lastModified: Date.now(),
            };
            onSaveFlexibleGrammar(rawGrammar);
            showNotification('Notas guardadas correctamente.', 'success');
        }
        clearJob();
        onClose();
    };

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileError(null);

        const result = await parseGrammarFile(file);
        if (!result.ok) {
            setFileError(result.error);
            showNotification(result.error, 'error');
            e.target.value = '';
            return;
        }

        setRawText(result.text);
        showNotification(`Archivo "${file.name}" cargado (${result.sourceFormat}). Analizando...`, 'success');
        e.target.value = '';

        // Auto-analyze after loading
        await handleAnalyze();
    }, [showNotification, handleAnalyze]);

    const handleCancel = () => {
        cancelJob();
        setAnalysisResult(null);
        setValidation(null);
        setRawText(existingNotes || DEMO_GRAMMAR);
        setFileError(null);
    };

    // ── Derived state ──────────────────────────────────────────────────
    const isProcessing = job?.status === 'running';
    const progress = job?.progress;

    // ── Render ─────────────────────────────────────────────────────────
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
                            aria-label="Ver texto original de la gramática"
                        >
                            <FileIcon className="h-4 w-4" /> Texto Original
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            disabled={!analysisResult}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'preview' ? 'bg-surface text-accent border-t border-x border-subtle' : 'text-text-secondary hover:text-text-primary disabled:opacity-50'}`}
                            aria-label="Ver estructura detectada de la gramática"
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
                                            accept=".txt,.md,.doc,.docx,.csv,.xlsx,text/*"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                    <div className="text-xs text-text-secondary flex items-center">
                                        Formatos: .txt, .md, .docx, .csv, .xlsx (no .doc)
                                    </div>
                                </div>

                                {fileError && (
                                    <div className="bg-danger/10 border border-danger/30 p-3 rounded-md text-sm text-danger">
                                        {fileError}
                                    </div>
                                )}

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

                                        {validation && (
                                            <div className="p-4 bg-surface rounded-lg border border-subtle">
                                                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Reporte de validación</h4>
                                                <ImportReport report={validation} />
                                            </div>
                                        )}

                                        {/* Rules */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><CodeIcon className="h-5 w-5" /> Reglas Computables Detectadas</h3>
                                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
                    <div className="flex gap-3 items-center">
                        <button onClick={onClose} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md hover:bg-gray-600 transition-colors">
                            Cancelar
                        </button>
                        {!ai && (
                            <p className="text-xs text-text-secondary">
                                Modo offline: se usará el parser local. La inducción con IA requiere configuración de proveedor.
                            </p>
                        )}
                        {/* E3: Progress bar inline during processing */}
                        {isProcessing && (
                            <div className="flex-1 min-w-[200px]">
                                <div className="h-2 bg-background rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-300"
                                        style={{
                                            width: progress && progress.total > 0
                                                ? `${Math.round((progress.chunk / progress.total) * 100)}%`
                                                : '100%'
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                    {progress ? `${progress.message}` : 'Procesando...'}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleAnalyze}
                            disabled={isProcessing || !rawText.trim()}
                            className="px-4 py-2 bg-surface border border-accent text-accent font-semibold rounded-md hover:bg-accent/10 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            <SparkleIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                            {isProcessing ? (progress?.message || 'Analizando...') : (ai ? 'Analizar con IA' : 'Analizar (offline)')}
                        </button>
                        {!isProcessing && (
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
                            >
                                <CheckIcon className="h-4 w-4" />
                                Guardar {analysisResult ? 'Gramática' : 'Notas'}
                            </button>
                        )}
                        {isProcessing && job && job.chunks.length > 0 && (
                            <div className="text-xs text-text-secondary max-w-xs">
                                <div className="font-bold mb-1">Chunks:</div>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                    {job.chunks.map((chunk: StoredChunk) => (
                                        <div key={chunk.displayIndex} className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                chunk.status === 'success' ? 'bg-success' :
                                                chunk.status === 'failed' ? 'bg-danger' :
                                                chunk.status === 'running' ? 'bg-accent animate-pulse' :
                                                'bg-text-secondary'
                                            }`} />
                                            <span>Chunk {chunk.displayIndex}/{job.totalChunks}: {chunk.status}</span>
                                            {chunk.confidence !== undefined && (
                                                <span className="text-text-secondary">({chunk.confidence}%)</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </footer>
            </div>
        </div>,
        document.body,
    );
};

// Need to keep the original icon imports
const AlertIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>!</MiniIcon>;
const CheckIcon = ({ className = '' }: { className?: string }) => <MiniIcon className={className}>✓</MiniIcon>;

export default memo(GrammarImporterModal);
