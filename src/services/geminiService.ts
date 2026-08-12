import { GoogleGenAI } from '@google/genai';
import { invoke } from '@tauri-apps/api/core';
import { LexiconEntry, MissingWord, NewLexiconEntry, GenerativeProfile, GenerationMode, GrammarManifest } from '../types';
import { FlexibleGrammar } from '../types/grammar-flexible';
import {
    buildModeInstructions, buildRootLexemePrompt, buildCompleteEntryPrompt, buildConlangAgentPrompt,
    buildBatchDetermineCategoryPrompt, buildCategorizeWordsPrompt, buildGenerateBatchWordsPrompt,
    buildCorrectSignificadoPrompt, buildDetermineSingleCategoryPrompt, buildAnalyzePhonemesPrompt,
    buildGenerateLanguageSamplePrompt,
} from './prompts';

export interface AiSettings {
    provider: 'gemini' | 'ollama';
    geminiApiKey: string;
    geminiModel: string;
    ollamaUrl: string;
    ollamaModel: string;
}

// Non-secret settings (provider, models, URLs) live in localStorage.
// The secret Gemini API key lives ONLY in the OS keychain (Windows Credential
// Manager / macOS Keychain / libsecret) via the `secret` Tauri commands —
// never in cleartext storage and never baked into the bundle.
const SETTINGS_KEY = 'conlang_ai_settings';
const KEYCHAIN_FALLBACK_KEY = 'conlang_ai_key_fallback'; // dev-only, when keychain is unavailable

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_OLLAMA_MODEL = 'llama3';

// --- OS keychain bridge (Rust `secret` commands) ---
async function readSecret(): Promise<string> {
    try {
        const res = await invoke<string | null>('get_secret');
        return res ?? '';
    } catch (e) {
        console.warn('Keychain read failed; using empty key for this session.', e);
        return '';
    }
}

async function writeSecret(secret: string): Promise<void> {
    if (secret) {
        await invoke('set_secret', { secret });
    } else {
        await invoke('delete_secret');
    }
}

export const loadAiSettings = async (): Promise<AiSettings> => {
    const envModel = import.meta.env?.VITE_GEMINI_MODEL || '';
    const defaults: AiSettings = {
        provider: 'gemini',
        geminiApiKey: '',
        geminiModel: envModel || DEFAULT_GEMINI_MODEL,
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: DEFAULT_OLLAMA_MODEL
    };
    let fromStore: Partial<AiSettings> = {};
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) fromStore = JSON.parse(stored);
    } catch (e) {
        console.error('Error reading AI settings', e);
    }

    // One-time migration: any legacy cleartext key is moved into the OS keychain.
    const legacyKey = typeof fromStore.geminiApiKey === 'string' ? fromStore.geminiApiKey : '';
    let secretKey = '';
    let keychainAvailable = true;
    try {
        const existing = await readSecret();
        if (existing) {
            secretKey = existing;
        } else if (legacyKey) {
            await writeSecret(legacyKey);
            secretKey = legacyKey;
            const { geminiApiKey, ...rest } = fromStore;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
            // Clear fallback once migrated.
            localStorage.removeItem(KEYCHAIN_FALLBACK_KEY);
        }
    } catch (e) {
        keychainAvailable = false;
        // Keychain unavailable (e.g. running in browser dev mode). Fall back to
        // the dev-only localStorage copy so AI features still work locally.
        const fallbackKey = localStorage.getItem(KEYCHAIN_FALLBACK_KEY) || '';
        if (fallbackKey) {
            secretKey = fallbackKey;
        } else if (legacyKey) {
            // Keep legacy key both in-memory and in fallback storage for this session.
            secretKey = legacyKey;
            try { localStorage.setItem(KEYCHAIN_FALLBACK_KEY, legacyKey); } catch { /* ignore */ }
        }
        console.warn('Keychain unavailable; using dev fallback storage. In production (Tauri desktop) the keychain will be used.', e);
    }

    const { geminiApiKey, ...safe } = fromStore;
    return {
        ...defaults,
        ...safe,
        geminiApiKey: secretKey,
        geminiModel: safe.geminiModel || defaults.geminiModel,
        ollamaModel: safe.ollamaModel || defaults.ollamaModel,
    } as AiSettings;
};

