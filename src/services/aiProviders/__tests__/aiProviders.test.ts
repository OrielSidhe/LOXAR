import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIProviderConfig } from '../base';
import { sanitizeCredential, getProviderKeyPrefix, looksLikeWrongProvider, PROVIDER_KEY_PREFIXES } from '../base';
import { createGeminiProvider, invalidateGeminiCache, __setGeminiFactory, __clearGeminiFactory } from '../geminiAdapter';
import { createOpenAICompatibleProvider } from '../openAIAdapter';
import { createOllamaProvider } from '../ollamaAdapter';

// No top-level mock for @google/genai — the Gemini adapter tests below use
// vi.doMock + dynamic import so that require('@google/genai') inside the
// adapter's getInstance() picks up the mock. Top-level vi.mock with
// conditional-export packages like @google/genai can be unreliable.

// ---------------------------------------------------------------------------
// sanitizeCredential
// ---------------------------------------------------------------------------
describe('sanitizeCredential', () => {
  it('strips trailing double-quote (key+quoted-by-copy-paste)', () => {
    expect(sanitizeCredential('sk-abc"')).toBe('sk-abc');
  });

  it('strips leading and trailing single quotes', () => {
    expect(sanitizeCredential("'sk-abc'")).toBe('sk-abc');
  });

  it('strips backticks', () => {
    expect(sanitizeCredential('`sk-abc`')).toBe('sk-abc');
  });

  it('strips leading/trailing whitespace', () => {
    expect(sanitizeCredential('  sk-abc  ')).toBe('sk-abc');
  });

  it('strips embedded newlines and tabs', () => {
    expect(sanitizeCredential('sk-ab\tc\n')).toBe('sk-abc');
  });

  it('does not strip quotes in the middle of the value', () => {
    expect(sanitizeCredential('sk-abc"def')).toBe('sk-abc"def');
  });

  it('returns empty string for undefined / non-string', () => {
    expect(sanitizeCredential(undefined as unknown as string)).toBe('');
    expect(sanitizeCredential(null as unknown as string)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeCredential('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Provider key prefix validation
// ---------------------------------------------------------------------------
describe('PROVIDER_KEY_PREFIXES / getProviderKeyPrefix / looksLikeWrongProvider', () => {
  it('has the correct expected prefixes', () => {
    expect(PROVIDER_KEY_PREFIXES.gemini).toBe('AIza');
    expect(PROVIDER_KEY_PREFIXES.nous).toBe('sk-nous-');
    expect(PROVIDER_KEY_PREFIXES.openrouter).toBe('sk-or-v1-');
    expect(PROVIDER_KEY_PREFIXES.openai).toBe('sk-');
    expect(PROVIDER_KEY_PREFIXES.groq).toBe('gsk-');
  });

  it('returns undefined for providers without a known prefix', () => {
    expect(getProviderKeyPrefix('ollama')).toBeUndefined();
    expect(getProviderKeyPrefix('custom')).toBeUndefined();
    expect(getProviderKeyPrefix('nonexistent')).toBeUndefined();
  });

  it('looksLikeWrongProvider returns true when prefix mismatches', () => {
    expect(looksLikeWrongProvider('gemini', 'sk-nous-abc')).toBe(true);
    expect(looksLikeWrongProvider('nous', 'AIza-abc')).toBe(true);
    expect(looksLikeWrongProvider('openrouter', 'sk-nous-abc')).toBe(true);
  });

  it('looksLikeWrongProvider returns false when prefix matches', () => {
    expect(looksLikeWrongProvider('gemini', 'AIzasyabcdef')).toBe(false);
    expect(looksLikeWrongProvider('nous', 'sk-nous-abc')).toBe(false);
  });

  it('looksLikeWrongProvider returns false for empty key or no expected prefix', () => {
    expect(looksLikeWrongProvider('gemini', '')).toBe(false);
    expect(looksLikeWrongProvider('ollama', 'any-key')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OpenAI-compatible adapter: sanitization + extraBody merge
// ---------------------------------------------------------------------------
describe('createOpenAICompatibleProvider', () => {
  const baseConfig: AIProviderConfig = {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://inference-api.nousresearch.com/v1',
    apiKey: 'sk-test-123',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'poolside/laguna-s-2.1:free',
    models: [],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sanitizes apiKey with trailing quote before sending', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      captured.push({ url, init, body });
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider({
      ...baseConfig,
      apiKey: 'sk-test-123"',
      baseURL: '  https://example.com/  ',
    });
    await provider.complete([{ role: 'user', content: 'hi' }]);

    const headers = captured[0].init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test-123');
    expect(captured[0].url).toBe('https://example.com/chat/completions');
  });

  it('merges extraBody into the request body', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      captured.push(body);
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider({
      ...baseConfig,
      extraBody: { tags: ['conlang', 'test'], user: 'abc' },
    });
    await provider.complete([{ role: 'user', content: 'hi' }]);

    expect(captured[0]).toMatchObject({
      model: 'poolside/laguna-s-2.1:free',
      tags: ['conlang', 'test'],
      user: 'abc',
    });
  });

  it('returns sanitized config in provider.config', () => {
    const provider = createOpenAICompatibleProvider({
      ...baseConfig,
      apiKey: ' sk-key" ',
      baseURL: '  https://x.com/ ',
      defaultModel: '  gpt-4o  ',
      authHeader: '  Authorization  ',
    });
    expect(provider.config.apiKey).toBe('sk-key');
    expect(provider.config.baseURL).toBe('https://x.com/');
    expect(provider.config.defaultModel).toBe('gpt-4o');
    expect(provider.config.authHeader).toBe('Authorization');
  });
});

// ---------------------------------------------------------------------------
// Ollama adapter: sanitization + extraBody merge
// ---------------------------------------------------------------------------
describe('createOllamaProvider', () => {
  const baseConfig: AIProviderConfig = {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseURL: 'http://localhost:11434',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'ollama',
    defaultModel: 'llama3',
    models: [],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sanitizes baseURL and model before sending', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      captured.push({ url, body });
      return Promise.resolve(new Response(JSON.stringify({ response: 'OK' }), { status: 200 }));
    });

    const provider = createOllamaProvider({
      ...baseConfig,
      baseURL: '  http://localhost:11434/  ',
      defaultModel: '  llama3.1  ',
    });
    await provider.complete([{ role: 'user', content: 'hi' }]);

    expect(captured[0].url).toBe('http://localhost:11434/api/generate');
    expect(captured[0].body.model).toBe('llama3.1');
  });

  it('merges extraBody into the request body', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      captured.push(body);
      return Promise.resolve(new Response(JSON.stringify({ response: 'OK' }), { status: 200 }));
    });

    const provider = createOllamaProvider({
      ...baseConfig,
      extraBody: { tags: ['tag1'] },
    });
    await provider.complete([{ role: 'user', content: 'hi' }]);

    expect(captured[0]).toMatchObject({
      tags: ['tag1'],
      model: 'llama3',
    });
  });

  it('testConnection hits /api/tags and returns success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ models: [] }), { status: 200 })
    );
    const provider = createOllamaProvider(baseConfig);
    const result = await provider.testConnection();
    expect(result.success).toBe(true);
    expect(result.details).toBe('Ollama is reachable.');
  });
});

// ---------------------------------------------------------------------------
// Gemini adapter: cache isolation (no module-level instance leak)
// ---------------------------------------------------------------------------
describe('createGeminiProvider — cache isolation', () => {
  const makeConfig = (apiKey: string): AIProviderConfig => ({
    id: 'gemini', name: 'Gemini', baseURL: 'https://x', apiKey,
    authHeader: 'x-goog-api-key', endpointStyle: 'gemini',
    defaultModel: 'gemini-2.5-flash', models: [],
  });
  afterEach(() => {
    __clearGeminiFactory();
    invalidateGeminiCache();
  });

  it('creates a new instance for each different apiKey (no module-level cache leak)', async () => {
    const calls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      calls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    const providerA = createGeminiProvider(makeConfig('key-aaa'));
    await providerA.complete([{ role: 'user', content: 'hi' }]);

    const providerB = createGeminiProvider(makeConfig('key-bbb'));
    await providerB.complete([{ role: 'user', content: 'hi' }]);

    expect(calls).toHaveLength(2);
    expect(calls[0]).toBe('key-aaa');
    expect(calls[1]).toBe('key-bbb');
  });

  it('sanitizes apiKey before passing to GoogleGenAI constructor', async () => {
    const calls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      calls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    const provider = createGeminiProvider(makeConfig('key-aaa'));
    await provider.complete([{ role: 'user', content: 'hi' }]);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe('key-aaa');
  });

  it('sanitizes apiKey with trailing quote before passing to factory', async () => {
    const calls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      calls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    const dirtyKey = 'key-aaa' + String.fromCharCode(34); // key-aaa"
    const provider = createGeminiProvider({
      ...makeConfig(dirtyKey),
      apiKey: dirtyKey,
    });
    await provider.complete([{ role: 'user', content: 'hi' }]);

    expect(calls[0]).toBe('key-aaa');
  });

  it('returns sanitized config in provider.config', () => {
    const provider = createGeminiProvider({
      id: 'gemini', name: 'Gemini', baseURL: '  https://x/  ', apiKey: 'key-aaa"',
      authHeader: 'x-goog-api-key', endpointStyle: 'gemini',
      defaultModel: '  gemini-2.5-flash', models: [],
    });
    expect(provider.config.apiKey).toBe('key-aaa');
    expect(provider.config.baseURL).toBe('https://x/');
    expect(provider.config.defaultModel).toBe('gemini-2.5-flash');
  });

  it('invalidateGeminiCache is a safe no-op (instances are per-provider)', () => {
    expect(() => invalidateGeminiCache()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase X: HTTP 400 body surfacing
// ---------------------------------------------------------------------------
describe('Phase X: HTTP 400 body surfacing', () => {
  const openAiConfig: AIProviderConfig = {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://inference-api.nousresearch.com/v1',
    apiKey: 'sk-test-123',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'poolside/laguna-s-2.1:free',
    models: [],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws error with status, endpoint, and body when HTTP 400 is returned (OpenAI-compatible)', async () => {
    const mockBody = JSON.stringify({
      error: {
        message: 'invalid_request_error: The request was malformed',
        type: 'invalid_request_error',
        code: 400,
      }
    });
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(mockBody, {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' }
      }))
    );

    const provider = createOpenAICompatibleProvider(openAiConfig);
    const error = await provider.complete([{ role: 'user', content: 'test' }]).catch(e => e);

    expect(error.message).toContain('HTTP 400');
    expect(error.message).toContain('Bad Request');
    expect(error.message).toContain('endpoint');
    expect(error.message).toContain('Body:');
    expect(error.message).toContain('invalid_request_error');
  });

  it('truncates response body to 2000 characters on large error responses', async () => {
    const largeBody = 'x'.repeat(3000);
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(largeBody, {
        status: 400,
        statusText: 'Bad Request'
      }))
    );

    const provider = createOpenAICompatibleProvider(openAiConfig);
    const error = await provider.complete([{ role: 'user', content: 'test' }]).catch(e => e);

    expect(error.message).toContain('HTTP 400');
    expect(error.message).toContain('Body:');
    // The error message should not exceed 2000 chars of body + overhead
    expect(error.message.length).toBeLessThan(2200);
  });

  it('handles HTTP error when response.text() fails', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(null, {
        status: 500,
        statusText: 'Internal Server Error'
      }))
    );

    const provider = createOpenAICompatibleProvider(openAiConfig);
    const error = await provider.complete([{ role: 'user', content: 'test' }]).catch(e => e);

    expect(error.message).toContain('HTTP 500');
    expect(error.message).toContain('Body:');
  });
});

