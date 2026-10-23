/**
 * Generic AI provider system.
 *
 * Each provider is defined by configuration rather than hardcoded branches,
 * so new providers (StepFun, Nous, OpenAI, Together, etc.) can be added
 * from settings or persisted config without changing app code.
 */

export type ProviderEndpointStyle =
  | 'openai-chat'
  | 'openai-completion'
  | 'anthropic-messages'
  | 'ollama'
  | 'gemini'
  | 'custom';

export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export interface AIProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  authHeader: string;
  endpointStyle: ProviderEndpointStyle;
  defaultModel: string;
  models: string[];
  /** Optional JSON object merged into every provider request body (e.g. {"tags":[...]}). */
  extraBody?: Record<string, unknown>;
  requestMapper?: (messages: ChatMessage[], options?: ProviderRequestOptions) => unknown;
  responseMapper?: (data: unknown) => string;
  testEndpoint?: string;
  testMethod?: 'GET' | 'POST';
  /** Reasoning effort level for providers that support it (OpenAI-compatible, etc.). 'off' means no reasoning parameter sent. */
  reasoningEffort?: ReasoningEffort;
}

/** Regex matching leading/trailing quote characters (single, double, or backtick). */
const WRAPPING_QUOTES = /^["'`']+|["'`']+$/g;

/**
 * Strip wrapping quote characters, leading/trailing whitespace, and any
 * embedded newline/tab characters from a credential or field value.
 * This prevents keys like `sk-abc"` (trailing quote from copy-paste) from
 * being persisted or sent to the provider, which silently causes 401s.
 */
export function sanitizeCredential(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t]/g, '')
    .trim()
    .replace(WRAPPING_QUOTES, '');
}

/**
 * Expected key prefix per known provider id, used for live validation in
 * AiSettingsModal. Returns `undefined` for providers without a known prefix.
 */
export const PROVIDER_KEY_PREFIXES: Readonly<Record<string, string>> = {
  gemini: 'AIza',
  nous: 'sk-nous-',
  openrouter: 'sk-or-v1-',
  openai: 'sk-',
  groq: 'gsk-',
  stepfun: 'sk-',
  anthropic: 'sk-ant-',
};

/**
 * Returns the expected key prefix for a provider id, or `undefined` when the
 * provider has no known prefix (e.g. ollama, custom).
 */
export function getProviderKeyPrefix(providerId: string): string | undefined {
  return PROVIDER_KEY_PREFIXES[providerId];
}

/**
 * Returns true when the apiKey looks like it belongs to a *different* provider
 * based on its prefix. Used to show a non-blocking warning in the UI.
 */
export function looksLikeWrongProvider(providerId: string, apiKey: string): boolean {
  const expected = getProviderKeyPrefix(providerId);
  if (!expected || !apiKey) return false;
  return !apiKey.startsWith(expected);
}

export interface ProviderRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  details?: string;
}

export interface AIProvider {
  readonly config: AIProviderConfig;

  testConnection: () => Promise<TestConnectionResult>;
  complete: (messages: ChatMessage[], options?: ProviderRequestOptions) => Promise<string>;
}
