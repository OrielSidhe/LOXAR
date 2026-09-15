import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './aiProviders/base';
import { createGeminiProvider, invalidateGeminiCache } from './aiProviders/geminiAdapter';
import { createOllamaProvider } from './aiProviders/ollamaAdapter';
import { createOpenAICompatibleProvider } from './aiProviders/openAIAdapter';

export type { AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult, ProviderEndpointStyle } from './aiProviders/base';

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
  },
];

const registry = new Map<string, AIProvider>();

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
      throw new Error(`Unsupported provider endpoint style: ${(config as any).endpointStyle}`);
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
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading generic AI settings', e);
  }
  return defaults;
}

export async function saveGenericAISettings(settings: AISettings): Promise<void> {
  try {
    localStorage.setItem(GENERIC_AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving generic AI settings', e);
  }
  invalidateProviderCache();
}
