import { describe, expect, it } from 'vitest';
import type { AIProviderConfig } from '../aiProviderRegistry';
import type { ConnectionTestDraft } from '../connectionTestHints';
import {
  buildTestProviderConfig,
  classifyConnectionError,
  extractHttpStatus,
  hintFromTestResult,
  resolveTestReasoning,
} from '../connectionTestHints';

/** Simulate the raw error string produced by the OpenAI/Gemini adapters. */
function httpError(status: number, body: string): string {
  return `HTTP ${status} (Error) on endpoint https://api.example.com/v1/chat/completions\nBody: ${body}`;
}

function config(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    id: 'test',
    name: 'Test',
    baseURL: 'https://api.example.com/v1',
    apiKey: 'sk-test',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'm1',
    models: ['m1'],
    reasoningEffort: 'off',
    ...overrides,
  };
}

function draft(overrides: Partial<ConnectionTestDraft> = {}): ConnectionTestDraft {
  return {
    id: 'nous',
    name: 'NousResearch',
    baseURL: 'https://api.nousresearch.com/v1',
    apiKey: 'sk-nous-123',
    authHeader: 'Authorization',
    endpointStyle: 'openai-chat',
    defaultModel: 'stepfun/step-3.7-flash:free',
    models: ['stepfun/step-3.7-flash:free'],
    reasoningEffort: 'high',
    extraBody: { tags: ['user=loxar'] },
    requestTimeoutMs: 45_000,
    ...overrides,
  };
}

describe('FASE T — extractHttpStatus', () => {
  it('reads a 3-digit status from an adapter error and ignores invalid values', () => {
    expect(extractHttpStatus(httpError(429, 'rate limited'))).toBe(429);
    expect(extractHttpStatus('The operation was aborted.')).toBeNull();
    expect(extractHttpStatus('HTTP 999 broken')).toBeNull();
  });
});

describe('FASE T — classifyConnectionError (hints simulados)', () => {
  it('400 con missing user tag → añade tags en extraBody', () => {
    const hint = classifyConnectionError(httpError(400, '{"error":"missing user tag"}'));
    expect(hint.kind).toBe('missing-tag');
    expect(hint.hint).toContain('extraBody');
    expect(hint.actionable).toBe(true);
  });

  it('400 sin tag → genérico (no falsamente atribuido a Nous)', () => {
    const hint = classifyConnectionError(httpError(400, '{"error":"bad request"}'));
    expect(hint.kind).toBe('generic');
    expect(hint.hint).toContain('HTTP 400');
  });

  it('401 y 403 → key inválida o sin permisos', () => {
    for (const status of [401, 403]) {
      const hint = classifyConnectionError(httpError(status, 'unauthorized'));
      expect(hint.kind).toBe('invalid-key');
      expect(hint.hint).toContain('key inválida');
    }
  });

  it('404 → usa «Obtener modelos» (FASE M)', () => {
    const hint = classifyConnectionError(httpError(404, 'model not found'));
    expect(hint.kind).toBe('model-not-found');
    expect(hint.hint).toContain('Obtener modelos');
  });

  it('429 → cuota / rate limit', () => {
    const hint = classifyConnectionError(httpError(429, 'rate limit exceeded'));
    expect(hint.kind).toBe('rate-limit');
    expect(hint.hint).toContain('cuota');
  });

  it('timeout / AbortError → sugiere subir requestTimeoutMs', () => {
    for (const raw of ['The operation was aborted.', 'AbortError: timeout', 'ETIMEDOUT']) {
      const hint = classifyConnectionError(raw);
      expect(hint.kind).toBe('timeout');
      expect(hint.hint).toContain('requestTimeoutMs');
    }
  });

  it('API Key faltante → hint accionable', () => {
    expect(classifyConnectionError('API Key faltante').kind).toBe('missing-key');
  });

  it('sin status ni patrón conocido → genérico no accionable', () => {
    const hint = classifyConnectionError('socket hang up');
    expect(hint.kind).toBe('generic');
    expect(hint.actionable).toBe(false);
    expect(hint.hint).toContain('socket hang up');
  });
});

describe('FASE T — hintFromTestResult', () => {
  it('prefiere `error` sobre `details` y preserva el detalle crudo en la UI', () => {
    const hint = hintFromTestResult({
      success: false,
      error: httpError(429, 'quota exceeded'),
      details: 'raw body',
    });
    expect(hint.kind).toBe('rate-limit');
  });

  it('cae a `details` cuando no hay `error`', () => {
    expect(hintFromTestResult({ success: false, details: 'HTTP 401 no auth' }).kind).toBe('invalid-key');
  });
});

describe('FASE T — resolveTestReasoning', () => {
  it('OpenRouter free exige reasoning: off → medium', () => {
    expect(resolveTestReasoning(config({ id: 'openrouter', defaultModel: 'meta-llama-3.1-8b-instruct:free' })))
      .toBe('medium');
  });

  it('OpenRouter free respeta un nivel ya activo', () => {
    expect(resolveTestReasoning(config({ id: 'openrouter', defaultModel: 'm:free', reasoningEffort: 'high' })))
      .toBe('high');
  });

  it('OpenRouter de pago no se fuerza', () => {
    expect(resolveTestReasoning(config({ id: 'openrouter', defaultModel: 'google/gemini-2.5-pro' })))
      .toBe('off');
  });

  it('Nous rechaza reasoning: high → off', () => {
    expect(resolveTestReasoning(config({ id: 'nous', reasoningEffort: 'high' }))).toBe('off');
  });

  it('otros proveedores conservan su configuración', () => {
    expect(resolveTestReasoning(config({ id: 'groq', reasoningEffort: 'medium' }))).toBe('medium');
  });

  it('detecta Nous y OpenRouter también por nombre cuando el id es personalizado', () => {
    expect(resolveTestReasoning(config({ id: 'custom-1', name: 'NousResearch', reasoningEffort: 'high' }))).toBe('off');
    expect(resolveTestReasoning(config({ id: 'custom-2', name: 'OpenRouter', defaultModel: 'm:free' }))).toBe('medium');
  });
});

describe('FASE T — buildTestProviderConfig (sin mutar estado)', () => {
  it('aplica la política de reasoning solo a la copia de la prueba', () => {
    const form = draft({ id: 'openrouter', name: 'OpenRouter', defaultModel: 'm:free', reasoningEffort: 'off' });
    const probe = buildTestProviderConfig(form);
    expect(form.reasoningEffort).toBe('off');
    expect(probe.reasoningEffort).toBe('medium');
    expect(probe).not.toBe(form);
    expect(probe.extraBody).not.toBe(form.extraBody);
    expect(probe.models).not.toBe(form.models);
  });

  it('Nous se prueba con reasoning off aunque el formulario diga high', () => {
    expect(buildTestProviderConfig(draft()).reasoningEffort).toBe('off');
  });

  it('usa id de vista previa cuando el formulario aún no tiene id', () => {
    expect(buildTestProviderConfig(draft({ id: '' })).id).toBe('form-preview');
  });

  it('conserva timeout y extraBody en la configuración probada', () => {
    const probe = buildTestProviderConfig(draft());
    expect(probe.requestTimeoutMs).toBe(45_000);
    expect(probe.extraBody).toEqual({ tags: ['user=loxar'] });
  });
});
