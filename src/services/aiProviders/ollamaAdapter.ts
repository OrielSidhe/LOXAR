import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';

const DEFAULT_TIMEOUT = 60_000;

async function requestWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapMessages(messages: ChatMessage[]) {
  const prompt = messages
    .map(({ role, content }) => `${role === 'assistant' ? 'Assistant' : role === 'user' ? 'User' : 'System'}: ${content}`)
    .join('\n');
  return prompt;
}

export function createOllamaProvider(config: AIProviderConfig): AIProvider {
  const normalizedBaseURL = config.baseURL.replace(/\/$/, '');

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = `${normalizedBaseURL}/api/generate`;
    const body = {
      model: options?.model || config.defaultModel,
      prompt: mapMessages(messages),
      stream: false,
      options: {
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options?.maxTokens !== undefined ? { num_predict: options.maxTokens } : {}),
      },
    };

    const response = await requestWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { [config.authHeader]: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      },
      DEFAULT_TIMEOUT
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';
  };

  const testConnection = async (): Promise<TestConnectionResult> => {
    try {
      const tagsUrl = `${normalizedBaseURL}/api/tags`;
      const response = await requestWithTimeout(
        tagsUrl,
        {
          method: 'GET',
          headers: {
            ...(config.apiKey ? { [config.authHeader]: `Bearer ${config.apiKey}` } : {}),
          },
        },
        DEFAULT_TIMEOUT
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          success: false,
          error: `HTTP ${response.status}`,
          details: `Ollama responded with code ${response.status} (${response.statusText}). URL: ${tagsUrl}. Response: ${text.slice(0, 500)}`,
        };
      }

      return {
        success: true,
        details: 'Ollama is reachable.',
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
    config,
    testConnection,
    complete,
  };
}
