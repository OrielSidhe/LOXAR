import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 180_000;

export function createOllamaProvider(config: AIProviderConfig): AIProvider {
  const sanitizedBaseURL = sanitizeCredential(config.baseURL).replace(/\/+$/, ''); // Remove trailing slashes
  const defaultModel = sanitizeCredential(config.defaultModel);
  const defaultTimeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    // Create fresh abort controller for this request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), defaultTimeout);
    
    // If external signal is provided and already aborted, throw immediately
    if (options?.signal?.aborted) {
      clearTimeout(timeoutId);
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    }
    
    // Forward abort from external signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      }, { once: true });
    }

    const url = `${sanitizedBaseURL}/api/generate`;
    const body = {
      model: options?.model || defaultModel,
      prompt: messages.map(({ role, content }) => `${role}: ${content}`).join('\n'),
      stream: false,
      ...config.extraBody,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} (${response.statusText}) on endpoint ${url}\nBody: ${text}`);
      }

      const data = await response.json();
      return data.response?.trim() || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const testConnection = async (): Promise<TestConnectionResult> => {
    try {
      const result = await fetch(`${sanitizedBaseURL}/api/tags`, { method: 'GET' });
      if (!result.ok) {
        return { success: false, error: 'Connection failed', details: `HTTP ${result.status}` };
      }
      return { success: true, details: 'Ollama is reachable.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message, details: message };
    }
  };

  return {
    config: { ...config, baseURL: sanitizedBaseURL, defaultModel, requestTimeoutMs: defaultTimeout },
    complete,
    testConnection,
  };
}
