import type { AIProvider, AIProviderConfig, ChatMessage, ProviderRequestOptions, TestConnectionResult } from './base';

let cachedInstance: unknown = null;

export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const getInstance = () => {
    if (!cachedInstance) {
      // Dynamic import to avoid hard dependency when Gemini is not selected.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GoogleGenAI } = require('@google/genai') as { GoogleGenAI: new (opts: { apiKey: string }) => unknown };
      cachedInstance = new GoogleGenAI({ apiKey: config.apiKey });
    }
    return cachedInstance as { models: { generateContent: (opts: { model: string; contents: unknown[] }) => Promise<{ text?: string }> } };
  };

  const complete = async (messages: ChatMessage[], options?: ProviderRequestOptions): Promise<string> => {
    const instance = getInstance();
    const model = options?.model || config.defaultModel;
    const contents = messages.map(({ role, content }) => ({ role, parts: [{ text: content }] }));
    const response = await instance.models.generateContent({ model, contents });
    return (response as { text?: string }).text?.trim() || '';
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

export function invalidateGeminiCache() {
  cachedInstance = null;
}
