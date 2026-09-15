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

export interface AIProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  authHeader: string;
  endpointStyle: ProviderEndpointStyle;
  defaultModel: string;
  models: string[];
  requestMapper?: (messages: ChatMessage[], options?: ProviderRequestOptions) => unknown;
  responseMapper?: (data: unknown) => string;
  testEndpoint?: string;
  testMethod?: 'GET' | 'POST';
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
