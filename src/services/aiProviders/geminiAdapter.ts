import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 180_000;

/** Shape of the instance returned by the GoogleGenAI constructor. */
export interface GeminiInstance {
  models: {
    generateContent: (opts: { model: string; contents: unknown[] }) => Promise<{ text?: string }>;
  };
}

/** Factory that creates a Gemini instance from an apiKey. */
export type GeminiInstanceFactory = (opts: { apiKey: string }) => GeminiInstance;

let _genAIFactory: GeminiInstanceFactory | null = null;
export function __setGeminiFactory(fn: GeminiInstanceFactory | null) {
  _genAIFactory = fn;
}
export function __clearGeminiFactory() {
  _genAIFactory = null;
}

/**
 * Creates an AbortController that wraps an external signal and timeout.
 * The resulting controller aborts when either the source signal aborts or timeout expires.
 */
function createGeminiAbortController(
  options?: { signal?: AbortSignal; timeout?: number }
): AbortController {
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });
  
  return controller;
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
    
    // Create abort controller that merges external signal with timeout
    const controller = createGeminiAbortController({
      signal: options?.signal,
      timeout: options?.timeout ?? defaultTimeout,
    });
    
    try {
      // Check if already aborted before making request
      if (controller.signal.aborted) {
        const err = new Error('Request was cancelled');
        err.name = 'AbortError';
        throw err;
      }
      
      const response = await inst.models.generateContent({
        model: modelToUse,
        contents: {
          ...contents,
          ...extraBody,
        },
      });
      return (response as { text?: string }).text?.trim() || '';
    } catch (error) {
      if (controller.signal.aborted) {
        const err = new Error('Request was cancelled');
        err.name = 'AbortError';
        throw err;
      }
      throw error;
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
