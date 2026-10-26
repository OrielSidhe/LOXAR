import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 180_000;

export interface GeminiInstance {
  models: {
    generateContent: (opts: { model: string; contents: unknown[] }) => Promise<{ text?: string }>;
  };
}

export type GeminiInstanceFactory = (opts: { apiKey: string }) => GeminiInstance;

let _genAIFactory: GeminiInstanceFactory | null = null;
export function __setGeminiFactory(fn: GeminiInstanceFactory | null) {
  _genAIFactory = fn;
}
export function __clearGeminiFactory() {
  _genAIFactory = null;
}

export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const apiKey = sanitizeCredential(config.apiKey);
  const model = sanitizeCredential(config.defaultModel);
  const authHeader = sanitizeCredential(config.authHeader);
  const baseURL = sanitizeCredential(config.baseURL);
  const defaultTimeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;

  let instance: GeminiInstance | null = null;

  const getInstance = (): GeminiInstance => {
    if (!instance) {
      if (_genAIFactory) {
        instance = _genAIFactory({ apiKey });
      } else {
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
    
    // Check if aborted before making request
    if (options?.signal?.aborted) {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    }
    
    const timeoutMs = options?.timeout ?? defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Forward abort from external signal
    if (options?.signal && options.signal !== controller.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      }, { once: true });
    }

    try {
      const response = await inst.models.generateContent({
        model: modelToUse,
        contents: {
          ...contents,
          ...extraBody,
        },
      });
      return (response as { text?: string }).text?.trim() || '';
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
    config: { ...config, apiKey, authHeader, baseURL, defaultModel: model, requestTimeoutMs: defaultTimeout },
    testConnection,
    complete,
  };
}

export function invalidateGeminiCache() {
  _genAIFactory = null;
}
