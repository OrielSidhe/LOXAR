import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 60_000;
const MAX_ERROR_BODY = 2000;

/** Error info extracted from an HTTP error response */
export interface HttpErrorInfo {
  status: number;
  statusText: string;
  endpoint: string;
  body: string;
}

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

/**
 * Extract detailed error info from a failed response.
 * Returns status, endpoint, and body (truncated to MAX_ERROR_BODY chars).
 */
async function extractErrorInfo(response: Response, url: string): Promise<HttpErrorInfo> {
  let body = '';
  try {
    const text = await response.text();
    body = text.length > MAX_ERROR_BODY ? text.slice(0, MAX_ERROR_BODY) + '... (truncated)' : text;
  } catch {
    body = '(unable to read response body)';
  }
  return {
    status: response.status,
    statusText: response.statusText || 'Unknown',
    endpoint: url,
    body,
  };
}

export function createOllamaProvider(config: AIProviderConfig): AIProvider {
  const sanitizedBaseURL = sanitizeCredential(config.baseURL);
  const normalizedBaseURL = sanitizedBaseURL.replace(/\/$/, '');
  const authHeader = sanitizeCredential(config.authHeader);
  const apiKey = sanitizeCredential(config.apiKey);
  const defaultModel = sanitizeCredential(config.defaultModel);
  const extraBody = config.extraBody || {};

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = `${normalizedBaseURL}/api/generate`;
    const body = {
      model: sanitizeCredential(options?.model || defaultModel),
      prompt: mapMessages(messages),
      stream: false,
      options: {
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options?.maxTokens !== undefined ? { num_predict: options.maxTokens } : {}),
      },
      ...extraBody,
    };

    const response = await requestWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { [authHeader]: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      },
      DEFAULT_TIMEOUT
    );

    if (!response.ok) {
      const errorInfo = await extractErrorInfo(response, url);
      const errorDetail = `HTTP ${response.status} (${response.statusText}) on endpoint ${errorInfo.endpoint}\nBody: ${errorInfo.body}`;
      throw new Error(errorDetail);
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
            ...(apiKey ? { [authHeader]: `Bearer ${apiKey}` } : {}),
          },
        },
        DEFAULT_TIMEOUT
      );

      if (!response.ok) {
        const errorInfo = await extractErrorInfo(response, tagsUrl);
        return {
          success: false,
          error: `HTTP ${response.status}`,
          details: `Ollama responded with code ${response.status} (${response.statusText}). URL: ${errorInfo.endpoint}. Response: ${errorInfo.body}`,
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
    config: { ...config, apiKey, authHeader, defaultModel, baseURL: sanitizedBaseURL },
    testConnection,
    complete,
  };
}