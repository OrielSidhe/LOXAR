import React, { useState } from 'react';
import { SyntaxCanvas as SyntaxCanvasType, SyntaxNode, SyntaxConnection } from '../types';
import { callAi, extractJson, cleanseJson } from '../services/geminiService';

export interface AiMapperModalProps {
    canvas: SyntaxCanvasType;
    conlangName: string;
    onApply: (nodes: SyntaxNode[], conns: SyntaxConnection[]) => void;
    onClose: () => void;
    aiAvailable?: boolean;
}

const AiMapperModal = ({ canvas, conlangName, onApply, onClose, aiAvailable }: AiMapperModalProps) => {
    const [mode, setMode] = useState<'toProse' | 'toGraph'>('toProse');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingGraph, setPendingGraph] = useState<{ nodes: SyntaxNode[]; conns: SyntaxConnection[] } | null>(null);

    const handleGenerateProse = async () => {
        setLoading(true);
        setError(null);
        try {
            const prompt = `Actúa como un lingüista académico describiendo la gramática del idioma ${conlangName}. 
Se te provee la representación en JSON del árbol sintáctico (nodos y conexiones de dependencias).
Escribe un texto explicativo fluido en prosa que documente las reglas de orden de palabras, dependencias, morfología y estructura de oraciones inferidas de este árbol.
Responde ÚNICAMENTE con la explicación en prosa formateada en Markdown, sin rodeos.

JSON Árbol:
${JSON.stringify({ nodes: canvas.nodes, connections: canvas.connections }, null, 2)}`;
            const res = await callAi(prompt);
            setText(res);
        } catch (e: any) {
            setError("Error en la llamada a la IA: " + (e?.message || e));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateGraph = async () => {
        setLoading(true);
        setError(null);
        setPendingGraph(null);
        try {
            const prompt = `Genera un JSON representando un árbol sintáctico (nodos y flechas de conexión) para el idioma ${conlangName} basado en el siguiente texto en prosa.
Debes extraer los sintagmas, categorías morfológicas y sus relaciones.
Responde ÚNICAMENTE con el JSON válido usando exactamente este esquema:
{
  "nodes": [ { "id": "uuid", "type": "clause|phrase|word|morpheme", "role": "string", "label": "string", "x": number, "y": number, "color": "hex", "children": [ /* recursive */ ], "lexiconCategory": "optional", "literalForm": "optional" } ],
  "connections": [ { "id": "uuid", "fromId": "nodeId", "toId": "nodeId", "connectionType": "dependency|agreement|movement", "label": "string" } ]
}
Nota: Pon posiciones X, Y razonables para que no se encimen (ej: sumando de 250 en 250).

Prosa gramatical:
${text}`;
            const res = await callAi(prompt);
            // Parse tolerante: extrae el JSON real y, si falla, usa cleanseJson como respaldo.
            let data: any = null;
            try {
                const extracted = extractJson(res);
                if (extracted) data = JSON.parse(extracted);
            } catch { /* retry below */ }
            if (!data) {
                const cleaned = await cleanseJson(res);
                data = JSON.parse(cleaned);
            }
            if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
                setPendingGraph({ nodes: data.nodes, conns: data.connections || [] });
            } else {
                setError("La IA respondió, pero el JSON no contiene una lista 'nodes' válida.");
            }
        } catch (e: any) {
            // Distinguir claramente fallo de llamada vs. JSON inválido.
            setError("No se pudo generar el árbol: " + (e?.message || e));
        } finally {
            setLoading(false);
        }
    };

    const applyPendingGraph = () => {
        if (!pendingGraph) return;
        onApply(pendingGraph.nodes, pendingGraph.conns);
        setPendingGraph(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111115] border border-border-dark rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-accent">✦</span> AI Grammar Mapper
                    </h3>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                        <button onClick={() => setMode('toProse')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${mode === 'toProse' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}>Árbol → Prosa</button>
                        <button onClick={() => setMode('toGraph')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${mode === 'toGraph' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}>Prosa → Árbol</button>
                    </div>
                </div>
                
                <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg p-3 flex items-start gap-2">
                            <span className="text-red-400">⚠</span>
                            <span className="whitespace-pre-wrap">{error}</span>
                        </div>
                    )}
                    {mode === 'toProse' ? (
                        <>
                            <p className="text-sm text-text-secondary">Genera una explicación académica en base a tu diagrama actual.</p>
                            <div className="flex-1 bg-surface border border-white/10 rounded-xl p-4 overflow-auto text-white text-sm whitespace-pre-wrap custom-scrollbar">
                                {text || <span className="text-white/30 italic">Presiona Generar para procesar el grafo con Gemini...</span>}
                            </div>
                            <button onClick={handleGenerateProse} disabled={loading || aiAvailable === false} className="py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2 disabled:opacity-50">
                                {loading ? '🧠 Procesando...' : '✦ Generar Prosa desde Gráfico'}
                            </button>
                            {aiAvailable === false && (
                                <p className="text-xs text-text-secondary">Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente.</p>
                            )}
                        </>
                    ) : pendingGraph ? (
                        <>
                            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 text-sm rounded-lg p-3">
                                <p className="font-bold mb-1">✓ Árbol generado</p>
                                <p className="opacity-80">{pendingGraph.nodes.length} nodos y {pendingGraph.conns.length} conexiones listas para aplicar.</p>
                            </div>
                            <div className="flex-1 bg-surface border border-white/10 rounded-xl p-4 overflow-auto text-white text-sm whitespace-pre-wrap custom-scrollbar custom-scrollbar">
                                <pre className="text-xs text-white/70">{JSON.stringify(pendingGraph.nodes.map(n => ({ type: n.type, label: n.label, role: n.role })), null, 2)}</pre>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={applyPendingGraph} className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
                                    ✦ Aplicar Árbol al Canvas
                                </button>
                                <button onClick={() => setPendingGraph(null)} className="px-4 py-3 bg-surface hover:bg-surface-light text-white font-bold rounded-xl transition-colors">
                                    Descartar
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-text-secondary">Pega tu gramática escrita y la IA construirá los nodos y flechas automáticamente.</p>
                            <textarea 
                                className="flex-1 bg-surface border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-primary resize-none custom-scrollbar"
                                placeholder="Ej: La oración tiene un Sujeto y un Verbo. El Sujeto se compone de un Sustantivo y lleva el sufijo -ka..."
                                value={text} onChange={e => setText(e.target.value)}
                            />
                            <button onClick={handleGenerateGraph} disabled={loading || !text.trim() || aiAvailable === false} className="py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex justify-center items-center gap-2 disabled:opacity-50">
                                {loading ? '🧠 Construyendo árbol...' : '✦ Construir Gráfico desde Prosa'}
                            </button>
                            {aiAvailable === false && (
                                <p className="text-xs text-text-secondary">Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente.</p>
                            )}
                        </>
                    )}
                </div>
                
                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-surface hover:bg-surface-light text-white font-bold rounded-lg text-sm transition-colors">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

AiMapperModal.displayName = 'AiMapperModal';

export default AiMapperModal;