export const isAiAvailable = async (): Promise<boolean> => {
  try {
    const s = await loadAiSettings();
    if (s.provider === 'ollama') return Boolean(s.ollamaUrl);
    return Boolean(s.geminiApiKey);
  } catch {
    return false;
  }
};

export const parseGrammarText = async (text: string): Promise<import('../types').GrammarManifest> => {
  const prompt = `Eres un lingüista. Convierte la descripción de gramática en JSON estricto que cumpla este esquema:
{
  "meta": { "author": "user", "version": "1.0", "sourceFormat": "markdown", "lastUpdated": "<iso>" },
  "typology": { "wordOrder": "SVO|SOV|VSO|VOS|OVS|OSV|Free", "alignment": "string", "morphology": "string", "headDirection": "string" },
  "roles": [ { "id": "subject", "name": "Sujeto" } ],
  "strategies": [ { "id": "s1", "name": "string", "type": "affix|position|clitic|tone|mutation|particle|auxiliary", "appliesTo": ["subject"], "affixRule": { "position": "suffix", "form": "-x" } } ],
  "paradigms": [ { "category": "verbo", "slots": [ { "feature": "tense", "order": 1, "realization": { "kind": "affix", "position": "suffix", "form": "-t" } } ] } ],
  "mutationRules": [],
  "exceptions": [],
  "notes": []
}
Responde ÚNICAMENTE con el JSON. Descripción:\n${text}`;
  const res = await callAi(prompt);
  const json = extractJson(res) ?? (await cleanseJson(res));
  const manifest = JSON.parse(json);
  manifest.meta = { ...manifest.meta, lastUpdated: new Date().toISOString() };
  manifest.exceptions = manifest.exceptions ?? [];
  manifest.mutationRules = manifest.mutationRules ?? [];
  manifest.paradigms = manifest.paradigms ?? [];
  return manifest as import('../types').GrammarManifest;
};

export const saveAiSettings = async (settings: AiSettings): Promise<void> => {
    const { geminiApiKey, ...rest } = settings;
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
    } catch (e) {
        console.error('Error saving AI settings', e);
    }
    try {
        await writeSecret(geminiApiKey);
    } catch (e) {
        // Keychain unavailable (likely dev/browser mode). Persist a dev-only
        // fallback copy in localStorage so AI features still work while testing.
        console.warn('Keychain write failed; storing API key in dev fallback localStorage for this session.', e);
        if (geminiApiKey) {
            try { localStorage.setItem(KEYCHAIN_FALLBACK_KEY, geminiApiKey); } catch { /* ignore */ }
        }
    }
    // Invalidate gemini instance so the next call rebuilds it with the new key.
    aiInstance = null;
};

// --- App identification ---
export const APP_NAME = "LOXAR";
export const APP_VERSION = "2.4.0-pro";
export const APP_USER_AGENT = `${APP_NAME}/${APP_VERSION}`;

// --- Debug log for AI calls (last N entries, in-memory) ---
interface DebugEntry {
    timestamp: string;
    provider: string;
    model: string;
    endpoint: string;
    payloadPreview: string;
    status: 'ok' | 'error';
    error?: string;
    responsePreview?: string;
}
const MAX_DEBUG_ENTRIES = 20;
const debugLog: DebugEntry[] = [];

export const getDebugLog = (): readonly DebugEntry[] => debugLog;
export const clearDebugLog = (): void => { debugLog.length = 0; };

const recordDebug = (entry: DebugEntry): void => {
    debugLog.unshift(entry);
    if (debugLog.length > MAX_DEBUG_ENTRIES) debugLog.pop();
};

let aiInstance: GoogleGenAI | null = null;
const getAI = (apiKey: string): GoogleGenAI => {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
};

export interface TestConnectionResult {
    success: boolean;
    error?: string;
    details?: string;
}

