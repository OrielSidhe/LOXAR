import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';

const DEFAULT_TIMEOUT = 30_000;

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
  return messages.map(({ role, content }) => ({ role, content }));
}

export function createOpenAICompatibleProvider(config: AIProviderConfig): AIProvider {
  const normalizedBaseURL = config.baseURL.replace(/\/$/, '');

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = `${normalizedBaseURL}/chat/completions`;
    const body = {
      model: options?.model || config.defaultModel,
      messages: mapMessages(messages),
      stream: false,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options?.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      ...(options?.stop?.length ? { stop: options.stop } : {}),
    };

    const response = await requestWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [config.authHeader]: `Bearer ${config.apiKey}`,
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
    return data.choices?.[0]?.message?.content?.trim() || '';
  };

  const testConnection = async (): Promise<TestConnectionResult> => {
    try {
      const result = await complete(
        [{ role: 'user', content: 'Reply with a single word: OK' }],
        { model: config.defaultModel, maxTokens: 16 }
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
    config,
    testConnection,
    complete,
  };
}
