import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

/** Shape of the instance returned by the GoogleGenAI constructor. */
export interface GeminiInstance {
  models: {
    generateContent: (opts: { model: string; contents: unknown[] }) => Promise<{ text?: string }>;
  };
}

/** Factory that creates a Gemini instance from an apiKey. */
export type GeminiInstanceFactory = (opts: { apiKey: string }) => GeminiInstance;

/**
 * Test/diagnostic hook: when set, the adapter uses this factory instead of
 * `require('@google/genai')`. This allows tests to verify cache isolation and
 * key sanitization without making real API calls.
 * In production this stays `null` and the real SDK is used.
 */
let _genAIFactory: GeminiInstanceFactory | null = null;
export function __setGeminiFactory(fn: GeminiInstanceFactory | null) {
  _genAIFactory = fn;
}
export function __clearGeminiFactory() {
  _genAIFactory = null;
}

/**
 * Creates a Gemini provider. Unlike the previous module-level cache, the
 * GoogleGenAI instance is stored **inside the provider closure** and is tied
 * to the specific apiKey passed at creation time. When the apiKey changes,
 * `getProvider` in the registry will build a fresh provider (because
 * `cached.config === config` fails for a new config object), so a stale
 * instance is never reused with a different key.
 */
export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  // Sanitize all credential fields at the boundary so they are never sent raw.
  const apiKey = sanitizeCredential(config.apiKey);
  const model = sanitizeCredential(config.defaultModel);
  const authHeader = sanitizeCredential(config.authHeader);
  const baseURL = sanitizeCredential(config.baseURL);

  // Instance is created lazily and cached within *this* provider closure only.
  // If a new config (different apiKey) arrives, a new provider is built by the
  // registry, so this closure's instance is naturally discarded.
  let instance: GeminiInstance | null = null;

  const getInstance = (): GeminiInstance => {
    if (!instance) {
      if (_genAIFactory) {
        instance = _genAIFactory({ apiKey });
      } else {
        // Dynamic require to avoid hard dependency when Gemini is not selected.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GoogleGenAI } = require('@google/genai') as { GoogleGenAI: new (opts: { apiKey: string }) => { models: { generateContent: (opts: { model: string; contents: unknown[] }) => Promise<{ text?: string }> } } };
        instance = new GoogleGenAI({ apiKey });
      }
    }
    return instance;
  };

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const inst = getInstance();
    const modelToUse = sanitizeCredential(options?.model || model);
    const contents = messages.map(({ role, content }) => ({ role, content }));
    const extraBody = config.extraBody || {};
    const response = await inst.models.generateContent({
      model: modelToUse,
      contents: {
        ...contents,
        ...extraBody,
      },
    });
    return (response as { text?: string }).text?.trim() || '';
  };

  const testConnection = async (): Promise<TestConnectionResult> => {
    try {
      const result = await complete(
        [{ role: 'user', content: 'Reply with a single word: OK' }],
        { model, maxTokens: 16 }
      );
      return {
        success: Boolean(result),
        details: result || 'Empty response from provider.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        error: message,
        details: message,
      };
    }
  };

  return {
    config: { ...config, apiKey, authHeader, baseURL, defaultModel: model },
    testConnection,
    complete,
  };
}

/**
 * No-op retained for backward compatibility. The Gemini provider no longer
 * caches the instance at module level (see comment above), so there is nothing
 * to invalidate globally. Each provider closure holds its own instance.
 */
export function invalidateGeminiCache() {
  /* module-level cache removed — instances are per-provider */
}
