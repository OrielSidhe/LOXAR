import React, { useState, useEffect } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SparkleIcon from './icons/SparkleIcon';
import InfoIcon from './icons/InfoIcon';
import { testAiConnection, loadAiSettings, saveAiSettings, AiSettings, DEFAULT_GEMINI_MODEL, DEFAULT_OLLAMA_MODEL, APP_NAME, APP_VERSION, getDebugLog, clearDebugLog } from '../services/geminiService';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface AiSettingsModalProps {
    onClose: () => void;
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
const OLLAMA_MODELS = ['llama3', 'llama3.1', 'llama3.2', 'llama2', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2', 'deepseek-coder-v2'];

type TestResultState = {
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: string;
};

const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<AiSettings>({
        provider: 'gemini',
        geminiApiKey: '',
        geminiModel: DEFAULT_GEMINI_MODEL,
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: DEFAULT_OLLAMA_MODEL,
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResultState>({ status: 'idle', message: '' });
    const [showDebug, setShowDebug] = useState(false);
    const [debugEntries, setDebugEntries] = useState<ReturnType<typeof getDebugLog>>([]);
    const [showApiKey, setShowApiKey] = useState(false);

    const refreshDebug = () => setDebugEntries([...getDebugLog()]);

    useEffect(() => {
        let active = true;
        loadAiSettings().then(s => { if (active) setSettings(s); });
        return () => { active = false; };
    }, []);

    const handleSave = async () => {
        await saveAiSettings(settings);
        onClose();
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult({ status: 'idle', message: '' });
        try {
            await saveAiSettings(settings);
            const result = await testAiConnection();
            if (result.success) {
                setTestResult({ status: 'success', message: 'Conexion exitosa.' });
                refreshDebug();
            } else {
                setTestResult({
                    status: 'error',
                    message: result.error || 'La prueba fallo.',
                    details: result.details,
                });
                refreshDebug();
            }
        } catch (e: any) {
            setTestResult({
                status: 'error',
                message: `Error: ${e.message}`,
                details: e.stack,
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleClearDebug = () => {
        clearDebugLog();
        refreshDebug();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-sm p-4">
            <div className="bg-surface-dark border border-border-dark rounded-xl shadow-glow w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-dark bg-surface-dark/50">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <SparkleIcon className="w-6 h-6 text-accent" />
                        Configuracion de IA
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* App info banner */}
                    <div className="text-xs text-text-secondary bg-background/50 p-2 rounded border border-subtle">
                        {APP_NAME} v{APP_VERSION} — Las llamadas a la API incluyen identificacion de aplicacion.
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-secondary">Proveedor de Inteligencia Artificial</label>
                        <select
                            value={settings.provider}
                            onChange={e => setSettings({ ...settings, provider: e.target.value as 'gemini' | 'ollama' })}
                            className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="gemini">Google Gemini (Nube)</option>
                            <option value="ollama">Ollama (Local)</option>
                        </select>
                    </div>

                    {/* Gemini-specific fields */}
                    {settings.provider === 'gemini' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">API Key de Gemini</label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={settings.geminiApiKey}
                                        onChange={e => setSettings({ ...settings, geminiApiKey: e.target.value })}
                                        placeholder="AIzaSy..."
                                        className="w-full bg-background border border-subtle rounded-md px-3 py-2 pr-10 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(v => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                                        aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                                    >
                                        {showApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    Obtén tu API Key gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline">Google AI Studio</a>.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Modelo de Gemini</label>
                                <select
                                    value={settings.geminiModel}
                                    onChange={e => setSettings({ ...settings, geminiModel: e.target.value })}
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <p className="text-xs text-text-secondary">
                                    Recomendado: <code>gemini-2.5-flash</code>. El modelo <code>gemini-1.5-flash</code> esta siendo descontinuado por Google.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Ollama-specific fields */}
                    {settings.provider === 'ollama' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">URL de Ollama</label>
                                <input
                                    type="text"
                                    value={settings.ollamaUrl}
                                    onChange={e => setSettings({ ...settings, ollamaUrl: e.target.value })}
                                    placeholder="http://localhost:11434"
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <p className="text-xs text-text-secondary">
                                    Asegurate de tener Ollama ejecutandose localmente.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Modelo de Ollama</label>
                                <input
                                    type="text"
                                    list="ollama-models"
                                    value={settings.ollamaModel}
                                    onChange={e => setSettings({ ...settings, ollamaModel: e.target.value })}
                                    placeholder="Selecciona o escribe un modelo..."
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <datalist id="ollama-models">
                                    {OLLAMA_MODELS.map(m => <option key={m} value={m} />)}
                                </datalist>
                                <p className="text-xs text-text-secondary">
                                    Selecciona un modelo recomendado o escribe uno personalizado.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Test Connection */}
                    <div className="pt-4 border-t border-border-dark flex flex-col gap-3">
                        <button
                            onClick={handleTest}
                            disabled={isTesting || (settings.provider === 'gemini' && !settings.geminiApiKey)}
                            className="w-full py-2 bg-background border border-accent text-accent rounded-md font-medium hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isTesting ? (
                                <span className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full"></span>
                            ) : 'Probar Conexion'}
                        </button>

                        {testResult.status === 'success' && (
                            <div className="flex items-center gap-2 text-success text-sm bg-success/10 p-3 rounded-md">
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>{testResult.message}</span>
                            </div>
                        )}
                        {testResult.status === 'error' && (
                            <div className="text-danger text-sm bg-danger/10 p-3 rounded-md space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangleIcon className="w-5 h-5" />
                                    <span className="font-medium">{testResult.message}</span>
                                </div>
                                {testResult.details && (
                                    <details className="text-xs text-text-secondary">
                                        <summary className="cursor-pointer hover:text-text-primary">Detalles tecnicos</summary>
                                        <pre className="mt-1 whitespace-pre-wrap break-all font-mono bg-background/50 p-2 rounded max-h-40 overflow-y-auto">{testResult.details}</pre>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Debug panel toggle */}
                    <div className="border-t border-border-dark pt-4">
                        <button
                            onClick={() => { refreshDebug(); setShowDebug(v => !v); }}
                            className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <InfoIcon className="w-4 h-4" />
                            {showDebug ? 'Ocultar' : 'Mostrar'} depuracion de llamadas
                        </button>

                        {showDebug && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono text-text-secondary">
                                        Registro de llamadas ({debugEntries.length})
                                    </span>
                                    <button
                                        onClick={handleClearDebug}
                                        className="text-xs text-accent hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                                {debugEntries.length === 0 && (
                                    <p className="text-xs text-text-secondary italic">No hay llamadas registradas en esta sesion.</p>
                                )}
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {debugEntries.map((entry, idx) => (
                                        <div key={idx} className={`text-xs p-2 rounded border ${entry.status === 'ok' ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-medium">
                                                    {entry.provider} / {entry.model}
                                                </span>
                                                <span className={entry.status === 'ok' ? 'text-success' : 'text-danger'}>
                                                    {entry.status === 'ok' ? 'OK' : 'ERROR'}
                                                </span>
                                            </div>
                                            <div className="font-mono text-text-secondary mt-1 break-all">
                                                {entry.endpoint}
                                            </div>
                                            <div className="text-text-secondary mt-1">
                                                {entry.payloadPreview}
                                            </div>
                                            {entry.error && (
                                                <div className="text-danger mt-1">{entry.error}</div>
                                            )}
                                            {entry.responsePreview && (
                                                <details className="mt-1">
                                                    <summary className="cursor-pointer text-text-secondary hover:text-text-primary">Respuesta</summary>
                                                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono bg-background/50 p-1 rounded max-h-32 overflow-y-auto">{entry.responsePreview}</pre>
                                                </details>
                                            )}
                                            <div className="text-text-secondary/60 mt-1">
                                                {new Date(entry.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border-dark bg-surface-dark/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-text-secondary hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-accent text-white font-semibold rounded-md hover:bg-accent-hover transition-colors shadow-glow-sm">
                        Guardar Configuracion
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiSettingsModal;
