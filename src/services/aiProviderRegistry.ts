import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult, ReasoningEffort } from './aiProviders/base';
import { createGeminiProvider, invalidateGeminiCache } from './aiProviders/geminiAdapter';
import { createOllamaProvider } from './aiProviders/ollamaAdapter';
import { createOpenAICompatibleProvider, type HttpErrorInfo } from './aiProviders/openAIAdapter';
import { sanitizeCredential } from './aiProviders/base';

export type {
  AIProviderConfig,
  ChatMessage,
  ProviderRequestOptions,
  TestConnectionResult,
  ProviderEndpointStyle,
  ReasoningEffort,
} from './aiProviders/base';
export { sanitizeCredential, getProviderKeyPrefix, looksLikeWrongProvider } from './aiProviders/base';
export type { HttpErrorInfo } from './aiProviders/openAIAdapter';

export interface AISettings {
  activeProviderId: string;
  providers: AIProviderConfig[];
}

export const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    authHeader: 'x-goog-api-key',
    endpointStyle: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    reasoningEffort: 'off',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseURL: 'http://localhost:11434',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'ollama',
    defaultModel: 'llama3',
    models: ['llama3', 'llama3.1', 'llama3.2', 'llama2', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2', 'deepseek-coder-v2'],
    reasoningEffort: 'off',
  },
];

/**
 * Presets that the user can apply from the AI settings UI.
 * These are *templates* — applying a preset creates/updates a provider
 * entry but never overwrites an existing API key.
 */
/**
 * Default Nous user tag. Nous rejects requests without `tags: ["user=<uid>"]`,
 * so the preset ships a documented placeholder that the user replaces with
 * their own UID in the provider form (FASE E, v3.13).
 */
export const NOUS_DEFAULT_USER_TAG = 'loxar';

/** Build the Nous preset with a configurable user tag (required by Nous). */
export function buildNousPreset(userTag: string): AIProviderConfig {
  const tag = userTag.trim() || NOUS_DEFAULT_USER_TAG;
  return {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://api.nousresearch.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'stepfun/step-3.7-flash:free',
    models: [
      'stepfun/step-3.7-flash:free',
      'poolside/laguna-s-2.1:free',
      'meituan/longcat-2.5-preview:free',
      'upstage/solar-mini4:free',
      'reflection/beam-1.0-501b-a23b:free',
    ],
    extraBody: { tags: [`user=${tag}`] },
    reasoningEffort: 'off',
  };
}

export const PRESET_PROVIDERS: AIProviderConfig[] = [
  buildNousPreset(NOUS_DEFAULT_USER_TAG),
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    reasoningEffort: 'off',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'openai/gpt-oss-120b',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
    reasoningEffort: 'off',
  },
  {
    id: 'stepfun',
    name: 'StepFun',
    baseURL: 'https://api.stepfun.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'step-2-16k',
    models: ['step-2-16k', 'step-1-8k', 'step-1-32k', 'step-1-128k', 'step-1-256k'],
    reasoningEffort: 'off',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'meta-llama-3.1-8b-instruct:free',
    models: [
      'meta-llama-3.1-8b-instruct:free',
      'meta-llama-3.1-70b-instruct:free',
      'nousresearch/hermes-3-llama-3.1-405b',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
    ],
    reasoningEffort: 'off',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseURL: 'https://api.cloudflare.com/client/v4/accounts/REPLACE_WITH_ACCOUNT_ID/ai/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: '@cf/meta/llama-3.1-8b-instruct',
    models: [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.2',
      '@cf/qwen/qwen2.5-coder-32b-instruct',
    ],
    reasoningEffort: 'off',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
    models: [
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'qwen/qwen2.5-coder-32b-instruct',
    ],
    reasoningEffort: 'off',
  },
  {
    id: 'ollama-openai',
    name: 'Ollama (OpenAI-compatible)',
    baseURL: 'http://localhost:11434/v1',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'llama3.2', 'qwen2.5', 'mistral', 'phi3'],
    reasoningEffort: 'off',
  },
];

/** Shape of the legacy AiSettings stored under key `conlang_ai_settings`. */
export interface LegacyAiSettings {
  provider: 'gemini' | 'ollama';
  geminiApiKey: string;
  geminiModel: string;
  ollamaUrl: string;
  ollamaModel: string;
}

/**
 * Convert legacy AiSettings into the generic AISettings format.
 * Used once during migration so existing users don't lose their config.
 */
