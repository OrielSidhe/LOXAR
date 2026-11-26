/**
 * Gemini provider over the REST generateContent endpoint.
 *
 * The former adapter used `require('@google/genai')` (absent in the browser
 * ESM bundle), spread `extraBody` into an array and forwarded system/assistant
 * roles verbatim. This version uses fetch only, maps roles to the Gemini
 * contract and merges `extraBody` into the request body. Pure helpers are
 * exported for tests; every failure carries a bounded, readable message.
 */
import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';
import { sanitizeCredential, truncateErrorBody } from './base';

const DEFAULT_TIMEOUT = 180_000;
const GEMINI_VERSION = 'v1beta';

/** Build `{base}/v1beta/models/{model}:generateContent` without duplicating the version segment. */
export function buildGenerateContentUrl(baseURL: string, model: string): string {
  const base = sanitizeCredential(baseURL).replace(/\/+$/, '');
  if (!base) throw new Error('La Base URL está vacía.');
  const safeModel = encodeURIComponent(sanitizeCredential(model));
  if (!safeModel) throw new Error('El modelo está vacío.');
  const root = /(^|\/)v1beta$/.test(base) ? base : `${base}/${GEMINI_VERSION}`;
  return `${root}/models/${safeModel}:generateContent`;
}

export interface GeminiRequestBody {
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Map chat roles to Gemini: system -> systemInstruction, assistant -> model. */
export function mapGeminiMessages(
  messages: ChatMessage[],
  extraBody: Record<string, unknown> = {}
): GeminiRequestBody {
  const contents: GeminiRequestBody['contents'] = [];
  const systemParts: string[] = [];
  for (const { role, content } of messages) {
    if (role === 'system') {
      systemParts.push(content);
    } else {
      contents.push({
        role: role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
      });
    }
  }
  const body: GeminiRequestBody = { ...extraBody, contents };
  if (systemParts.length) {
    body.systemInstruction = { parts: systemParts.map(text => ({ text })) };
  }
  return body;
}

/** Extract the first candidate text, with a tolerant fallback for flat responses. */
export function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> }; text?: unknown }>;
    text?: unknown;
  };
  const parts = root.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part && typeof part.text === 'string') return part.text.trim();
    }
  }
  const direct = root.candidates?.[0]?.text ?? root.text;
  return typeof direct === 'string' ? direct.trim() : '';
}

export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const apiKey = sanitizeCredential(config.apiKey);
  const authHeader = sanitizeCredential(config.authHeader);
  const model = sanitizeCredential(config.defaultModel);
  const baseURL = sanitizeCredential(config.baseURL);
  const defaultTimeout = config.requestTimeoutMs ?? DEFAULT_TIMEOUT;
  const extraBody = config.extraBody || {};

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const url = buildGenerateContentUrl(baseURL, options?.model || model);
    const body = mapGeminiMessages(messages, extraBody);
    if (options?.temperature !== undefined || options?.maxTokens !== undefined || options?.stop?.length) {
      const generation: Record<string, unknown> = {};
      if (options?.temperature !== undefined) generation.temperature = options.temperature;
      if (options?.maxTokens !== undefined) generation.maxOutputTokens = options.maxTokens;
      if (options?.stop?.length) generation.stopSequences = options.stop;
      body.generationConfig = { ...(body.generationConfig || {}), ...generation };
    }

    if (options?.signal?.aborted) {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? defaultTimeout);
    const onAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    if (options?.signal) options.signal.addEventListener('abort', onAbort, { once: true });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-goog-api-key'] = apiKey;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(
          `HTTP ${response.status} ${response.statusText || ''} on ${url}\nBody: ${truncateErrorBody(raw)}`
        );
      }
      const payload: unknown = await response.json();
      return extractGeminiText(payload);
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (options?.signal) options.signal.removeEventListener('abort', onAbort);
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
      return { success: false, error: message, details: message };
    }
  };

  return {
    config: {
      ...config,
      apiKey,
      authHeader,
      defaultModel: model,
      baseURL,
      requestTimeoutMs: defaultTimeout,
    },
    testConnection,
    complete,
  };
}

/** Kept for API compatibility: the REST adapter holds no cache to invalidate. */
export function invalidateGeminiCache(): void {
  // Intentionally empty; no module-level instance exists.
}
