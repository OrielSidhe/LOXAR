import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 180_000;

function createOllamaAbortController(
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

export function createOllamaProvider(config: AIProviderConfig): AIProvider {
  const sanitizedBaseURL = sanitizeCredential(config.baseURL);
  const defaultModel = sanitizeCredential(config.defaultModel);
  const defaultTimeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = `${sanitizedBaseURL}/api/chat`;
    
    const controller = createOllamaAbortController({
      signal: options?.signal,
      timeout: options?.timeout ?? defaultTimeout,
    });
    
    if (controller.signal.aborted) {
      const err = new Error('Request was cancelled');
      err.name = 'AbortError';
      throw err;
    }
    
    const body = {
      model: options?.model || defaultModel,
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: false,
      options: {
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.maxTokens !== undefined && { num_predict: options.maxTokens }),
      },
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
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}\n${text}`);
      }

      const data = await response.json();
      return data.message?.content?.trim() || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw error;
    }
  };

  const testConnection = async (): Promise<TestConnectionResult> => {
    try {
      const result = await fetch(`${sanitizedBaseURL}/api/tags`, { method: 'GET' });
      if (!result.ok) {
        return { success: false, error: 'Connection failed', details: `HTTP ${result.status}` };
      }
      return { success: true, details: 'Connection OK' };
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