// ---------------------------------------------------------------------------
// Phase X: reasoningEffort parameter
// ---------------------------------------------------------------------------
describe('Phase X: reasoningEffort parameter', () => {
  const openAiConfig: AIProviderConfig = {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://inference-api.nousresearch.com/v1',
    apiKey: 'sk-test-123',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'poolside/laguna-s-2.1:free',
    models: [],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does NOT include reasoning parameter when reasoningEffort is "off" (default)', async () => {
    const capturedBodies: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      capturedBodies.push(body);
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider(openAiConfig);
    await provider.complete([{ role: 'user', content: 'test' }]);

    // Should NOT have reasoning_effort or reasoning keys
    expect(capturedBodies[0]).not.toHaveProperty('reasoning_effort');
    expect(capturedBodies[0]).not.toHaveProperty('reasoning');
  });

  it('includes reasoning_effort: "low" when reasoningEffort is "low"', async () => {
    const capturedBodies: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      capturedBodies.push(body);
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider({
      ...openAiConfig,
      reasoningEffort: 'low',
    });
    await provider.complete([{ role: 'user', content: 'test' }]);

    expect(capturedBodies[0]).toHaveProperty('reasoning_effort', 'low');
  });

  it('includes reasoning_effort: "medium" when reasoningEffort is "medium"', async () => {
    const capturedBodies: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      capturedBodies.push(body);
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider({
      ...openAiConfig,
      reasoningEffort: 'medium',
    });
    await provider.complete([{ role: 'user', content: 'test' }]);

    expect(capturedBodies[0]).toHaveProperty('reasoning_effort', 'medium');
  });

  it('includes reasoning_effort: "high" when reasoningEffort is "high"', async () => {
    const capturedBodies: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      capturedBodies.push(body);
      return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }));
    });

    const provider = createOpenAICompatibleProvider({
      ...openAiConfig,
      reasoningEffort: 'high',
    });
    await provider.complete([{ role: 'user', content: 'test' }]);

    expect(capturedBodies[0]).toHaveProperty('reasoning_effort', 'high');
  });
});

