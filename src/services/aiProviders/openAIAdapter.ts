import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult, ReasoningEffort } from './base';
import { sanitizeCredential } from './base';

const DEFAULT_TIMEOUT = 30_000;
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
  return messages.map(({ role, content }) => ({ role, content }));
}

/**
 * Build the reasoning parameter name and value based on the provider's endpoint style.
 * Different providers use different parameter names for reasoning/effort.
 */
function buildReasoningParam(effort: ReasoningEffort, endpointStyle: string): { [key: string]: unknown } | null {
  if (effort === 'off') return null;
  
  // OpenAI-compatible providers (openai-chat, openai-completion, anthropic-messages, custom)
  // For Nous and most OpenAI-compatible: use reasoning_effort or reasoning
  // For Anthropic: reasoning is an object with effort field
  switch (endpointStyle) {
    case 'anthropic-messages':
      // Anthropic uses reasoning with thought_budget_tokens or type
      return {
        reasoning: {
          type: 'equivalence',
          effort: effort === 'low' ? 1 : effort === 'medium' ? 2 : effort === 'high' ? 3 : 1,
        }
      };
    case 'openai-chat':
    case 'openai-completion':
    case 'custom':
    default:
      // Use reasoning_effort for most OpenAI-compatible APIs
      // Many providers accept this format
      return { reasoning_effort: effort };
  }
}

/**
 * Extract detailed error info from a failed response.
 * Returns status, endpoint, and body (truncated to MAX_ERROR_BODY chars).
 */
async function extractErrorInfo(response: Response, normalizedBaseURL: string, url: string): Promise<HttpErrorInfo> {
  const endpoint = `${normalizedBaseURL}${url.replace(normalizedBaseURL, '')}`;
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
    endpoint,
    body,
  };
}

export function createOpenAICompatibleProvider(config: AIProviderConfig): AIProvider {
  const sanitizedBaseURL = sanitizeCredential(config.baseURL);
  const normalizedBaseURL = sanitizedBaseURL.replace(/\/$/, '');
  const authHeader = sanitizeCredential(config.authHeader);
  const apiKey = sanitizeCredential(config.apiKey);
  const defaultModel = sanitizeCredential(config.defaultModel);
  const extraBody = config.extraBody || {};
  const reasoningEffort: ReasoningEffort = config.reasoningEffort || 'off';

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = `${normalizedBaseURL}/chat/completions`;
    
    // Build base body
    const body: Record<string, unknown> = {
      model: sanitizeCredential(options?.model || defaultModel),
      messages: mapMessages(messages),
      stream: false,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options?.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      ...(options?.stop?.length ? { stop: options.stop } : {}),
      ...extraBody,
    };

    // Add reasoning parameter only if effort is not 'off'
    const reasoningParam = buildReasoningParam(reasoningEffort, config.endpointStyle);
    if (reasoningParam) {
      Object.assign(body, reasoningParam);
    }

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
      const errorInfo = await extractErrorInfo(response, normalizedBaseURL, url);
      const errorDetail = `HTTP ${response.status} (${response.statusText}) on endpoint ${errorInfo.endpoint}\nBody: ${errorInfo.body}`;
      throw new Error(errorDetail);
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
    config: { 
      ...config, 
      apiKey, 
      authHeader, 
      defaultModel, 
      baseURL: sanitizedBaseURL,
      reasoningEffort,
    },
    testConnection,
    complete,
  };
}