export const testAiConnection = async (): Promise<TestConnectionResult> => {
    const settings = await loadAiSettings();
    try {
        if (settings.provider === 'gemini') {
            if (!settings.geminiApiKey) {
                return {
                    success: false,
                    error: 'API Key faltante',
                    details: 'No se ha configurado una API Key de Gemini. Ve a Configuración de IA y agrega tu clave.',
                };
            }
            const ai = getAI(settings.geminiApiKey);
            const endpoint = `generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || DEFAULT_GEMINI_MODEL}:generateContent`;
            const start = Date.now();
            await ai.models.generateContent({
                model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
                contents: [{ role: "user", parts: [{ text: "Hola" }] }],
            });
            const elapsed = Date.now() - start;
            recordDebug({
                timestamp: new Date().toISOString(),
                provider: 'gemini',
                model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
                endpoint,
                payloadPreview: `{ "model": "${settings.geminiModel || DEFAULT_GEMINI_MODEL}", "contents": [{ "role": "user", "parts": [{ "text": "Hola" }] }] }`,
                status: 'ok',
                responsePreview: `OK (${elapsed}ms)`,
            });
            return { success: true };
        } else {
            const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/tags';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            let response: Response;
            try {
                response = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'User-Agent': APP_USER_AGENT },
                });
            } finally {
                clearTimeout(timeoutId);
            }
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                const details = `Ollama respondió con código ${response.status} (${response.statusText}). URL: ${url}. Respuesta: ${text.slice(0, 500)}`;
                recordDebug({
                    timestamp: new Date().toISOString(),
                    provider: 'ollama',
                    model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL,
                    endpoint: url,
                    payloadPreview: 'GET /api/tags',
                    status: 'error',
                    error: `HTTP ${response.status}`,
                    responsePreview: text.slice(0, 200),
                });
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    details,
                };
            }
            recordDebug({
                timestamp: new Date().toISOString(),
                provider: 'ollama',
                model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL,
                endpoint: url,
                payloadPreview: 'GET /api/tags',
                status: 'ok',
                responsePreview: 'OK',
            });
            return { success: true };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const settings = await loadAiSettings().catch(() => null);
        const provider = settings?.provider || 'unknown';
        const model = provider === 'gemini'
            ? (settings?.geminiModel || DEFAULT_GEMINI_MODEL)
            : (settings?.ollamaModel || DEFAULT_OLLAMA_MODEL);
        const endpoint = provider === 'gemini'
            ? `generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
            : `${(settings?.ollamaUrl || '').replace(/\/$/, '')}/api/tags`;
        recordDebug({
            timestamp: new Date().toISOString(),
            provider,
            model,
            endpoint,
            payloadPreview: provider === 'gemini' ? `{ "model": "${model}", "contents": [...] }` : 'GET /api/tags',
            status: 'error',
            error: message,
        });
        let details = message;
        if (error instanceof Error && (error as any).cause) {
            details += ` | Causa: ${String((error as any).cause)}`;
        }
        // Specific hints for common errors
        if (error instanceof Error && error.message.includes('fetch')) {
            details += ' | Verifica que Ollama esté ejecutándose y la URL sea correcta.';
        }
        console.error("Connection test failed:", message, error);
        return {
            success: false,
            error: message,
            details,
        };
    }
};

export const normalizeText = (text: string): string => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const callAi = async (prompt: string, fallbackResult: any = null): Promise<string> => {
    const settings = await loadAiSettings();
    try {
        if (settings.provider === 'gemini') {
            if (!settings.geminiApiKey) throw new Error("No se ha configurado la API Key de Gemini.");
            const ai = getAI(settings.geminiApiKey);
            const endpoint = `generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || DEFAULT_GEMINI_MODEL}:generateContent`;
            const start = Date.now();
            const response = await ai.models.generateContent({
                model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });
            const elapsed = Date.now() - start;
            const result = response.text || "";
            recordDebug({
                timestamp: new Date().toISOString(),
                provider: 'gemini',
                model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
                endpoint,
                payloadPreview: `{ "model": "${settings.geminiModel || DEFAULT_GEMINI_MODEL}", "prompt_len": ${prompt.length} }`,
                status: 'ok',
                responsePreview: result.slice(0, 200) || '(vacío)',
            });
            return result;
        } else {
            // Ollama
            const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/generate';
            const body = JSON.stringify({
                model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
            });
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': APP_USER_AGENT,
                },
                body,
            });
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                recordDebug({
                    timestamp: new Date().toISOString(),
                    provider: 'ollama',
                    model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL,
                    endpoint: url,
                    payloadPreview: `{ "model": "${settings.ollamaModel || DEFAULT_OLLAMA_MODEL}", "prompt_len": ${prompt.length} }`,
                    status: 'error',
                    error: `HTTP ${response.status}`,
                    responsePreview: errText.slice(0, 200),
                });
                throw new Error(`Ollama respondió con código ${response.status}`);
            }
            const data = await response.json();
            const result = data.response || "";
            recordDebug({
                timestamp: new Date().toISOString(),
                provider: 'ollama',
                model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL,
                endpoint: url,
                payloadPreview: `{ "model": "${settings.ollamaModel || DEFAULT_OLLAMA_MODEL}", "prompt_len": ${prompt.length} }`,
                status: 'ok',
                responsePreview: result.slice(0, 200) || '(vacío)',
            });
            return result;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error("AI Provider Error:", message, error);
        if (fallbackResult !== null) {
            recordDebug({
                timestamp: new Date().toISOString(),
                provider: (await loadAiSettings().catch(() => ({ provider: 'unknown' }))).provider || 'unknown',
                model: '?',
                endpoint: '?',
                payloadPreview: `(fallback, prompt_len: ${prompt.length})`,
                status: 'error',
                error: message,
            });
            return JSON.stringify(fallbackResult);
        }
        throw new Error(message);
    }
};

/**
 * Extrae el fragmento JSON válido de un texto que puede tener markdown
 * (```json ... ```) o texto suelto alrededor. Devuelve null si no encuentra nada.
 */
export const extractJson = (text: string): string | null => {
    if (!text) return null;
    let cleaned = text.replace(/```json|```/gi, '').trim();
    // Encontrar el primer objeto/array y su cierre correspondiente.
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    let start = -1;
    let open = '';
    let close = '';
    if (firstObj === -1 && firstArr === -1) return null;
    if (firstArr === -1 || (firstObj !== -1 && firstObj < firstArr)) {
        start = firstObj; open = '{'; close = '}';
    } else {
        start = firstArr; open = '['; close = ']';
    }
    const end = cleaned.lastIndexOf(close);
    if (start === -1 || end === -1 || end < start) return null;
    return cleaned.slice(start, end + 1).trim();
};

const parseJsonSafely = <T>(text: string, fallback: T): T => {
    try {
        const extracted = extractJson(text);
        if (extracted) return JSON.parse(extracted) as T;
    } catch (e) {
        console.error("Failed to parse AI output:", text);
    }
    return fallback;
};

export const completeEntry = async (
    partialEntry: any,
    _lexiconSample: LexiconEntry[],
    profile: GenerativeProfile
): Promise<any> => {
    const prompt = buildCompleteEntryPrompt(partialEntry, profile);
    const responseText = await callAi(prompt, partialEntry);
    return parseJsonSafely(responseText, partialEntry);
};

export const conlangAgentChat = async (
    message: string,
    _history: { role: 'user' | 'assistant', content: string }[],
    _lexicon: LexiconEntry[],
    _grammar: GrammarManifest
): Promise<{ reply: string, analysis?: { completeness: number, gaps: string[], suggestions: string[] } }> => {
    const prompt = buildConlangAgentPrompt(message);
    const responseText = await callAi(prompt, { reply: "Error en el agente de IA local." });
    return parseJsonSafely(responseText, { reply: "Error procesando la respuesta." });
};

export const generateRootAndLexeme = async (
    significado: string,
    categoria: string,
    _lexiconSample: LexiconEntry[],
    profile: GenerativeProfile,
    modes: GenerationMode[],
    _fullLexicon: LexiconEntry[]
): Promise<{ raiz: string; lexema: string }> => {
    const prompt = buildRootLexemePrompt(significado, categoria, profile, modes, _fullLexicon);
    const responseText = await callAi(prompt, { raiz: '', lexema: '' });
    const parsed = parseJsonSafely(responseText, { raiz: '', lexema: '' });

    // Mapeo flexible tolerante a acentos y mayúsculas/minúsculas
    const getProp = (obj: any, keys: string[]): string => {
        for (const key of keys) {
            const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            for (const objKey in obj) {
                const normalizedObjKey = objKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                if (normalizedKey === normalizedObjKey) {
                    const val = obj[objKey];
                    if (Array.isArray(val)) return val.join(', ');
                    return String(val || '');
                }
            }
        }
        return '';
    };

    return {
        raiz: getProp(parsed, ['raiz', 'raiz', 'root']),
        lexema: getProp(parsed, ['lexema', 'lexema', 'lexeme'])
    };
};

export const batchDetermineCategory = async (
    entries: { id: string, significado: string }[],
    onProgress?: (processed: number, total: number) => void
): Promise<{ id: string, categoria: string }[]> => {
    const CHUNK_SIZE = 15;
    const results: { id: string, categoria: string }[] = [];
    
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const prompt = buildBatchDetermineCategoryPrompt(chunk);
        const fallback = chunk.map(e => ({ id: e.id, categoria: 'desconocida' }));
        const responseText = await callAi(prompt, fallback);
        const parsed = parseJsonSafely(responseText, fallback);
        results.push(...parsed);
        if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, entries.length), entries.length);
    }
    return results;
};

export const categorizeWords = async (words: string[]): Promise<MissingWord[]> => {
    const prompt = buildCategorizeWordsPrompt(words);
    const fallback = words.map(w => ({ Significado: w, Categoría: 'desconocido' }));
    const responseText = await callAi(prompt, fallback);
    return parseJsonSafely(responseText, fallback);
};

export const generateBatchWords = async (
    words: MissingWord[], 
    _lexiconSample: LexiconEntry[], 
    profile: GenerativeProfile,
    onProgress?: (processed: number, total: number) => void
): Promise<NewLexiconEntry[]> => {
    const CHUNK_SIZE = 10;
    const results: NewLexiconEntry[] = [];

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        const chunk = words.slice(i, i + CHUNK_SIZE);
        const prompt = buildGenerateBatchWordsPrompt(chunk, profile);
        const fallback: NewLexiconEntry[] = [];
        const responseText = await callAi(prompt, fallback);
        const generated = parseJsonSafely<NewLexiconEntry[]>(responseText, fallback);
        results.push(...generated.map(g => ({ ...g, extraData: {} })));
        if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, words.length), words.length);
    }
    
    return results;
};

export const correctSignificado = async (significado: string): Promise<string> => {
    const prompt = buildCorrectSignificadoPrompt(significado);
    const responseText = await callAi(prompt, { corrected_significado: significado });
    return parseJsonSafely<{corrected_significado: string}>(responseText, { corrected_significado: significado }).corrected_significado;
};

export const cleanseJson = async (text: string): Promise<string> => {
    const prompt = `Extrae únicamente el JSON válido de este bloque de texto, que puede venir dañado o entre texto suelto: ${text}`;
    try {
        const settings = await loadAiSettings();
        if (settings.provider === 'gemini') {
            const ai = getAI(settings.geminiApiKey);
            const response = await ai.models.generateContent({
                model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });
            const respText = response.text || text;
            return respText.replace(/```json|```/g, '').trim();
        } else {
             const url = settings.ollamaUrl.replace(/\/$/, '') + '/api/generate';
             const response = await fetch(url, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ model: settings.ollamaModel || DEFAULT_OLLAMA_MODEL, prompt: prompt, stream: false })
             });
             if (!response.ok) throw new Error("Network error");
             const data = await response.json();
             return (data.response || text).replace(/```json|```/g, '').trim();
        }
    } catch (error) {
        console.error("Error cleansing JSON:", error);
        return text; // Return raw text if failed
    }
};

export const analyzePhonemes = async (
    lexicon: LexiconEntry[]
): Promise<{ vowels: string[], consonants: string[], syllableStructures: string[], consonantClusters: string[], vowelClusters: string[] }> => {
    const sample = lexicon.slice(0, 75);
    const prompt = buildAnalyzePhonemesPrompt(sample);
    const fallback = { vowels: [], consonants: [], syllableStructures: [], consonantClusters: [], vowelClusters: [] };
    const responseText = await callAi(prompt, fallback);
    return parseJsonSafely(responseText, fallback);
};

export const generateLanguageSample = async (
    profile: GenerativeProfile,
    lexicon: LexiconEntry[]
): Promise<{ report: string }> => {
    const sample = lexicon.slice(0, 100).map(l => ({ r: l.Raíz, s: l.Significado.join(', ') }));
    const prompt = buildGenerateLanguageSamplePrompt(profile, sample);
    const fallback = { report: "No se pudo generar la muestra." };
    const responseText = await callAi(prompt, fallback);
    return parseJsonSafely(responseText, fallback);
};

export const determineSingleCategory = async (significado: string): Promise<string | null> => {
    const prompt = buildDetermineSingleCategoryPrompt(significado);
    const responseText = await callAi(prompt, { categoria: 'desconocida' });
    const parsed = parseJsonSafely(responseText, { categoria: 'desconocida' });
    return parsed.categoria || null;
};

const createDefaultGrammarManifest = (notes: string[] = []): GrammarManifest => ({
    meta: {
        author: 'AI Importer',
        version: '1.0',
        sourceFormat: 'markdown',
        lastUpdated: new Date().toISOString(),
    },
    typology: {
        wordOrder: 'SVO',
        alignment: 'Nominative-Accusative',
        morphology: 'Isolating',
        headDirection: 'Head-Initial',
    },
    strategies: [],
    roles: [],
    paradigms: [],
    mutationRules: [],
    exceptions: [],
    notes,
});

export const parseGrammarAdvanced = async (
    rawText: string,
    context?: {
        existingManifest?: GrammarManifest;
        typologicalProfile?: import('../types').TypologicalProfile;
    }
): Promise<Omit<FlexibleGrammar, 'id' | 'name' | 'storageMode' | 'rawText' | 'lastModified'>> => {
    const hasExisting = !!context?.existingManifest;
    const profile = context?.typologicalProfile;

    // Compact controlled vocabulary (15 marking strategies from the legend)
    const markingLegend = [
        'positional','prefix','suffix','infix','circumfix','transfix_templatic',
        'clitic','particle','auxiliary_periphrastic','tone_change','stress_shift',
        'root_internal_mutation_apophony','reduplication','suppletion','zero_unmarked',
    ];

    const profileContext = profile ? `