export function migrateLegacyToGeneric(legacy: LegacyAiSettings): AISettings {
  const providers: AIProviderConfig[] = [];

  if (legacy.provider === 'gemini' || legacy.geminiModel) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: legacy.geminiApiKey || '',
      authHeader: 'x-goog-api-key',
      endpointStyle: 'gemini',
      defaultModel: legacy.geminiModel || 'gemini-2.5-flash',
      models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
      reasoningEffort: 'off',
    });
  }

  if (legacy.provider === 'ollama' || legacy.ollamaUrl) {
    providers.push({
      id: 'ollama',
      name: 'Ollama (Local)',
      baseURL: legacy.ollamaUrl || 'http://localhost:11434',
      apiKey: '',
      authHeader: 'Authorization',
      endpointStyle: 'ollama',
      defaultModel: legacy.ollamaModel || 'llama3',
      models: ['llama3', 'llama3.1', 'llama3.2', 'llama2', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2', 'deepseek-coder-v2'],
      reasoningEffort: 'off',
    });
  }

  return {
    activeProviderId: legacy.provider === 'gemini' ? 'gemini' : 'ollama',
    providers: providers.length ? providers : DEFAULT_PROVIDERS,
  };
}

/**
 * Convenience: return the active provider config from a generic AISettings.
 * Falls back to the first provider or null.
 */
export function getActiveProviderConfig(config: AISettings): AIProviderConfig | undefined {
  return config.providers.find(p => p.id === config.activeProviderId) || config.providers[0];
}

const registry = new Map<string, AIProvider>();

/**
 * Keeps the switch exhaustive: once every ProviderEndpointStyle is handled,
 * `config.endpointStyle` narrows to `never` in the default branch. Widening
 * through `String` preserves the offending value from hand-edited config.
 */
function unsupportedEndpointStyle(style: never): string {
  return `Unsupported provider endpoint style: ${String(style)}`;
}

function buildProvider(config: AIProviderConfig): AIProvider {
  switch (config.endpointStyle) {
    case 'gemini':
      return createGeminiProvider(config);
    case 'ollama':
      return createOllamaProvider(config);
    case 'openai-chat':
    case 'openai-completion':
    case 'anthropic-messages':
    case 'custom':
      return createOpenAICompatibleProvider(config);
    default:
      throw new Error(unsupportedEndpointStyle(config.endpointStyle));
  }
}

export function getProvider(config: AIProviderConfig): AIProvider {
  const cached = registry.get(config.id);
  if (cached && cached.config === config) {
    return cached;
  }
  const provider = buildProvider(config);
  registry.set(config.id, provider);
  return provider;
}

export function invalidateProviderCache(id?: string) {
  if (id) {
    registry.delete(id);
  } else {
    registry.clear();
  }
  if (id === 'gemini' || !id) {
    invalidateGeminiCache();
  }
}

export async function testProviderConnection(config: AIProviderConfig): Promise<TestConnectionResult> {
  const provider = getProvider(config);
  return provider.testConnection();
}

export async function completeWithProvider(
  config: AIProviderConfig,
  messages: ChatMessage[],
  options?: ProviderRequestOptions
): Promise<string> {
  const provider = getProvider(config);
  return provider.complete(messages, options);
}

const GENERIC_AI_SETTINGS_KEY = 'conlang_ai_settings_generic';

/** Sanitize all string credential fields on every provider before persisting. */
function sanitizeProviders(providers: AIProviderConfig[]): AIProviderConfig[] {
  return providers.map(p => ({
    ...p,
    apiKey: sanitizeCredential(p.apiKey),
    authHeader: sanitizeCredential(p.authHeader),
    defaultModel: sanitizeCredential(p.defaultModel),
    baseURL: sanitizeCredential(p.baseURL),
    models: p.models?.map(m => sanitizeCredential(m)) || [],
  }));
}

export async function loadGenericAISettings(): Promise<AISettings> {
  const defaults: AISettings = {
    activeProviderId: DEFAULT_PROVIDERS[0]?.id || 'gemini',
    providers: DEFAULT_PROVIDERS,
  };
  try {
    const stored = localStorage.getItem(GENERIC_AI_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AISettings;
      if (parsed && Array.isArray(parsed.providers) && parsed.activeProviderId) {
        // Sanitize on read too — guards against data written by older versions
        // or hand-edited localStorage entries with stray quotes.
        return {
          activeProviderId: sanitizeCredential(parsed.activeProviderId),
          providers: sanitizeProviders(parsed.providers),
        };
      }
    }
  } catch (e) {
    console.error('Error reading generic AI settings', e);
  }
  return defaults;
}

export async function saveGenericAISettings(settings: AISettings): Promise<void> {
  try {
    const sanitized: AISettings = {
      activeProviderId: sanitizeCredential(settings.activeProviderId),
      providers: sanitizeProviders(settings.providers),
    };
    localStorage.setItem(GENERIC_AI_SETTINGS_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving generic AI settings', e);
  }
  invalidateProviderCache();
}
