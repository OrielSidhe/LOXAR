/**
 * FASE T (GAUNTLET v3.13) — actionable hints for provider connection tests.
 *
 * Pure module: no I/O, no React, no persisted state. The adapters surface raw
 * `HTTP <status> ... \nBody: ...` strings (or an AbortError on timeout); this
 * module turns those strings into the hint table defined by the gauntlet and
 * applies the per-provider reasoning policy used by the probe.
 */
import type {
  AIProviderConfig,
  ProviderEndpointStyle,
  ReasoningEffort,
  TestConnectionResult,
} from './aiProviders/base';

export type ConnectionErrorKind =
  | 'missing-tag'
  | 'invalid-key'
  | 'model-not-found'
  | 'rate-limit'
  | 'timeout'
  | 'missing-key'
  | 'generic';

export interface ConnectionErrorHint {
  kind: ConnectionErrorKind;
  hint: string;
  /** True when the hint can be acted on from the form without leaving it. */
  actionable: boolean;
}

/** Minimal form shape accepted by {@link buildTestProviderConfig}. */
export interface ConnectionTestDraft {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  authHeader: string;
  endpointStyle: ProviderEndpointStyle;
  defaultModel: string;
  models: string[];
  reasoningEffort: ReasoningEffort;
  extraBody: Record<string, unknown>;
  requestTimeoutMs: number;
}

const TIMEOUT_PATTERN = /\b(timeout|timed\s*out|etimedout|abort(?:ed|error)?)\b/i;

/** Extract the first 3-digit HTTP status from an adapter error string. */
export function extractHttpStatus(raw: string): number | null {
  const match = /\bHTTP\s+(\d{3})\b/i.exec(raw);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

/**
 * Classify a raw connection-test error into the FASE T hint table.
 * Order matters: a 400 with "tag" in the body is a missing Nous user tag,
 * not a generic bad request; an abort is a timeout hint even if no status.
 */
export function classifyConnectionError(raw: string): ConnectionErrorHint {
  const text = typeof raw === 'string' ? raw : '';
  const lowered = text.toLowerCase();
  const status = extractHttpStatus(text);

  if (status === 400 && lowered.includes('tag')) {
    return {
      kind: 'missing-tag',
      hint: 'HTTP 400: añade tags en extraBody (Nous exige user=<uid>).',
      actionable: true,
    };
  }
  if (status === 401 || status === 403) {
    return { kind: 'invalid-key', hint: `HTTP ${status}: key inválida o sin permisos.`, actionable: true };
  }
  if (status === 404) {
    return {
      kind: 'model-not-found',
      hint: 'HTTP 404: modelo no encontrado; usa «Obtener modelos» para listar los ids válidos.',
      actionable: true,
    };
  }
  if (status === 429) {
    return {
      kind: 'rate-limit',
      hint: 'HTTP 429: cuota / rate limit; espera o cambia de modelo.',
      actionable: true,
    };
  }
  if (TIMEOUT_PATTERN.test(lowered)) {
    return {
      kind: 'timeout',
      hint: 'Timeout: sube requestTimeoutMs («Timeout de petición (ms)») en el formulario y vuelve a probar.',
      actionable: true,
    };
  }
  if (lowered.includes('api key faltante') || lowered.includes('missing api key')) {
    return { kind: 'missing-key', hint: 'Falta la API Key: agrégala en el formulario antes de probar.', actionable: true };
  }
  return {
    kind: 'generic',
    hint: status !== null
      ? `HTTP ${status}: ${text.slice(0, 200) || 'sin detalle del servidor'}`
      : text.slice(0, 200) || 'La prueba falló sin detalle del servidor.',
    actionable: false,
  };
}

/** Classify a failed {@link TestConnectionResult}; keeps the raw body for <details>. */
export function hintFromTestResult(result: TestConnectionResult): ConnectionErrorHint {
  return classifyConnectionError(result.error || result.details || 'La prueba falló.');
}

/**
 * Reasoning policy for the minimal probe:
 * - OpenRouter free models require reasoning enabled; force `medium` when off.
 * - Nous free rejects reasoning parameters; force `off`.
 * - All other providers keep the configured effort.
 */
export function resolveTestReasoning(config: AIProviderConfig): ReasoningEffort {
  const id = config.id.trim().toLowerCase();
  const name = config.name.trim().toLowerCase();
  const model = config.defaultModel.trim().toLowerCase();
  if (id === 'nous' || name.includes('nous')) return 'off';
  if ((id === 'openrouter' || name.includes('openrouter')) && model.endsWith(':free')) {
    return config.reasoningEffort && config.reasoningEffort !== 'off' ? config.reasoningEffort : 'medium';
  }
  return config.reasoningEffort ?? 'off';
}

/**
 * Build the config used by the form's «Probar» button. Returns a NEW object:
 * the persisted `providers` state and the form draft are never mutated.
 */
export function buildTestProviderConfig(draft: ConnectionTestDraft): AIProviderConfig {
  const config: AIProviderConfig = {
    id: draft.id || 'form-preview',
    name: draft.name,
    baseURL: draft.baseURL,
    apiKey: draft.apiKey,
    authHeader: draft.authHeader,
    endpointStyle: draft.endpointStyle,
    defaultModel: draft.defaultModel,
    models: [...draft.models],
    reasoningEffort: draft.reasoningEffort,
    extraBody: { ...draft.extraBody },
    requestTimeoutMs: draft.requestTimeoutMs,
  };
  return { ...config, reasoningEffort: resolveTestReasoning(config) };
}
