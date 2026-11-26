/**
 * Model discovery for OpenAI-compatible / Gemini endpoints.
 *
 * Pure helpers are exported for tests; `discoverModels` is the only I/O path.
 * Every failure is returned as a user-facing hint instead of throwing, so the
 * settings modal can show it inline without breaking the provider form.
 */
import type { AIProviderConfig, ProviderEndpointStyle } from './aiProviders/base';
import { sanitizeCredential } from './aiProviders/base';

const DEFAULT_DISCOVERY_TIMEOUT_MS = 180_000;

/** Build the models URL, avoiding `/v1/v1/models` when the base URL already ends in `/v1`. */
export function buildModelsUrl(baseURL: string, endpointStyle: ProviderEndpointStyle): string {
  const base = sanitizeCredential(baseURL).replace(/\/+$/, '');
  if (!base) throw new Error('La Base URL está vacía.');
  if (endpointStyle === 'gemini') {
    return base.endsWith('/v1beta') ? `${base}/models` : `${base}/v1beta/models`;
  }
  const root = base.endsWith('/v1') ? base.slice(0, -3).replace(/\/+$/, '') : base;
  return `${root}/v1/models`;
}

/** Accept both `{data:[{id}]}` (OpenAI) and `{models:[{name}]}` / string arrays. */
export function normalizeModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as { data?: unknown; models?: unknown };
  const raw = Array.isArray(root.data) ? root.data : Array.isArray(root.models) ? root.models : [];
  const ids: string[] = [];
  for (const entry of raw) {
    let id = '';
    if (typeof entry === 'string') {
      id = entry.trim();
    } else if (entry && typeof entry === 'object') {
      const candidate = entry as { id?: unknown; name?: unknown };
      if (typeof candidate.id === 'string') id = candidate.id.trim();
      else if (typeof candidate.name === 'string') id = candidate.name.trim();
    }
    if (id) ids.push(id.replace(/^models\//, ''));
  }
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Map an HTTP status/body to an actionable hint (FASE T table in v3.13). */
export function describeHttpError(status: number, body: string): string {
  const text = body.toLowerCase();
  if (status === 400 && text.includes('tag')) {
    return 'HTTP 400: añade tags en extraBody (Nous exige user=<uid>).';
  }
  if (status === 401 || status === 403) return 'HTTP ' + status + ': key inválida o sin permisos.';
  if (status === 404) return 'HTTP 404: revisa la Base URL o usa «Obtener modelos» para listar los ids válidos.';
  if (status === 429) return 'HTTP 429: cuota / rate limit; espera o cambia de modelo.';
  return 'HTTP ' + status + ': ' + (body.slice(0, 200) || 'sin detalle del servidor');
}

export interface ModelDiscoveryResult {
  models: string[];
  error?: string;
}

/**
 * GET {baseURL}/v1/models with the configured credential and timeout.
 * Returns a result object instead of throwing so callers can render the hint.
 */
export async function discoverModels(
  config: AIProviderConfig,
  signal?: AbortSignal
): Promise<ModelDiscoveryResult> {
  const url = buildModelsUrl(config.baseURL, config.endpointStyle);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = sanitizeCredential(config.apiKey);
  const authHeader = sanitizeCredential(config.authHeader) || 'Authorization';
  if (config.endpointStyle === 'gemini') {
    if (apiKey) headers['x-goog-api-key'] = apiKey;
  } else if (apiKey) {
    headers[authHeader] = `Bearer ${apiKey}`;
  }

  const timeout = config.requestTimeoutMs && config.requestTimeoutMs > 0
    ? config.requestTimeoutMs
    : DEFAULT_DISCOVERY_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { models: [], error: describeHttpError(response.status, body) };
    }
    const payload: unknown = await response.json();
    return { models: normalizeModelIds(payload) };
  } catch (error) {
    if (signal?.aborted) return { models: [], error: 'Descarga cancelada.' };
    const message = error instanceof Error ? error.message : String(error);
    return { models: [], error: `No se pudieron obtener los modelos: ${message}` };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