// ---------------------------------------------------------------------------
// Phase X: provider config round-trip with reasoningEffort
// ---------------------------------------------------------------------------
describe('Phase X: provider config round-trip with reasoningEffort', () => {
  it('preserves reasoningEffort in AIProviderConfig through provider creation', () => {
    const originalConfig: AIProviderConfig = {
      id: 'nous',
      name: 'NousResearch',
      baseURL: 'https://inference-api.nousresearch.com/v1',
      apiKey: 'sk-test-123',
      authHeader: 'Authorization',
      endpointStyle: 'openai-chat',
      defaultModel: 'poolside/laguna-s-2.1:free',
      models: ['poolside/laguna-s-2.1:free'],
      reasoningEffort: 'high',
    };

    const provider = createOpenAICompatibleProvider(originalConfig);
    expect(provider.config.reasoningEffort).toBe('high');
  });

  it('defaults to "off" when reasoningEffort is not specified', () => {
    const configWithoutEffort: AIProviderConfig = {
      id: 'nous',
      name: 'NousResearch',
      baseURL: 'https://inference-api.nousresearch.com/v1',
      apiKey: 'sk-test-123',
      authHeader: 'Authorization',
      endpointStyle: 'openai-chat',
      defaultModel: 'poolside/laguna-s-2.1:free',
      models: [],
    };

    const provider = createOpenAICompatibleProvider(configWithoutEffort);
    expect(provider.config.reasoningEffort).toBe('off');
  });
});

// ---------------------------------------------------------------------------
// Phase X: Ollama error surfacing
// ---------------------------------------------------------------------------
describe('Phase X: Ollama error surfacing', () => {
  const ollamaConfig: AIProviderConfig = {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseURL: 'http://localhost:11434',
    apiKey: '',
    authHeader: 'Authorization',
    endpointStyle: 'ollama',
    defaultModel: 'llama3',
    models: [],
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws error with status, endpoint, and body when HTTP error is returned (Ollama)', async () => {
    const mockBody = JSON.stringify({ error: 'model not found' });
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(mockBody, {
        status: 404,
        statusText: 'Not Found'
      }))
    );

    const provider = createOllamaProvider(ollamaConfig);
    const error = await provider.complete([{ role: 'user', content: 'test' }]).catch(e => e);

    expect(error.message).toContain('HTTP 404');
    expect(error.message).toContain('endpoint');
    expect(error.message).toContain('Body:');
    expect(error.message).toContain('model not found');
  });
});
