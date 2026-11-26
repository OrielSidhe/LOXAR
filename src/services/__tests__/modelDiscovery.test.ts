import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AIProviderConfig } from '../aiProviderRegistry';
import {
  buildModelsUrl,
  describeHttpError,
  discoverModels,
  normalizeModelIds,
} from '../modelDiscovery';

const baseConfig: AIProviderConfig = {
  id: 'test',
  name: 'Test',
  baseURL: 'https://api.example.com/v1',
  apiKey: 'sk-test',
  authHeader: 'Authorization',
  endpointStyle: 'openai-chat',
  defaultModel: 'm1',
  models: ['m1'],
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});

function stubFetch(response: { ok: boolean; status?: number; body: unknown }): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    text: async () => (typeof response.body === 'string' ? response.body : JSON.stringify(response.body)),
    json: async () => response.body,
  }));
}

describe('buildModelsUrl', () => {
  it('does not duplicate /v1 for OpenAI-compatible bases', () => {
    expect(buildModelsUrl('https://api.example.com/v1', 'openai-chat'))
      .toBe('https://api.example.com/v1/models');
    expect(buildModelsUrl('https://api.example.com/v1/', 'openai-chat'))
      .toBe('https://api.example.com/v1/models');
  });

  it('adds /v1 when the base has no version segment', () => {
    expect(buildModelsUrl('https://api.example.com', 'custom'))
      .toBe('https://api.example.com/v1/models');
  });

  it('uses /v1beta/models for Gemini endpoints', () => {
    expect(buildModelsUrl('https://generativelanguage.googleapis.com/v1beta', 'gemini'))
      .toBe('https://generativelanguage.googleapis.com/v1beta/models');
  });

  it('rejects an empty base URL', () => {
    expect(() => buildModelsUrl('   ', 'openai-chat')).toThrow('Base URL');
  });
});

describe('normalizeModelIds', () => {
  it('sorts, dedupes and strips the models/ prefix', () => {
    expect(normalizeModelIds({
      data: [{ id: 'models/b' }, { id: 'a' }, { id: 'a' }, { name: 'c' }, 'd', 7, null],
    })).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns an empty array for missing or malformed payloads', () => {
    expect(normalizeModelIds(null)).toEqual([]);
    expect(normalizeModelIds({ data: 'not-an-array' })).toEqual([]);
    expect(normalizeModelIds({})).toEqual([]);
  });
});

describe('describeHttpError', () => {
  it('maps the actionable cases from the FASE T table', () => {
    expect(describeHttpError(400, 'missing user tag')).toContain('tags en extraBody');
    expect(describeHttpError(401, 'bad key')).toContain('key inválida');
    expect(describeHttpError(404, 'not found')).toContain('Obtener modelos');
    expect(describeHttpError(429, 'rate limit')).toContain('cuota');
  });
});

describe('discoverModels', () => {
  it('sends the configured auth header and returns normalized ids', async () => {
    stubFetch({ ok: true, body: { data: [{ id: 'z-model' }, { id: 'a-model' }] } });
    const result = await discoverModels(baseConfig);
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/models');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(result).toEqual({ models: ['a-model', 'z-model'] });
  });

  it('uses x-goog-api-key for Gemini endpoints', async () => {
    stubFetch({ ok: true, body: { models: [{ name: 'models/gemini-x' }] } });
    await discoverModels({ ...baseConfig, endpointStyle: 'gemini', authHeader: 'x-goog-api-key' });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('sk-test');
  });

  it('returns a hint on HTTP errors without throwing', async () => {
    stubFetch({ ok: false, status: 429, body: 'rate limit exceeded' });
    const result = await discoverModels(baseConfig);
    expect(result.models).toEqual([]);
    expect(result.error).toContain('cuota');
  });
});
