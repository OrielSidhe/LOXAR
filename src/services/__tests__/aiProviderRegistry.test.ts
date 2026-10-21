import { describe, it, expect, beforeEach } from 'vitest';
import type { AISettings as GenericAISettings } from '../aiProviderRegistry';
import {
  PRESET_PROVIDERS,
  DEFAULT_PROVIDERS,
  migrateLegacyToGeneric,
  getActiveProviderConfig,
  loadGenericAISettings,
  saveGenericAISettings,
  sanitizeCredential,
  getProviderKeyPrefix,
} from '../aiProviderRegistry';

// --- Mock localStorage (same pattern as sessionCache.test.ts) ---
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

describe('PRESET_PROVIDERS', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('includes a NousResearch preset with the correct inference API base URL', () => {
    const nous = PRESET_PROVIDERS.find(p => p.id === 'nous');
    expect(nous).toBeDefined();
    expect(nous!.baseURL).toBe('https://inference-api.nousresearch.com/v1');
    expect(nous!.endpointStyle).toBe('openai-chat');
  });

  it('NousResearch preset includes poolside/laguna-s-2.1:free model', () => {
    const nous = PRESET_PROVIDERS.find(p => p.id === 'nous');
    expect(nous).toBeDefined();
    expect(nous!.models).toContain('poolside/laguna-s-2.1:free');
    expect(nous!.defaultModel).toBe('poolside/laguna-s-2.1:free');
  });

  it('includes OpenAI and Groq presets', () => {
    expect(PRESET_PROVIDERS.find(p => p.id === 'openai')).toBeDefined();
    expect(PRESET_PROVIDERS.find(p => p.id === 'groq')).toBeDefined();
  });

  it('no preset contains the word Gambli', () => {
    const allText = JSON.stringify(PRESET_PROVIDERS);
    expect(allText.toLowerCase()).not.toContain('gambli');
  });

  it('includes an OpenRouter preset with correct API base URL', () => {
    const openrouter = PRESET_PROVIDERS.find(p => p.id === 'openrouter');
    expect(openrouter).toBeDefined();
    expect(openrouter!.baseURL).toBe('https://openrouter.ai/api/v1');
    expect(openrouter!.endpointStyle).toBe('openai-chat');
  });

  it('NousResearch preset defaultModel is poolside/laguna-s-2.1:free', () => {
    const nous = PRESET_PROVIDERS.find(p => p.id === 'nous');
    expect(nous).toBeDefined();
    // The colon in "poolside/laguna-s-2.1:free" is a HuggingFace convention, not a "gemini:2.5" error.
    expect(nous!.defaultModel).toBe('poolside/laguna-s-2.1:free');
  });

  it('Gemini default provider uses dash not colon in model name (no "gemini:2.5" pattern)', () => {
    const gemini = DEFAULT_PROVIDERS.find(p => p.id === 'gemini');
    expect(gemini).toBeDefined();
    expect(gemini!.defaultModel).toBe('gemini-2.5-flash');
    expect(gemini!.defaultModel).not.toMatch(/^gemini:/);
  });
});

describe('migrateLegacyToGeneric', () => {
  it('migrates gemini legacy settings to a single gemini provider', () => {
    const legacy = {
      provider: 'gemini' as const,
      geminiApiKey: 'secret-key-123',
      geminiModel: 'gemini-2.5-pro',
      ollamaUrl: '',
      ollamaModel: '',
    };
    const generic = migrateLegacyToGeneric(legacy);
    expect(generic.activeProviderId).toBe('gemini');
    expect(generic.providers).toHaveLength(1);
    expect(generic.providers[0].id).toBe('gemini');
    expect(generic.providers[0].apiKey).toBe('secret-key-123');
    expect(generic.providers[0].defaultModel).toBe('gemini-2.5-pro');
    expect(generic.providers[0].endpointStyle).toBe('gemini');
  });

  it('migrates ollama legacy settings to a single ollama provider', () => {
    const legacy = {
      provider: 'ollama' as const,
      geminiApiKey: '',
      geminiModel: '',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.1',
    };
    const generic = migrateLegacyToGeneric(legacy);
    expect(generic.activeProviderId).toBe('ollama');
    expect(generic.providers).toHaveLength(1);
    expect(generic.providers[0].id).toBe('ollama');
    expect(generic.providers[0].defaultModel).toBe('llama3.1');
    expect(generic.providers[0].endpointStyle).toBe('ollama');
  });

  it('creates gemini provider with default model when geminiModel is empty', () => {
    const legacy = {
      provider: 'gemini' as const,
      geminiApiKey: '',
      geminiModel: '',
      ollamaUrl: '',
      ollamaModel: '',
    };
    const generic = migrateLegacyToGeneric(legacy);
    expect(generic.providers).toHaveLength(1);
    expect(generic.providers[0].id).toBe('gemini');
    expect(generic.providers[0].defaultModel).toBe('gemini-2.5-flash');
    expect(generic.providers[0].apiKey).toBe('');
  });

  it('falls back to DEFAULT_PROVIDERS when provider type is unrecognized', () => {
    const legacy = {
      provider: 'offline' as any,
      geminiApiKey: '',
      geminiModel: '',
      ollamaUrl: '',
      ollamaModel: '',
    };
    const generic = migrateLegacyToGeneric(legacy);
    expect(generic.providers).toEqual(DEFAULT_PROVIDERS);
  });
});

