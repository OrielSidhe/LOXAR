import { useState, useEffect } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SparkleIcon from './icons/SparkleIcon';
import InfoIcon from './icons/InfoIcon';
import { testAiConnection, loadAiSettings, saveAiSettings, AiSettings, DEFAULT_GEMINI_MODEL, DEFAULT_OLLAMA_MODEL, APP_NAME, APP_VERSION, getDebugLog, clearDebugLog } from '../services/geminiService';
import { DEFAULT_PROVIDERS, type AIProviderConfig, type ProviderEndpointStyle } from '../services/aiProviderRegistry';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

const ENDPOINT_STYLES: { value: ProviderEndpointStyle; label: string }[] = [
  { value: 'openai-chat', label: 'OpenAI-compatible chat (/v1/chat/completions)' },
  { value: 'openai-completion', label: 'OpenAI-compatible completion (/v1/completions)' },
  { value: 'anthropic-messages', label: 'Anthropic Messages API' },
  { value: 'ollama', label: 'Ollama (/api/generate)' },
  { value: 'gemini', label: 'Google Gemini SDK' },
  { value: 'custom', label: 'Custom (request/response mappers)' },
];

const PRESET_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'stepfun',
    name: 'StepFun',
    baseURL: 'https://api.stepfun.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'step-2-16k',
    models: ['step-2-16k', 'step-1-8k', 'step-1-32k', 'step-1-128k', 'step-1-256k'],
  },
  {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://api.nousresearch.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'hermes-3-llama-3.1-405b',
    models: ['hermes-3-llama-3.1-405b', 'hermes-3-llama-3.1-70b', 'hermes-2-mixtral-8x7b'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'llama-3.1-70b-versatile',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
];

type TestResultState = {
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: string;
};

interface ProviderFormData {
    id: string;
    name: string;
    baseURL: string;
    apiKey: string;
    authHeader: string;
    endpointStyle: ProviderEndpointStyle;
    defaultModel: string;
    models: string[];
}

const emptyProvider = (): ProviderFormData => ({
    id: '',
    name: '',
    baseURL: '',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: '',
    models: [],
});

const AiSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [legacySettings, setLegacySettings] = useState<AiSettings | null>(null);
    const [providers, setProviders] = useState<AIProviderConfig[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string>('');
    const [editingProvider, setEditingProvider] = useState<ProviderFormData | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResultState>({ status: 'idle', message: '' });
    const [showDebug, setShowDebug] = useState(false);
    const [debugEntries, setDebugEntries] = useState<ReturnType<typeof getDebugLog>>([]);
    const [showApiKey, setShowApiKey] = useState(false);

    const refreshDebug = () => setDebugEntries([...getDebugLog()]);

    const normalizeProviders = (legacy: AiSettings | null): AIProviderConfig[] => {
        const list: AIProviderConfig[] = [];
        if (legacy?.provider === 'gemini' || legacy?.geminiModel) {
            list.push({
                id: 'gemini',
                name: 'Google Gemini',
                baseURL: 'https://generativelanguage.googleapis.com/v1beta',
                apiKey: legacy?.geminiApiKey || '',
                authHeader: 'x-goog-api-key',
                endpointStyle: 'gemini',
                defaultModel: legacy?.geminiModel || DEFAULT_GEMINI_MODEL,
                models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
            });
        }
        if (legacy?.provider === 'ollama' || legacy?.ollamaUrl) {
            list.push({
                id: 'ollama',
                name: 'Ollama (Local)',
                baseURL: legacy?.ollamaUrl || 'http://localhost:11434',
                apiKey: '',
                authHeader: 'Authorization',
                endpointStyle: 'ollama',
                defaultModel: legacy?.ollamaModel || DEFAULT_OLLAMA_MODEL,
                models: ['llama3', 'llama3.1', 'llama3.2', 'llama2', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2', 'deepseek-coder-v2'],
            });
        }
        return list.length ? list : DEFAULT_PROVIDERS;
    };

    useEffect(() => {
        let active = true;
        loadAiSettings().then(s => {
            if (!active) return;
            setLegacySettings(s);
            const normalized = normalizeProviders(s);
            setProviders(normalized);
            setActiveProviderId(normalized[0]?.id || '');
        });
        return () => { active = false; };
    }, []);

    const activeProvider = providers.find(p => p.id === activeProviderId) || null;

    const handleSave = async () => {
        // TODO: migrate to new generic storage format instead of legacy AiSettings
        if (legacySettings) {
            await saveAiSettings(legacySettings);
        }
        onClose();
    };

    const handleTest = async () => {
        if (!activeProvider) return;
        setIsTesting(true);
        setTestResult({ status: 'idle', message: '' });
        try {
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

    const startCreateProvider = () => {
        setEditingProvider(emptyProvider());
        setIsCreating(true);
    };

    const startEditProvider = (provider: AIProviderConfig) => {
        setEditingProvider({
            id: provider.id,
            name: provider.name,
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            authHeader: provider.authHeader,
            endpointStyle: provider.endpointStyle,
            defaultModel: provider.defaultModel,
            models: provider.models,
        });
        setIsCreating(false);
    };

    const saveEditingProvider = () => {
        if (!editingProvider) return;
        setProviders(prev => {
            const exists = prev.find(p => p.id === editingProvider.id);
            if (exists) {
                return prev.map(p => p.id === editingProvider.id ? { ...editingProvider } : p);
            }
            return [...prev, { ...editingProvider, id: editingProvider.id || `custom-${Date.now()}` }];
        });
        setEditingProvider(null);
        setIsCreating(false);
    };

    const deleteProvider = (id: string) => {
        setProviders(prev => prev.filter(p => p.id !== id));
        setActiveProviderId(prev => prev === id ? (providers[0]?.id || '') : prev);
    };

    const applyPreset = (preset: AIProviderConfig) => {
        const exists = providers.find(p => p.id === preset.id);
        const newProvider: AIProviderConfig = exists
            ? { ...preset, apiKey: exists.apiKey }
            : { ...preset, apiKey: '' };
        setProviders(prev => {
            if (exists) {
                return prev.map(p => p.id === preset.id ? newProvider : p);
            }
            return [...prev, newProvider];
        });
        setActiveProviderId(preset.id);
    };

    const updateActiveProvider = (patch: Partial<AIProviderConfig>) => {
        if (!activeProvider) return;
        setProviders(prev => prev.map(p => p.id === activeProvider.id ? { ...p, ...patch } : p));
    };

    const updateEditingProvider = (patch: Partial<ProviderFormData>) => {
        if (!editingProvider) return;
        setEditingProvider({ ...editingProvider, ...patch });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-sm p-4">
            <div className="bg-surface-dark border border-border-dark rounded-xl shadow-glow w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">

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
                    <div className="text-xs text-text-secondary bg-background/50 p-2 rounded border border-subtle">
                        {APP_NAME} v{APP_VERSION} — Las llamadas a la API incluyen identificacion de aplicacion.
                    </div>

                    {/* Providers list */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-text-secondary">Proveedores</label>
                            <button onClick={startCreateProvider} className="text-xs px-2 py-1 rounded-md bg-accent/20 text-accent hover:bg-accent/30 transition-colors">
                                + Agregar proveedor
                            </button>
                        </div>
                        <div className="space-y-2">
                            {providers.map(provider => (
                                <div key={provider.id} className={`flex items-center gap-2 p-2 rounded-md border ${activeProviderId === provider.id ? 'border-accent bg-accent/10' : 'border-subtle bg-background/50'}`}>
                                    <button onClick={() => setActiveProviderId(provider.id)} className="flex-1 text-left text-sm text-text-primary">
                                        <div className="font-medium">{provider.name}</div>
                                        <div className="text-xs text-text-secondary">{provider.baseURL} · {provider.defaultModel}</div>
                                    </button>
                                    <button onClick={() => startEditProvider(provider)} className="text-text-secondary hover:text-text-primary text-xs px-2 py-1 rounded hover:bg-white/5">
                                        Editar
                                    </button>
                                    <button onClick={() => deleteProvider(provider.id)} className="text-text-secondary hover:text-danger text-xs px-2 py-1 rounded hover:bg-white/5">
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                            {providers.length === 0 && (
                                <p className="text-xs text-text-secondary italic">No hay proveedores configurados. Agrega uno o elige un preset.</p>
                            )}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-secondary">Presets</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_PROVIDERS.map(preset => (
                                <button key={preset.id} onClick={() => applyPreset(preset)} className="text-xs px-2 py-1 rounded-md border border-subtle text-text-secondary hover:text-text-primary hover:border-accent transition-colors">
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active provider editor */}
                    {activeProvider && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Nombre</label>
                                <input
                                    type="text"
                                    value={activeProvider.name}
                                    onChange={e => updateActiveProvider({ name: e.target.value })}
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Base URL</label>
                                <input
                                    type="text"
                                    value={activeProvider.baseURL}
                                    onChange={e => updateActiveProvider({ baseURL: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Endpoint style</label>
                                <select
                                    value={activeProvider.endpointStyle}
                                    onChange={e => updateActiveProvider({ endpointStyle: e.target.value as ProviderEndpointStyle })}
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    {ENDPOINT_STYLES.map(style => (
                                        <option key={style.value} value={style.value}>{style.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Auth header</label>
                                <input
                                    type="text"
                                    value={activeProvider.authHeader}
                                    onChange={e => updateActiveProvider({ authHeader: e.target.value })}
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">API Key</label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={activeProvider.apiKey}
                                        onChange={e => updateActiveProvider({ apiKey: e.target.value })}
                                        placeholder="sk-..."
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
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-secondary">Modelo</label>
                                <input
                                    type="text"
                                    value={activeProvider.defaultModel}
                                    onChange={e => updateActiveProvider({ defaultModel: e.target.value })}
                                    className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Test Connection */}
                    <div className="pt-4 border-t border-border-dark flex flex-col gap-3">
                        <button
                            onClick={handleTest}
                            disabled={isTesting || !activeProvider}
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
                        <button onClick={() => { refreshDebug(); setShowDebug(v => !v); }} className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
                            <InfoIcon className="w-4 h-4" />
                            {showDebug ? 'Ocultar' : 'Mostrar'} depuracion de llamadas
                        </button>

                        {showDebug && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono text-text-secondary">
                                        Registro de llamadas ({debugEntries.length})
                                    </span>
                                    <button onClick={handleClearDebug} className="text-xs text-accent hover:underline">
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
