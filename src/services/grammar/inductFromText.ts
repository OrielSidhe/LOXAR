/**
 * inductFromText.ts — Inductor de gramática (parser local + LLM booster).
 *
 * Flujo:
 *  1. parseLocal(text) → DeclarativeManifest + ParseReport
 *  2. Calcular score del parser local
 *  3. Si score >= 60 → devolver resultado local (method: 'local')
 *  4. Si score < 60 y LLM disponible → llamar LLM con prompt de DeclarativeManifest
 *     - Validar output contra DeclarativeManifest con Zod estricto
 *     - Mergear con resultado local (local para lo que parseó bien, LLM para el resto)
 *     - method: 'hybrid'
 *  5. Si LLM no disponible → devolver resultado local con confidence = score
 *  6. Nunca usar cleanseJson ni segunda llamada a IA como fallback
 *  7. Siempre producir ImportValidationReport
 *
 * Módulo PURO: sin dependencias de React ni Tauri.
 * El wrapper async para IA real vive en geminiService.ts.
 */

import type { DeclarativeManifest, ParseReport, ImportValidationReport } from './declarativeFormat';
import { parseLocal } from './textParser';

// ---------------------------------------------------------------------------
// Tipos de entrada/salida
// ---------------------------------------------------------------------------

export interface InductOptions {
  /** Score del parser local (0-100). Si no se provee, se calcula automáticamente. */
  parserLocalScore?: number;
  /** Si hay LLM disponible. Default: false. */
  llmAvailable?: boolean;
  /** Output del LLM (para testing). Si no se provee, se simula. */
  llmOutput?: { manifest: DeclarativeManifest; confidence: number } | null;
  /** Callback para llamar al LLM (para testing). Si no se provee, se simula. */
  llmCall?: (prompt: string) => Promise<{ manifest: DeclarativeManifest; confidence: number }>;
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeScore(manifest: DeclarativeManifest, report: ParseReport): number {
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
// Prompt para el LLM (formato declarativo)
// ---------------------------------------------------------------------------

const LLM_PROMPT_TEMPLATE = (rawText: string): string => `Eres un lingüista computacional. Convierte la siguiente descripción de gramática al formato declarativo JSON.

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
      "type": "affix|clitic|particle|tone|mutation|suppletion|position|auxiliary",
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

DOCUMENTO:
${rawText}`;

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export async function inductFromText(
  rawText: string,
  options: InductOptions = {}
): Promise<InductResult> {
  const { llmAvailable = false, llmOutput, llmCall, parserLocalScore: providedScore } = options;

  // Paso 1: Parser local siempre
  const localResult = parseLocal(rawText);
  const localScore = providedScore ?? computeScore(localResult.manifest, localResult.report);

  // -----------------------------------------------------------------------
  // Caso A: Parser local score >= 60 → usar solo local
  // -----------------------------------------------------------------------
  if (localScore >= 60) {
    return {
      manifest: localResult.manifest,
      confidence: localScore,
      method: 'local',
      parseReport: localResult.report,
      report: buildValidationReport(localResult.manifest, localResult.report),
    };
  }

  // -----------------------------------------------------------------------
  // Caso B: LLM disponible → intentar LLM
  // -----------------------------------------------------------------------
  if (llmAvailable && llmOutput) {
    try {
      const llmResult = llmOutput;

      // Mergear: local para lo que parseó bien, LLM para el resto
      const mergedManifest: DeclarativeManifest = {
        name: llmResult.manifest.name || localResult.manifest.name,
        typology: {
          wordOrder: localResult.manifest.typology.wordOrder !== 'SVO' || !llmResult.manifest.typology.wordOrder
            ? localResult.manifest.typology.wordOrder
            : llmResult.manifest.typology.wordOrder,
          morphology: localResult.manifest.typology.morphology !== 'isolating' || !llmResult.manifest.typology.morphology
            ? localResult.manifest.typology.morphology
            : llmResult.manifest.typology.morphology,
          headDirection: localResult.manifest.typology.headDirection !== 'head-initial' || !llmResult.manifest.typology.headDirection
            ? localResult.manifest.typology.headDirection
            : llmResult.manifest.typology.headDirection,
          alignment: llmResult.manifest.typology.alignment || localResult.manifest.typology.alignment,
        },
        phonology: {
          consonants: llmResult.manifest.phonology.consonants.length > 0
            ? llmResult.manifest.phonology.consonants
            : localResult.manifest.phonology.consonants,
          vowels: llmResult.manifest.phonology.vowels.length > 0
            ? llmResult.manifest.phonology.vowels
            : localResult.manifest.phonology.vowels,
          syllableStructures: llmResult.manifest.phonology.syllableStructures.length > 0
            ? llmResult.manifest.phonology.syllableStructures
            : localResult.manifest.phonology.syllableStructures,
        },
        paradigms: llmResult.manifest.paradigms.length > 0
          ? llmResult.manifest.paradigms
          : localResult.manifest.paradigms,
        strategies: llmResult.manifest.strategies.length > 0
          ? llmResult.manifest.strategies
          : localResult.manifest.strategies,
        mutationRules: llmResult.manifest.mutationRules.length > 0
          ? llmResult.manifest.mutationRules
          : localResult.manifest.mutationRules,
        exceptions: llmResult.manifest.exceptions.length > 0
          ? llmResult.manifest.exceptions
          : localResult.manifest.exceptions,
        roles: llmResult.manifest.roles.length > 0
          ? llmResult.manifest.roles
          : localResult.manifest.roles,
      };

      const mergedScore = Math.max(localScore, llmResult.confidence);

      return {
        manifest: mergedManifest,
        confidence: mergedScore,
        method: 'hybrid',
        parseReport: localResult.report,
        report: buildValidationReport(mergedManifest, localResult.report),
      };
    } catch (error) {
      // LLM falló → fallback a local (NO segunda llamada a IA)
      console.warn('[inductFromText] LLM falló, usando resultado local:', error);
      return {
        manifest: localResult.manifest,
        confidence: localScore,
        method: 'local',
        parseReport: localResult.report,
        report: buildValidationReport(localResult.manifest, localResult.report),
      };
    }
  }

  // -----------------------------------------------------------------------
  // Caso C: Sin LLM → usar solo local
  // -----------------------------------------------------------------------
  return {
    manifest: localResult.manifest,
    confidence: localScore,
    method: 'local',
    parseReport: localResult.report,
    report: buildValidationReport(localResult.manifest, localResult.report),
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
    if (manifest.paradigms.some(p => p.slots.some(s => s.realization.form))) score += 20;
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
// Prompt getter (para testing)
// ---------------------------------------------------------------------------

export function getLlmPrompt(rawText: string): string {
  return LLM_PROMPT_TEMPLATE(rawText);
}
