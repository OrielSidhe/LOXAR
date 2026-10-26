/**
 * inductFromText.ts — Inductor de gramática (parser local + LLM booster).
 *
 * Flujo:
 *  1. parseLocal(text) → DeclarativeManifest + ParseReport
 *  2. Calcular score del parser local
 *  3. Determinar si se necesita IA:
 *     - AI disponible Y (score local < 60 O hay secciones no interpretadas)
 *     → usar IA. Un documento rico que el parser local puntúe >= 60 pero con
 *       secciones caídas en sectionsUnparsed TAMBIÉN debe pasar por IA.
 *  4. Si IA es necesaria:
 *     a. Si llmCall provisto → usarlo (ruta producción, con chunking si > 12KB)
 *     b. Si llmOutput provisto → usarlo directamente (ruta test, sin chunking)
 *  5. Mergear resultado LLM con el local (local para lo que parseó bien, LLM
 *     para el resto / enriquecimiento)
 *  6. Si LLM no disponible o falla → resultado local con confidence = score
 *  7. Nunca usar cleanseJson ni segunda llamada a IA como fallback
 *  8. Siempre producir ImportValidationReport
 *
 * Módulo PURO: sin dependencias de React ni Tauri.
 * El wrapper async para IA real vive en geminiService.ts (callAi / completeWithProvider).
 *
 * PARA TESTING: pasa `llmOutput` (respuesta mock directa) en lugar de `llmCall`.
 * PARA PRODUCCIÓN: pasa `llmCall` (función async que llama completeWithProvider).
 *   - La función llmCall recibe el prompt COMPLETO (instructions + documento)
 *     y debe devolver { manifest: DeclarativeManifest, confidence: number }.
 *   - La función llmCall es responsable de: enviar prompt → recibir texto →
 *     extraer JSON → validar con Zod → devolver manifest validado.
 *   - inductFromText maneja el CHUNKING: divide el texto en chunks, genera el
 *     prompt para cada chunk con getLlmPrompt(), llama llmCall por chunk,
 *     y hace el merge (map-reduce). No la función llmCall necesita saber de chunking.
 */

import type { DeclarativeManifest, ParseReport, ImportValidationReport } from './declarativeFormat';
import type { ChunkInfo } from './chunker';
import { parseLocal } from './textParser';
import { normalize } from './normalizer';
import { validateLlmManifest } from './llmSchema';
import {
  splitIntoChunks,
  mergeManifests,
  mergeLocalAndLlm,
  extractGrammarCore,
  detectLexiconBoundary,
  withRetry,
  MAX_CHUNK_SIZE,
  MAX_RETRIES,
} from './chunker';

// ---------------------------------------------------------------------------
// Tipos de entrada/salida
// ---------------------------------------------------------------------------

export interface InductProgress {
  /** Current chunk being processed (1-based). */
  chunk: number;
  /** Total chunks. */
  total: number;
  /** Human-readable status message. */
  message: string;
  /** Character count of the current chunk (optional — for UI detail). */
  charCount?: number;
}

export interface InductOptions {
  /** Score del parser local (0-100). Si no se provee, se calcula automáticamente. */
  parserLocalScore?: number;
  /** Si hay LLM disponible. Default: false. */
  llmAvailable?: boolean;
  /** Output del LLM (para testing). Si no se provee, se simula. */
  llmOutput?: { manifest: DeclarativeManifest; confidence: number } | null;
  /** Callback para llamar al LLM con un prompt. Usa esta función para la ruta de producción. */
  llmCall?: (prompt: string) => Promise<{ manifest: DeclarativeManifest; confidence: number }>;
  /** Progreso del procesamiento (disparado durante chunking). */
  onProgress?: (progress: InductProgress) => void;
  /** Per-chunk result callback (E4: incremental manifests). Fired after each chunk completes. */
  onChunkResult?: (chunkIndex: number, result: { manifest: DeclarativeManifest; confidence: number } | null, note: string) => void;
}

export interface InductResult {
  /** Manifiesto final (normalizado) */
  manifest: DeclarativeManifest;
  /** Confidence 0-100 */
  confidence: number;
  /** Método usado */
  method: 'local' | 'llm' | 'hybrid';
  /** Reporte de parsing del parser local */
  parseReport: ParseReport;
  /** Reporte de validación post-import */
  report: ImportValidationReport;
  /** Notas adicionales, incluyendo errores de IA o notas de chunking */
  notes?: string[];
}

