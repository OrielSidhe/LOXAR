/**
 * aiProviderPhaseC.test.ts — GAUNTLET v3.7 Phase C tests.
 *
 * C1: sanitizeCredential masking in storage + wrong-provider prefix detection
 * C2: extraBody passthrough through completeWithProvider (registry-level)
 * C3: Gemini cache invalidation when credentials change
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveGenericAISettings,
  loadGenericAISettings,
  completeWithProvider,
  getProvider,
  invalidateProviderCache,
  sanitizeCredential,
  looksLikeWrongProvider,
  type AISettings,
  type AIProviderConfig,
} from '../aiProviderRegistry';
import {
  createGeminiProvider,
  invalidateGeminiCache,
  __setGeminiFactory,
  __clearGeminiFactory,
} from '../aiProviders/geminiAdapter';

// ─── localStorage mock ─────────────────────────────────────────────────────────

const mockLocalStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// ─── Helper: minimal OpenAI-compatible provider config ─────────────────────────

function makeBaseConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://inference-api.nousresearch.com/v1',
    apiKey: 'sk-test-123',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'poolside/laguna-s-2.1:free',
    models: [],
    ...overrides,
  };
}

function makeGeminiConfig(apiKey: string): AIProviderConfig {
  return {
    id: 'gemini',
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey,
    authHeader: 'x-goog-api-key',
    endpointStyle: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    models: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// C1: sanitizeCredential masking in storage + wrong-provider prefix detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('C1: sanitizeCredential masking + wrong-provider detection', () => {
  beforeEach(() => mockLocalStorage.clear());
  afterEach(() => mockLocalStorage.clear());

  // ── 1.1: API key is fully sanitized in localStorage (no quotes, whitespace, newlines) ──
  it('C1.1: stored API key in localStorage is sanitized (no quotes or whitespace)', async () => {
    const dirtyKey = '  sk-test-abc"  \n';
    const config: AISettings = {
      activeProviderId: 'nous',
      providers: [makeBaseConfig({ apiKey: dirtyKey })],
    };
    await saveGenericAISettings(config);

    // Read the RAW stored string — it must not contain quotes, spaces, or newlines
    const raw = mockLocalStorage.getItem('conlang_ai_settings_generic');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    const storedKey = parsed.providers[0].apiKey;
    expect(storedKey).not.toContain('"');
    expect(storedKey).not.toContain(' ');
    expect(storedKey).not.toContain('\n');
    expect(storedKey).not.toContain('\t');
    expect(storedKey).toBe('sk-test-abc');
  });

  // ── 1.2: sanitizeCredential strips embedded newlines and tabs ──
  it('C1.2: sanitizeCredential strips embedded newlines and tabs from stored key', async () => {
    const config: AISettings = {
      activeProviderId: 'nous',
      providers: [makeBaseConfig({ apiKey: 'sk-ab\ntab\tnc' })],
    };
    await saveGenericAISettings(config);

    const loaded = await loadGenericAISettings();
    expect(loaded.providers[0].apiKey).toBe('sk-abtabnc');
  });

  // ── 1.3: loadGenericAISettings sanitizes hand-edited entries with stray quotes ──
  it('C1.3: loadGenericAISettings sanitizes keys with stray quotes from hand-edited storage', async () => {
    // Simulate a user who pasted a key with a trailing quote into localStorage
    mockLocalStorage.setItem(
      'conlang_ai_settings_generic',
      JSON.stringify({
        activeProviderId: 'nous',
        providers: [{
          id: 'nous', name: 'Nous', baseURL: 'https://x.com',
          apiKey: 'sk-abc123"', authHeader: 'Authorization',
          endpointStyle: 'openai-chat', defaultModel: 'm1', models: [],
        }],
      })
    );
    const config = await loadGenericAISettings();
    expect(config.providers[0].apiKey).toBe('sk-abc123');
  });

  // ── 1.4: looksLikeWrongProvider (re-exported) detects wrong-provider prefix ──
  it('C1.4: looksLikeWrongProvider detects key with wrong provider prefix', () => {
    // A Gemini key (AIza…) used for an OpenAI provider
    expect(looksLikeWrongProvider('openai', 'AIza1234567890abcdef')).toBe(true);
    // A Nous key (sk-nous-) used for Gemini
    expect(looksLikeWrongProvider('gemini', 'sk-nous-abc123')).toBe(true);
    // A Groq key (gsk-) used for OpenRouter
    expect(looksLikeWrongProvider('openrouter', 'gsk_abc123')).toBe(true);
  });

  // ── 1.5: looksLikeWrongProvider does NOT flag a matching key ──
  it('C1.5: looksLikeWrongProvider does not flag correctly-prefixed key', () => {
    expect(looksLikeWrongProvider('openai', 'sk-abc123')).toBe(false);
    expect(looksLikeWrongProvider('gemini', 'AIzasyabcdef')).toBe(false);
    expect(looksLikeWrongProvider('groq', 'gsk-abc123')).toBe(false);
    expect(looksLikeWrongProvider('openrouter', 'sk-or-v1-abc')).toBe(false);
  });

  // ── 1.6: looksLikeWrongProvider ignores empty keys and providers without prefix ──
  it('C1.6: looksLikeWrongProvider returns false for empty key or prefix-less provider', () => {
    expect(looksLikeWrongProvider('gemini', '')).toBe(false);
    expect(looksLikeWrongProvider('ollama', 'any-key')).toBe(false);
    expect(looksLikeWrongProvider('custom', 'sk-abc')).toBe(false);
  });

  // ── 1.7: sanitizeCredential is idempotent and safe on edge inputs ──
  it('C1.7: sanitizeCredential handles non-string and empty inputs', () => {
    expect(sanitizeCredential('')).toBe('');
    expect(sanitizeCredential(undefined as unknown as string)).toBe('');
    expect(sanitizeCredential(null as unknown as string)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C2: extraBody passthrough through completeWithProvider
// ═══════════════════════════════════════════════════════════════════════════════

describe('C2: extraBody passthrough through completeWithProvider', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    invalidateProviderCache(); // clean registry between tests
  });

  // ── 2.1: extraBody fields appear in the request body via completeWithProvider ──
  it('C2.1: extraBody fields are merged into the fetch request body', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      captured.push(body);
      return Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
          { status: 200 }
        )
      );
    });

    const config = makeBaseConfig({
      extraBody: { tags: ['conlang', 'test'], user: 'abc' },
    });

    const result = await completeWithProvider(
      config,
      [{ role: 'user', content: 'hello' }],
      { model: 'poolside/laguna-s-2.1:free' }
    );

    expect(result).toBe('OK');
    expect(captured[0]).toMatchObject({
      model: 'poolside/laguna-s-2.1:free',
      tags: ['conlang', 'test'],
      user: 'abc',
    });
  });

  // ── 2.2: completeWithProvider passes extraBody through the registry layer ──
  it('C2.2: completeWithProvider passes extraBody through getProvider to the provider', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      captured.push(JSON.parse(init.body as string));
      return Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
          { status: 200 }
        )
      );
    });

    const config = makeBaseConfig({
      apiKey: 'sk-test-123',
      extraBody: { provider: 'nous', priority: 'high' },
    });

    // completeWithProvider calls getProvider internally, which builds the
    // provider from config. The extraBody must survive to the fetch call.
    const result = await completeWithProvider(config, [{ role: 'user', content: 'hello' }]);
    expect(result).toBe('OK');
    expect(captured[0]).toMatchObject({
      provider: 'nous',
      priority: 'high',
      model: 'poolside/laguna-s-2.1:free',
    });
  });

  // ── 2.3: extraBody is omitted from request when not provided ──
  it('C2.3: request body does not contain undefined extraBody fields when not set', async () => {
    const captured: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      captured.push(JSON.parse(init.body as string));
      return Promise.resolve(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'OK' } }] }),
          { status: 200 }
        )
      );
    });

    const config = makeBaseConfig(); // no extraBody
    await completeWithProvider(config, [{ role: 'user', content: 'hello' }]);

    expect(captured[0]).toMatchObject({
      model: 'poolside/laguna-s-2.1:free',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(captured[0]).not.toHaveProperty('tags');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C3: Gemini cache invalidation when credentials change
// ═══════════════════════════════════════════════════════════════════════════════

describe('C3: Gemini cache invalidation on credential change', () => {
  afterEach(() => {
    __clearGeminiFactory();
    invalidateGeminiCache();
    invalidateProviderCache();
  });

  // ── 3.1: First call caches instance, change of config → new provider ──
  it('C3.1: first call cachea, change of config, second call does not reuse cached instance', async () => {
    const apiKeyCalls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    // First call — creates provider with key-A and triggers lazy instance
    const configA = makeGeminiConfig('key-aaa');
    const providerA = getProvider(configA);
    await providerA.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(1);
    expect(apiKeyCalls[0]).toBe('key-aaa');

    // New config with different apiKey — must create a fresh provider
    const configB = makeGeminiConfig('key-bbb');
    const providerB = getProvider(configB);
    expect(providerB).not.toBe(providerA); // different instance
    expect(providerB.config.apiKey).toBe('key-bbb');
    await providerB.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(2);
    expect(apiKeyCalls[1]).toBe('key-bbb');
  });

  // ── 3.2: invalidateProviderCache('gemini') clears and forces rebuild ──
  it('C3.2: invalidateProviderCache("gemini") clears cache, forcing a new provider', async () => {
    const apiKeyCalls: string[] = [];
    // Inject a mock factory so complete() never hits the real GoogleGenAI client
    // (no network / API key required — keeps this test green in CI without credentials).
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    // Prime the cache
    const config = makeGeminiConfig('key-original');
    const provider1 = getProvider(config);
    await provider1.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(1);
    expect(apiKeyCalls[0]).toBe('key-original');

    // Invalidate the gemini cache. NOTE: invalidateProviderCache('gemini') also
    // calls invalidateGeminiCache(), which nulls the injected factory — re-inject
    // it so the rebuilt provider stays mocked (no real GoogleGenAI / API key).
    invalidateProviderCache('gemini');
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    // New config with a different key — must create a fresh provider
    const config2 = makeGeminiConfig('key-replaced');
    const provider2 = getProvider(config2);
    expect(provider2).not.toBe(provider1);
    await provider2.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(2);
    expect(apiKeyCalls[1]).toBe('key-replaced');
  });

  // ── 3.3: invalidateProviderCache() (no arg) clears entire registry ──
  it('C3.3: invalidateProviderCache() with no arg clears all providers', async () => {
    const apiKeyCalls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    const config = makeGeminiConfig('key-one');
    const provider1 = getProvider(config);
    await provider1.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(1);
    expect(apiKeyCalls[0]).toBe('key-one');

    // Full cache clear. invalidateProviderCache() also nulls the injected
    // gemini factory — re-inject it so the rebuilt provider stays mocked.
    invalidateProviderCache();
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    const config2 = makeGeminiConfig('key-two');
    const provider2 = getProvider(config2);
    expect(provider2).not.toBe(provider1);
    await provider2.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(2);
    expect(apiKeyCalls[1]).toBe('key-two');
  });

  // ── 3.4: Sanitized key is what reaches the GoogleGenAI constructor ──
  it('C3.4: dirty apiKey (wraping quotes + whitespace) is sanitized before factory call', async () => {
    const apiKeyCalls: string[] = [];
    __setGeminiFactory(({ apiKey }) => {
      apiKeyCalls.push(apiKey);
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({ text: 'OK' }),
        },
      };
    });

    // Dirty key with leading/trailing whitespace and a wrapping double-quote
    const dirtyKey = '  AIzaSy123"  ';
    const provider = createGeminiProvider(makeGeminiConfig(dirtyKey));
    // Provider config has the sanitized key
    expect(provider.config.apiKey).toBe('AIzaSy123');

    // When complete() triggers lazy instantiation, the factory receives the
    // already-sanitized key (no quotes, no whitespace).
    await provider.complete([{ role: 'user', content: 'hi' }]);
    expect(apiKeyCalls).toHaveLength(1);
    expect(apiKeyCalls[0]).toBe('AIzaSy123');
  });

  // ── 3.5: invalidateGeminiCache is a safe no-op (backward compat) ──
  it('C3.5: invalidateGeminiCache is a safe no-op', () => {
    expect(() => invalidateGeminiCache()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C4: Integration — save/load + wrong-provider warning workflow
// ═══════════════════════════════════════════════════════════════════════════════

describe('C4: Integration — storage sanitization + wrong-provider warning', () => {
  beforeEach(() => mockLocalStorage.clear());
  afterEach(() => {
    mockLocalStorage.clear();
    invalidateProviderCache();
  });

  it('C4.1: round-trip save/load preserves sanitized key and detects wrong provider', async () => {
    const config: AISettings = {
      activeProviderId: 'gemini',
      providers: [
        {
          id: 'gemini',
          name: 'Google Gemini',
          baseURL: 'https://generativelanguage.googleapis.com/v1beta',
          apiKey: 'AIzaSy123"', // trailing quote from copy-paste
          authHeader: 'x-goog-api-key',
          endpointStyle: 'gemini',
          defaultModel: 'gemini-2.5-flash',
          models: ['gemini-2.5-flash'],
        },
      ],
    };
    await saveGenericAISettings(config);
    const loaded = await loadGenericAISettings();

    // Key is sanitized in storage and on reload
    expect(loaded.providers[0].apiKey).toBe('AIzaSy123');

    // An OpenAI provider with a Gemini-prefixed key should be flagged
    const openaiConfig = makeBaseConfig({ apiKey: 'AIzaSy123' });
    expect(looksLikeWrongProvider(openaiConfig.id, openaiConfig.apiKey)).toBe(true);
  });
});