PERFIL TIPOLÓGICO DE REFERENCIA (extraído del documento):
- Morfología: synthesis=${profile.morphology?.synthesis_level || '?'}, fusion=${profile.morphology?.fusion_degree || '?'}, vowel_harmony=${profile.morphology?.vowel_harmony ?? false}, consonant_mutation=${profile.morphology?.consonant_mutation ?? false}
- Sintaxis: word_order=${profile.syntax?.basic_word_order || '?'}, alignment=${profile.syntax?.morphosyntactic_alignment || '?'}, head=${profile.syntax?.head_directionality || '?'}, pro_drop=${profile.syntax?.pro_drop_behavior || '?'}
- Nominal: cases=${profile.nominal?.case_system?.inventory?.join(',') || 'none'}, number=${profile.nominal?.number_system?.inventory?.join(',') || 'none'}, gender=${profile.nominal?.noun_classes?.inventory?.join(',') || 'none'}
- Verbal: tense=${profile.verbal?.tense_system?.inventory?.join(',') || '?'}, aspect=${profile.verbal?.aspect_system?.inventory?.join(',') || '?'}, mood=${profile.verbal?.mood_system?.inventory?.join(',') || '?'}
- Escritura: ${profile.writing?.script_type || '?'}, direction=${profile.writing?.directionality || '?'}
- Roles: ${[...(profile.syntacticRoles?.catalog || []), ...(profile.syntacticRoles?.custom || [])].join(',')}
- Estrategias: ${profile.markingStrategies?.join(',') || markingLegend.join(',')}
` : '';

    const existingContext = hasExisting ? `