// Re-export for convenience
export { MAX_CHUNK_SIZE };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyNormalization(manifest: DeclarativeManifest): DeclarativeManifest {
  const normalized = normalize(manifest);
  return normalized.manifest;
}

export function computeScore(manifest: DeclarativeManifest, report: ParseReport): number {
  let points = 0;

  // Tipología: 20 pts
  if (manifest.typology.wordOrder && manifest.typology.morphology && manifest.typology.headDirection) {
    points += 20;
  } else if (manifest.typology.wordOrder || manifest.typology.morphology) {
    points += 10;
  }

  // Fonología: 15 pts
  if (manifest.phonology.consonants.length > 0 || manifest.phonology.vowels.length > 0) {
    points += 15;
  }

  // Paradigmas: 40 pts
  if (manifest.paradigms.length > 0) {
    points += 20;
    const slotsWithForm = manifest.paradigms.reduce(
      (acc, p) => acc + p.slots.filter(s => s.realization.form).length,
      0
    );
    if (slotsWithForm > 0) points += 20;
  }

  // Estrategias: 10 pts
  if (manifest.strategies.length > 0) points += 10;

  // Excepciones: 5 pts
  if (manifest.exceptions.length > 0) points += 5;

  // Roles: 5 pts
  if (manifest.roles.length > 0) points += 5;

  // Penalización por secciones no parseadas
  points -= report.sectionsUnparsed.length * 5;

  // Penalización por warnings graves
  points -= report.warnings.filter(w => w.includes('no pudo') || w.includes('No se detect')).length * 3;

  return Math.max(0, Math.min(100, points));
}

// ---------------------------------------------------------------------------
// LLM invocation with chunking, retry, and Zod validation
// ---------------------------------------------------------------------------

/**
 * Call the LLM for a single chunk (or full text) using the provided llmCall.
 * Handles JSON extraction, Zod validation, and single retry on malformed JSON.
 *
 * @returns { manifest, confidence, notes } where notes captures any issues.
 */
