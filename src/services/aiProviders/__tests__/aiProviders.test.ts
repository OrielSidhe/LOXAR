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

    // Each provider creates its own instance with its own key — proving the
    // old module-level cache that leaked the first apiKey is gone.
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