describe('getActiveProviderConfig', () => {
  it('returns the provider matching activeProviderId', () => {
    const config: GenericAISettings = {
      activeProviderId: 'nous',
      providers: [
        { id: 'gemini', name: 'Gemini', baseURL: 'https://x', apiKey: '', authHeader: 'x', endpointStyle: 'gemini', defaultModel: 'm1', models: [] },
        { id: 'nous', name: 'Nous', baseURL: 'https://y', apiKey: 'k', authHeader: 'Authorization', endpointStyle: 'openai-chat', defaultModel: 'm2', models: [] },
      ],
    };
    const active = getActiveProviderConfig(config);
    expect(active?.id).toBe('nous');
  });

  it('falls back to the first provider when activeProviderId is not found', () => {
    const config: GenericAISettings = {
      activeProviderId: 'nonexistent',
      providers: [
        { id: 'gemini', name: 'Gemini', baseURL: 'https://x', apiKey: '', authHeader: 'x', endpointStyle: 'gemini', defaultModel: 'm1', models: [] },
      ],
    };
    const active = getActiveProviderConfig(config);
    expect(active?.id).toBe('gemini');
  });

  it('returns undefined when providers list is empty', () => {
    const config: GenericAISettings = { activeProviderId: '', providers: [] };
    expect(getActiveProviderConfig(config)).toBeUndefined();
  });
});

describe('loadGenericAISettings / saveGenericAISettings round-trip', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('loads defaults when nothing is stored', async () => {
    const config = await loadGenericAISettings();
    expect(config.providers).toEqual(DEFAULT_PROVIDERS);
    expect(config.activeProviderId).toBe('gemini');
  });

  it('persists and reloads a custom provider configuration', async () => {
    const customConfig: GenericAISettings = {
      activeProviderId: 'mynous',
      providers: [
        {
          id: 'mynous',
          name: 'My Nous',
          baseURL: 'https://inference-api.nousresearch.com/v1',
          apiKey: 'sk-test-123',
          authHeader: 'Authorization',
          endpointStyle: 'openai-chat',
          defaultModel: 'poolside/laguna-s-2.1:free',
          models: ['poolside/laguna-s-2.1:free', 'hermes-3-llama-3.1-70b'],
        },
      ],
    };
    await saveGenericAISettings(customConfig);

    const loaded = await loadGenericAISettings();
    expect(loaded.activeProviderId).toBe('mynous');
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.providers[0].apiKey).toBe('sk-test-123');
    expect(loaded.providers[0].defaultModel).toBe('poolside/laguna-s-2.1:free');
  });

  it('falls back to defaults when stored JSON is malformed', async () => {
    mockLocalStorage.setItem('conlang_ai_settings_generic', '{ broken');
    const config = await loadGenericAISettings();
    expect(config.providers).toEqual(DEFAULT_PROVIDERS);
  });
});

// ---------------------------------------------------------------------------
// Sanitization on save/load
// ---------------------------------------------------------------------------
describe('saveGenericAISettings / loadGenericAISettings — sanitization', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('strips quotes and whitespace from apiKey on save', async () => {
    const config: GenericAISettings = {
      activeProviderId: 'nous',
      providers: [
        {
          id: 'nous',
          name: 'Nous',
          baseURL: '  https://inference-api.nousresearch.com/v1  ',
          apiKey: 'sk-test-123"',
          authHeader: '  Authorization  ',
          endpointStyle: 'openai-chat',
          defaultModel: '  poolside/laguna-s-2.1:free  ',
          models: ['  model-a  '],
        },
      ],
    };
    await saveGenericAISettings(config);
    const loaded = await loadGenericAISettings();
    expect(loaded.providers[0].apiKey).toBe('sk-test-123');
    expect(loaded.providers[0].baseURL).toBe('https://inference-api.nousresearch.com/v1');
    expect(loaded.providers[0].authHeader).toBe('Authorization');
    expect(loaded.providers[0].defaultModel).toBe('poolside/laguna-s-2.1:free');
    expect(loaded.providers[0].models).toEqual(['model-a']);
  });

  it('sanitizes on read even if stored data has stray quotes', async () => {
    // Simulate a hand-edited or legacy entry with a trailing quote in the key.
    mockLocalStorage.setItem(
      'conlang_ai_settings_generic',
      JSON.stringify({
        activeProviderId: 'nous',
        providers: [{
          id: 'nous',
          name: 'Nous',
          baseURL: 'https://x.com',
          apiKey: 'key-123"',
          authHeader: 'Authorization',
          endpointStyle: 'openai-chat',
          defaultModel: 'gpt-4o',
          models: [],
        }],
      })
    );
    const config = await loadGenericAISettings();
    expect(config.providers[0].apiKey).toBe('key-123');
  });

  it('does not mutate original config object passed to save', async () => {
    const config: GenericAISettings = {
      activeProviderId: 'nous',
      providers: [{
        id: 'nous', name: 'N', baseURL: 'https://x', apiKey: 'key"',
        authHeader: 'Authorization', endpointStyle: 'openai-chat',
        defaultModel: 'gpt-4o', models: [],
      }],
    };
    await saveGenericAISettings(config);
    // Original should be untouched (sanitization creates a copy).
    expect(config.providers[0].apiKey).toBe('key"');
  });
});

// ---------------------------------------------------------------------------
// Prefix helpers are re-exported from the registry
// ---------------------------------------------------------------------------
describe('getProviderKeyPrefix (re-exported)', () => {
  it('returns AIza for gemini', () => {
    expect(getProviderKeyPrefix('gemini')).toBe('AIza');
  });
  it('returns sk-nous- for nous', () => {
    expect(getProviderKeyPrefix('nous')).toBe('sk-nous-');
  });
  it('returns sk-or-v1- for openrouter', () => {
    expect(getProviderKeyPrefix('openrouter')).toBe('sk-or-v1-');
  });
});