async function callLlmForChunk(
  chunkText: string,
  llmCall: (prompt: string) => Promise<{ manifest: DeclarativeManifest; confidence: number }>,
  notes: string[],
): Promise<{ manifest: DeclarativeManifest; confidence: number } | null> {
  const prompt = getLlmPrompt(chunkText);
  let attempt = 0;
  const maxAttempts = 2; // 1 initial + 1 retry on malformed JSON / Zod failure

  while (attempt < maxAttempts) {
    try {
      const result = await llmCall(prompt);
      // Defensive re-validation: llmCall should already validate, but tests
      // may pass a mock that doesn't. This also handles the case where llmCall
      // returns without throwing but the manifest is structurally invalid.
      const validation = validateLlmManifest(result.manifest);
      if (validation.ok) {
        return { manifest: validation.manifest, confidence: result.confidence };
      }
      // Validation failed (non-ok) — retry once (A4: malformed JSON → one retry)
      if (attempt < maxAttempts - 1) {
        notes.push(`Chunk: JSON inválido (Zod: ${validation.error}). Reintentando...`);
      } else {
        notes.push(`Chunk: JSON inválido después de reintentar. Detalles: ${validation.error}`);
        return null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isTransient = msg.toLowerCase().includes('429') ||
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('econnreset');

      if (isTransient) {
        // 429/timeout — throw immediately so withRetry can apply backoff
        throw e;
      }

      // Non-transient error (malformed JSON, Zod failure, network) — retry once
      if (attempt < maxAttempts - 1) {
        notes.push(`Chunk: error (${msg}). Reintentando...`);
      } else {
        notes.push(`Chunk: error después de reintentar. ${msg}`);
        return null;
      }
    }
    attempt++;
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return null;
}

/**
 * Process text through the LLM with automatic chunking for large documents.
 * Returns an array of partial manifests from successful chunks, plus notes.
 */
async function callLlmChunked(
  rawText: string,
  llmCall: (prompt: string) => Promise<{ manifest: DeclarativeManifest; confidence: number }>,
  onProgress?: (progress: InductProgress) => void,
  onChunkResult?: (chunkIndex: number, result: { manifest: DeclarativeManifest; confidence: number } | null, note: string) => void,
): Promise<{ manifests: DeclarativeManifest[]; confidence: number; notes: string[] }> {
  const notes: string[] = [];

  // Extract grammar core (exclude lexicon section if present)
  const { boundary, note: lexNote } = detectLexiconBoundary(rawText);
  if (boundary) {
    notes.push(lexNote);
  }
  const coreText = boundary ? extractGrammarCore(rawText) : rawText;

  // Split into chunks
  let chunks = splitIntoChunks(coreText);
  let totalChunks = chunks.length;

  // Fallback: if the chunker produced zero chunks (e.g. short text below
  // MIN_SUBSTANTIVE_CHARS with no section delimiters), fall back to the full
  // core text as a single chunk so the LLM is still invoked rather than
  // silently dropped.
  if (totalChunks === 0 && coreText.trim().length > 0) {
    chunks = [{
      index: 0,
      displayIndex: 1,
      total: 1,
      text: coreText,
      startLine: 0,
      charCount: coreText.length,
    }];
    totalChunks = 1;
  }

  if (totalChunks === 1) {
    // Single chunk — no chunking overhead
    const chunkText = chunks[0].text;
    onProgress?.({ chunk: 1, total: 1, message: 'Analizando con IA...', charCount: chunks[0].charCount });
    const result = await withRetry(
      () => callLlmForChunk(chunkText, llmCall, notes),
      MAX_RETRIES,
      undefined,
      (attempt, err) => {
        notes.push(`Reintento ${attempt + 1}/${MAX_RETRIES}: ${err.message}`);
      },
    );
    if (result) {
      onChunkResult?.(0, { manifest: result.manifest, confidence: result.confidence }, 'single-chunk success');
      return { manifests: [result.manifest], confidence: result.confidence, notes };
    }
    onChunkResult?.(0, null, 'single-chunk failed');
    return { manifests: [], confidence: 0, notes };
  }

  // Multiple chunks — sequential with progress
  const successfulManifests: DeclarativeManifest[] = [];
  let maxConfidence = 0;
  let failedChunks = 0;

  for (const chunk of chunks) {
    onProgress?.({
      chunk: chunk.displayIndex,
      total: totalChunks,
      message: `Analizando con IA — parte ${chunk.displayIndex}/${totalChunks}`,
      charCount: chunk.charCount,
    });

    const result = await withRetry(
      () => callLlmForChunk(chunk.text, llmCall, notes),
      MAX_RETRIES,
      undefined,
      (attempt, err) => {
        const is429 = err.message.toLowerCase().includes('429') || err.message.toLowerCase().includes('rate');
        if (is429) {
          notes.push(`Chunk ${chunk.displayIndex}: rate limit (429). Reintento ${attempt + 1}/${MAX_RETRIES}.`);
        }
      },
    );

    if (result) {
      successfulManifests.push(result.manifest);
      maxConfidence = Math.max(maxConfidence, result.confidence);
      onChunkResult?.(chunk.index, { manifest: result.manifest, confidence: result.confidence }, 'success');
    } else {
      failedChunks++;
      // Fall back: parse this chunk locally so nothing is lost
      const localFallback = parseLocal(chunk.text);
      successfulManifests.push(localFallback.manifest);
      notes.push(`Chunk ${chunk.displayIndex}: IA falló, usando parser local como fallback.`);
      onChunkResult?.(chunk.index, { manifest: localFallback.manifest, confidence: 0 }, 'local fallback');
    }

    // Yield to event loop to prevent UI freeze
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (failedChunks > 0) {
    notes.push(`${failedChunks} chunk(s) fallaron con IA y se usaron resultados locales.`);
  }

  return { manifests: successfulManifests, confidence: maxConfidence, notes };
}

// ---------------------------------------------------------------------------
// Prompt para el LLM (formato declarativo)
// ---------------------------------------------------------------------------

export const LLM_PROMPT_TEMPLATE = (rawText: string): string => `Eres un lingüista computacional. Convierte la siguiente descripción de gramática al formato declarativo JSON.

SOLO devuelve JSON. No devuelvas markdown, no devuelvas texto narrativo, no devuelvas explicaciones.
Si una sección no está en el texto, devuélvela como array vacío o null.

FORMATO DECLARATIVO (respeta nombres exactos):
{
  "name": "NombreDelIdioma",
  "typology": {
    "wordOrder": "SVO|SOV|VSO|VOS|OVS|OSV",
    "morphology": "isolating|agglutinative|fusional|polysynthetic",
    "headDirection": "head-initial|head-final",
    "alignment": "string"
  },
  "phonology": {
    "consonants": ["p","t","k"],
    "vowels": ["a","e","i"],
    "syllableStructures": ["CV","CVC"]
  },
  "paradigms": [
    {
      "category": "noun|verb|adjective|numeral|pronoun|particle|preposition|conjunction|interjection|adverb|article|determiner|auxiliary|clitic",
      "slots": [
        {
          "id": "plural",
          "feature": "number|tense|case|gender|person|aspect|mood|voice|definiteness|polarity",
          "order": 1,
          "realization": {
            "kind": "affix|mutation|tone|stem|particle",
            "form": "-k",
            "when": "prevVowel|afterConsonant|wordInitial|always",
            "position": "prefix|suffix|infix|circumfix"
          }
        }
      ]
    }
  ],
  "strategies": [
    {
      "id": "s1",
      "name": "Sufijo plural",
      "type": "affix|clitic|particle|tone|mutation|position|auxiliary|suppletion",
      "affixRule": { "position": "suffix", "form": "-k" },
      "particleRule": { "marker": "ka", "relativePosition": "before" }
    }
  ],
  "mutationRules": [],
  "exceptions": [
    {
      "id": "ex1",
      "ruleDescription": "ir → fue",
      "exceptionPattern": "ir → fue",
      "context": "supletiva",
      "example": "ir → fue"
    }
  ],
  "roles": [
    { "id": "subject", "name": "Sujeto", "description": "Participante que realiza la acción" }
  ]
}

REGLAS:
- Usa IDs sin acentos, sin espacios, snake_case para compounds
- Categories: usa IDs canónicos (noun, verb, adjective, numeral, pronoun, particle, etc.)
- positions: prefix|suffix|infix|circumfix
- kinds: affix|mutation|tone|stem|particle
- Si no estás seguro de un valor, usa tu mejor estimación
- No inventes categorías que no estén en el texto
- Los arrays vacíos [] son válidos para secciones no mencionadas

ANTI-ALUCINACIÓN (CRÍTICO):
- Los valores ILUSTRATIVOS entre comillas en el FORMATO (-k, prevVowel, "ir → fue") son SOLO ejemplos de estructura. NO los copies si NO aparecen en el DOCUMENTO real.
- Para exceptions, roles y slots: solo incluye valores que estén REALMENTE descritos en el documento.
- Si el documento NO menciona excepciones, usa el array vacío [] para exceptions.
- Si el documento NO menciona estrategias, usa [] para strategies.
- No inventes datos de fonología, roles o excepciones fuera del texto.

DOCUMENTO:
${rawText}`;

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export async function inductFromText(
  rawText: string,
  options: InductOptions = {}
): Promise<InductResult> {
  const { llmAvailable = false, llmOutput, llmCall, parserLocalScore: providedScore, onProgress } = options;

  // Paso 1: Parser local siempre
  const localResult = parseLocal(rawText);
  const localScore = providedScore ?? computeScore(localResult.manifest, localResult.report);

  // Determine if AI should be used:
  // AI is needed when available AND (score < 60 OR there are unparsed sections)
  const hasUnparsed = localResult.report.sectionsUnparsed.length > 0;
  const shouldUseAI = llmAvailable && (localScore < 60 || hasUnparsed) && (llmCall || llmOutput);

  // -----------------------------------------------------------------------
  // Caso A: No AI needed or not available → usar solo local
  // -----------------------------------------------------------------------
  if (!shouldUseAI) {
    const manifest = applyNormalization(localResult.manifest);
    return {
      manifest,
      confidence: localScore,
      method: 'local',
      parseReport: localResult.report,
      report: buildValidationReport(manifest, localResult.report),
    };
  }

  // -----------------------------------------------------------------------
  // Caso B: LLM disponible → intentar LLM
  // -----------------------------------------------------------------------
  const notes: string[] = [];

  // Test path: llmOutput provided directly (no chunking, no real API call)
  if (llmOutput) {
    try {
      const llmResult = llmOutput;

      // Mergear: local para lo que parseó bien, LLM para el resto
      const mergedManifest: DeclarativeManifest = mergeLocalAndLlm(localResult.manifest, llmResult.manifest);
      const normalized = applyNormalization(mergedManifest);
      const mergedScore = Math.max(localScore, llmResult.confidence);

      return {
        manifest: normalized,
        confidence: mergedScore,
        method: 'hybrid',
        parseReport: localResult.report,
        report: buildValidationReport(normalized, localResult.report),
        notes,
      };
    } catch (error) {
      // LLM falló → fallback a local (NO segunda llamada a IA)
      console.warn('[inductFromText] LLM falló, usando resultado local:', error);
      const manifest = applyNormalization(localResult.manifest);
      return {
        manifest,
        confidence: localScore,
        method: 'local',
        parseReport: localResult.report,
        report: buildValidationReport(manifest, localResult.report),
        notes: [`LLM falló: ${error instanceof Error ? error.message : 'unknown'}. Usando parser local.`],
      };
    }
  }

  // Production path: llmCall provided — use chunking + retry + Zod validation
  if (llmCall) {
    try {
      const { onChunkResult } = options;
      const llmResult = await callLlmChunked(rawText, llmCall, onProgress, onChunkResult);

      // Merge LLM notes (chunking, lexicon exclusion, retry, fallback, etc.)
      notes.push(...llmResult.notes);

      if (llmResult.manifests.length === 0) {
        // All chunks failed → fallback to local with clear error message
        notes.push('IA falló en todos los chunks. Usando parser local como fallback.');
        const manifest = applyNormalization(localResult.manifest);
        return {
          manifest,
          confidence: localScore,
          method: 'local',
          parseReport: localResult.report,
          report: buildValidationReport(manifest, localResult.report),
          notes,
        };
      }

      // Merge all chunk manifests (map-reduce)
      const llmManifest = llmResult.manifests.length === 1
        ? llmResult.manifests[0]
        : mergeManifests(llmResult.manifests);

      // Merge with local: LLM enriches, local fills gaps
      const mergedManifest = mergeLocalAndLlm(localResult.manifest, llmManifest);
      const normalized = applyNormalization(mergedManifest);

      // Add unparsed sections that neither LLM nor local could interpret
      const uninterpretedFromLocal = localResult.report.sectionsUnparsed;
      if (uninterpretedFromLocal.length > 0) {
        notes.push(`Secciones no interpretadas por el parser local: ${uninterpretedFromLocal.join(', ')}`);
      }

      const mergedScore = Math.max(localScore, llmResult.confidence);

      return {
        manifest: normalized,
        confidence: mergedScore,
        method: 'hybrid',
        parseReport: localResult.report,
        report: buildValidationReport(normalized, localResult.report),
        notes,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown';
      console.warn('[inductFromText] LLM chunked call falló, usando resultado local:', msg);
      const manifest = applyNormalization(localResult.manifest);
      return {
        manifest,
        confidence: localScore,
        method: 'local',
        parseReport: localResult.report,
        report: buildValidationReport(manifest, localResult.report),
        notes: [`IA falló: ${msg}. Usando parser local.`],
      };
    }
  }

  // Should not reach here, but as a safety net
  const manifest = applyNormalization(localResult.manifest);
  return {
    manifest,
    confidence: localScore,
    method: 'local',
    parseReport: localResult.report,
    report: buildValidationReport(manifest, localResult.report),
  };
}

// ---------------------------------------------------------------------------
// ValidationReport builder
// ---------------------------------------------------------------------------

function buildValidationReport(
  manifest: DeclarativeManifest,
  parseReport: ParseReport
): ImportValidationReport {
  const problems: ImportValidationReport['problems'] = [];
  const suggestions: ImportValidationReport['suggestions'] = [];

  // Paradigmas
  if (manifest.paradigms.length === 0) {
    problems.push({
      severity: 'error',
      location: 'paradigms',
      message: 'Sin paradigmas definidos',
      fix: 'Añade al menos un paradigma con slots de inflexión',
    });
    suggestions.push('Añade paradigmas de inflexión para categorías léxicas');
  } else {
    const emptySlots = manifest.paradigms.flatMap(p =>
      p.slots.filter(s => !s.realization.form).map(s => `${p.category}.${s.feature}`)
    );
    if (emptySlots.length > 0) {
      problems.push({
        severity: 'warning',
        location: 'paradigms',
        message: `${emptySlots.length} slots tienen realization vacía`,
        fix: 'Completa la propiedad form en cada slot',
      });
    }
  }

  // Tipología
  if (!manifest.typology.wordOrder) {
    problems.push({ severity: 'error', location: 'typology.wordOrder', message: 'Orden de palabras no definido' });
  }
  if (!manifest.typology.morphology) {
    problems.push({ severity: 'warning', location: 'typology.morphology', message: 'Tipo de morfología no definido' });
  }

  // Fonología
  if (manifest.phonology.consonants.length === 0 && manifest.phonology.vowels.length === 0) {
    problems.push({ severity: 'warning', location: 'phonology', message: 'Sin inventario fonológico' });
    suggestions.push('Añade al menos algunos fonemas consonánticos o vocálicos');
  }

  // Estrategias no usadas
  const categoriesInParadigms = new Set(manifest.paradigms.map(p => p.category));
  const unusedStrategies = manifest.strategies.filter(s => {
    const appliesTo = s.appliesToCategories || s.appliesTo || [];
    return appliesTo.length > 0 && !appliesTo.some(c => categoriesInParadigms.has(c));
  });
  if (unusedStrategies.length > 0) {
    problems.push({
      severity: 'info',
      location: 'strategies',
      message: `${unusedStrategies.length} estrategias no están mapeadas a ningún paradigma`,
      fix: 'Añade categorías objetivo a las estrategias o crea paradigmas para ellas',
    });
  }

  // Excepciones
  if (manifest.exceptions.length === 0 && manifest.paradigms.length > 0) {
    suggestions.push('Considera añadir excepciones supletivas (ej: ir → fue)');
  }

  // Secciones no parseadas
  if (parseReport.sectionsUnparsed.length > 0) {
    problems.push({
      severity: 'info',
      location: 'sections',
      message: `${parseReport.sectionsUnparsed.length} secciones no pudieron parsearse`,
      fix: `Revisa estas secciones: ${parseReport.sectionsUnparsed.join(', ')}`,
    });
    suggestions.push(`Revisa manualmente las secciones: ${parseReport.sectionsUnparsed.join(', ')}`);
  }

  // Score
  let score = 0;
  if (manifest.typology.wordOrder) score += 20;
  if (manifest.typology.morphology && manifest.typology.headDirection) score += 20;
  if (manifest.phonology.consonants.length > 0 || manifest.phonology.vowels.length > 0) score += 15;
  if (manifest.paradigms.length > 0) {
    score += 20;
    if (manifest.paradigms.some(p => p.slots.some(s => s.realization))) score += 20;
  }
  if (manifest.strategies.length > 0) score += 10;
  if (manifest.exceptions.length > 0) score += 5;
  if (manifest.roles.length > 0) score += 5;
  score = Math.max(0, Math.min(100, score));

  const ok = score >= 50;

  return {
    ok,
    score,
    sections: {
      phonology: manifest.phonology.consonants.length > 0 || manifest.phonology.vowels.length > 0 ? 'ok' : 'empty',
      typology: manifest.typology.wordOrder ? 'ok' : 'missing',
      paradigms: manifest.paradigms.length > 0 ? (manifest.paradigms.some(p => p.slots.some(s => s.realization.form)) ? 'ok' : 'partial') : 'empty',
      strategies: manifest.strategies.length > 0 ? 'ok' : 'empty',
      exceptions: manifest.exceptions.length > 0 ? 'ok' : 'empty',
      roles: manifest.roles.length > 0 ? 'ok' : 'empty',
    },
    problems,
    suggestions,
  };
}

// ---------------------------------------------------------------------------
// Prompt getter (para testing y producción)
// ---------------------------------------------------------------------------

/**
 * Generate the LLM prompt from raw text. Extracted for testability.
 */
export function getLlmPrompt(rawText: string): string {
  return LLM_PROMPT_TEMPLATE(rawText);
}