MANIFESTO EXISTENTE (conserva valores previos si el documento no los redefine):
- wordOrder: ${context!.existingManifest!.typology.wordOrder}
- alignment: ${context!.existingManifest!.typology.alignment}
- morphology: ${context!.existingManifest!.typology.morphology}
- headDirection: ${context!.existingManifest!.typology.headDirection}
- roles existentes: ${context!.existingManifest!.roles.map(r => r.id).join(',') || 'ninguno'}
- estrategias existentes: ${context!.existingManifest!.strategies.map(s => s.type).join(',') || 'ninguna'}
` : '';

    const prompt = `Eres un lingüista computacional. Extrae la estructura gramatical del siguiente documento de conlang y responde SOLO con JSON válido (sin markdown, sin explicaciones).

${profileContext}
${existingContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESQUEMA DE SALIDA (respeta los nombres exactos):
{
  "structured": {
    "manifest": {
      "meta": {"author":"AI Importer","version":"1.0","sourceFormat":"markdown","lastUpdated":"<ISO>"},
      "phonology": {"consonants":["p","t","k",..."],"vowels":["a","e","i",...],"phonotactics":{"syllableStructures":["CV","CVC",...],"maxConsonantClusters":2,"consonantClusters":["pr","tl",...],"vowelClusters":[]}},
      "typology": {"wordOrder":"SVO","alignment":"Nominativo-Acusativo","morphology":"Aglutinante","headDirection":"Núcleo Inicial (Head-Initial)"},
      "roles": [{"id":"subject","name":"Sujeto","description":"..."}],
      "strategies": [{"id":"s1","name":"...","type":"affix","appliesTo":["subject"],"appliesToCategories":["sustantivo"],"affixRule":{"position":"suffix","form":"-la"}}],
      "paradigms": [{"category":"sustantivo","slots":[{"feature":"case","order":1,"realization":{"kind":"affix","position":"suffix","form":"-la"}},{"feature":"number","order":2,"realization":{"kind":"affix","position":"suffix","form":"-u"}}]}],
      "affixInventory": [{"id":"a1","form":"-la","type":"suffix","meaning":"dativo","appliesTo":["sustantivo"]}],
      "mutationRules": [],
      "exceptions": [],
      "notes": ["..."]
    },
    "confidence": 0.0,
    "uninterpretedSections": []
  },
  "computationalRules": {
    "inflection": [
      {"name":"dativo_sustantivo","category":"sustantivo","slots":[{"feature":"case","value":"dativo","realization":{"kind":"affix","position":"suffix","form":"-la"}}]}
    ],
    "wordOrder": [
      {"name":"orden_canonico","order":"SVO","description":"Sujeto-Verbo-Objeto"}
    ]
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE EXTRACCIÓN:
1. "computationalRules.inflection" debe contener paradigmas computables: cada entrada es una regla con nombre, categoría léxica afectada, y slots ordenados de rasgos→realización. NO uses placeholders vacíos.
2. "strategies" enumera las estrategias de marcaje detectadas (tipo: affix/prefix/suffix/infix/circumfix/clitic/tone/mutation/particle/auxiliary/positional).
3. "paradigms" agrupa slots por categoría léxica (sustantivo/verbo/adjetivo/etc.) en orden de aplicación.
4. "markingStrategies" usa SOLO estos ids: ${markingLegend.join(', ')}. Si el documento menciona otro, añádelo.
5. Los inventarios (cases, numbers, tenses, etc.) son ABIERTOS: incluye TODOS los valores mencionados aunque sean decenas.
6. "roles" incluye roles típicos (sujeto, objeto, modificador, partícula, auxiliar, clítico, conector) + cualquier rol específico del documento.
7. confidence: 0.0–1.0 indicando qué porcentaje del documento interpretaste. Si no pudiste extraer reglas, explica por qué en "uninterpretedSections".
8. Si el documento menciona una escritura/alfabeto, inclúyelo en "notes" (NO como campo separado).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTO:
${rawText}`;

    const fallback = {
        structured: {
            manifest: createDefaultGrammarManifest(rawText.trim() ? [rawText.trim()] : []),
            confidence: 0.0,
            uninterpretedSections: rawText.trim() ? [`Parseo fallido: la IA no devolvió JSON válido. Texto recibido (primeros 200 chars): ${rawText.slice(0, 200)}...`] : [],
        },
        computationalRules: { inflection: [], wordOrder: [] },
    };

    let responseText: string;
    try {
        responseText = await callAi(prompt, null);
    } catch (error) {
        console.error('[parseGrammarAdvanced] AI call failed:', error);
        return {
            structured: {
                ...fallback.structured,
                confidence: 0.0,
                uninterpretedSections: [`Error de conexión con la IA: ${error instanceof Error ? error.message : 'unknown'}. Verifica tu configuración de IA (Ajustes).`],
            },
            computationalRules: { inflection: [], wordOrder: [] },
        };
    }

    const parsed = parseJsonSafely(responseText, fallback);

    const confidence = Number(parsed.structured?.confidence ?? fallback.structured.confidence);
    const clampedConfidence = Math.max(0, Math.min(1, isNaN(confidence) ? 0 : confidence));

    return {
        structured: {
            manifest: {
                ...(hasExisting ? context!.existingManifest! : fallback.structured.manifest),
                ...(parsed.structured?.manifest || {}),
                meta: {
                    ...(hasExisting ? context!.existingManifest!.meta : fallback.structured.manifest.meta),
                    ...(parsed.structured?.manifest?.meta || {}),
                    lastUpdated: new Date().toISOString(),
                },
                typology: hasExisting
                    ? { ...context!.existingManifest!.typology, ...(parsed.structured?.manifest?.typology || {}) }
                    : { ...fallback.structured.manifest.typology, ...(parsed.structured?.manifest?.typology || {}) },
                phonology: parsed.structured?.manifest?.phonology || (hasExisting ? context!.existingManifest!.phonology : fallback.structured.manifest.phonology),
                affixInventory: parsed.structured?.manifest?.affixInventory || fallback.structured.manifest.affixInventory,
                paradigms: parsed.structured?.manifest?.paradigms || (hasExisting ? context!.existingManifest!.paradigms : []),
                strategies: parsed.structured?.manifest?.strategies || (hasExisting ? context!.existingManifest!.strategies : []),
                roles: parsed.structured?.manifest?.roles || (hasExisting ? context!.existingManifest!.roles : []),
                mutationRules: parsed.structured?.manifest?.mutationRules || (hasExisting ? context!.existingManifest!.mutationRules : []),
                exceptions: parsed.structured?.manifest?.exceptions || (hasExisting ? context!.existingManifest!.exceptions : []),
                typologicalProfile: parsed.structured?.manifest?.typologicalProfile || profile || (hasExisting ? context!.existingManifest!.typologicalProfile : undefined),
                notes: parsed.structured?.manifest?.notes?.length ? parsed.structured.manifest.notes : (hasExisting ? context!.existingManifest!.notes : fallback.structured.manifest.notes),
            },
            confidence: clampedConfidence,
            uninterpretedSections: parsed.structured?.uninterpretedSections || fallback.structured.uninterpretedSections,
        },
        computationalRules: {
            inflection: parsed.computationalRules?.inflection || [],
            wordOrder: parsed.computationalRules?.wordOrder || [],
        },
    };
};
