import { describe, it, expect, beforeEach } from 'vitest';
import type { AISettings as GenericAISettings } from '../aiProviderRegistry';
import {
  PRESET_PROVIDERS,
  DEFAULT_PROVIDERS,
  migrateLegacyToGeneric,
  getActiveProviderConfig,
  loadGenericAISettings,
  saveGenericAISettings,
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
