/**
 * normalizer.ts — Capa de normalización sobre DeclarativeManifest.
 *
 * Usa taxonomy.ts como fuente de verdad para resolver aliases →
 * canonical keys. Se ejecuta DESPUÉS del parser local o del LLM,
 * garantizando que todo el manifiesto tenga valores normalizados
 * antes de entrar al motor.
 *
 * Flujo:
 *   textParser / LLM → DeclarativeManifest (con variantes) →
 *   normalize() → DeclarativeManifest (todo en canonical) +
 *   NormalizationReport
 */

import type { DeclarativeManifest, DeclarativeParadigm, DeclarativeStrategy, DeclarativeSlot } from './declarativeFormat';
import {
  resolveLexicalCategory,
  resolveGrammaticalRole,
  resolveAffixPosition,
  resolveMorphemeKind,
  resolveNodeType,
  resolveConnectionType,
  LEXICAL_CATEGORIES,
  GRAMMATICAL_ROLES,
  AFFIX_POSITIONS,
  MORPHEME_KINDS,
  STRATEGY_LEGEND,
  ENGINE_STRATEGY_MAP,
} from '../../data/taxonomy';

// ---------------------------------------------------------------------------
// Mapa auxiliar: AFFIX_POSITIONS alias → LEGEND key (para strategy type resolution)
// ---------------------------------------------------------------------------

const affixPosToLegendKey: Record<string, string> = {};
AFFIX_POSITIONS.forEach(ap => {
  ap.aliases.forEach(alias => {
    affixPosToLegendKey[alias.toLowerCase()] = ap.key;
  });
});

// ---------------------------------------------------------------------------
// Tipos de reporte
// ---------------------------------------------------------------------------

export interface NormalizationChange {
  /** Ruta del campo cambiado (dot notation) */
  path: string;
  /** Valor original */
  from: string;
  /** Valor normalizado */
  to: string;
}

export interface NormalizationReport {
  /** Todos los cambios realizados */
  changes: NormalizationChange[];
  /** Cantidad de valores no reconocidos (quedaron como estaban) */
  unrecognized: string[];
  /** ¿Hubo al menos un cambio? */
  didChange: boolean;
}

// ---------------------------------------------------------------------------
// Helpers de resolución por dominio
// ---------------------------------------------------------------------------

/**
 * Normaliza categoría léxica usando taxonomy.ts.
 * Fallback: si no encuentra match, devuelve el input limpio (no 'desconocida'
 * porque el parser local ya mapeó lo obvio).
 */
function normalizeCategory(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return input ?? '';
  const trimmed = input.trim();
  if (!trimmed) return input;
  const resolved = resolveLexicalCategory(trimmed);
  // resolveLexicalCategory devuelve 'desconocida' si no hay match
  return resolved === 'desconocida' ? trimmed.toLowerCase() : resolved;
}

/**
 * Normaliza rol gramatical.
 */
function normalizeRole(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return input ?? '';
  const trimmed = input.trim();
  if (!trimmed) return input;
  return resolveGrammaticalRole(trimmed);
}

/**
 * Normaliza posición de afijo.
 */
function normalizeAffixPosition(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return input ?? '';
  const trimmed = input.trim();
  if (!trimmed) return input;
  return resolveAffixPosition(trimmed);
}

/**
 * Normaliza tipo de morfema (kind).
 */
function normalizeMorphemeKind(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return input ?? '';
  const trimmed = input.trim();
  if (!trimmed) return input;
  return resolveMorphemeKind(trimmed);
}

/**
 * Normaliza StrategyType desde STRATEGY_LEGEND key o alias hacia
 * el StrategyType del motor (affix/clitic/particle/tone/mutation/position/auxiliary).
 *
 * También busca en AFFIX_POSITIONS porque términos como "sufijación"
 * son procesos de afijo que mapean a estrategia 'affix'.
 */
function normalizeStrategyType(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return input ?? '';
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return input;

  // Normalizar: quitar acentos para comparación
  const normalizedNoAccents = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Buscar en ENGINE_STRATEGY_MAP por key o alias de STRATEGY_LEGEND
  for (const [legendKey, engineType] of Object.entries(ENGINE_STRATEGY_MAP)) {
    if (!engineType) continue;
    if (legendKey === trimmed || legendKey === normalizedNoAccents) return engineType;
    const entry = STRATEGY_LEGEND.find(e => e.key === legendKey);
    if (entry?.aliases.some(a => a.toLowerCase() === trimmed || a.toLowerCase() === normalizedNoAccents)) return engineType;
  }

  // 2. Buscar en AFFIX_POSITIONS → mapear a 'affix'
  const affixLegendKey = affixPosToLegendKey[trimmed] || affixPosToLegendKey[normalizedNoAccents];
  if (affixLegendKey && ENGINE_STRATEGY_MAP[affixLegendKey]) {
    const engineType = ENGINE_STRATEGY_MAP[affixLegendKey];
    if (engineType) return engineType;
  }

  // 3. Si ya es un StrategyType válido, devolverlo
  const validTypes: string[] = ['affix', 'clitic', 'particle', 'tone', 'mutation', 'position', 'auxiliary', 'suppletion'];
  if (validTypes.includes(trimmed) || validTypes.includes(normalizedNoAccents)) return trimmed;

  return input;
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

/**
 * Normaliza todas las entidades de un DeclarativeManifest usando
 * taxonomy.ts como fuente de verdad.
 *
 * @param manifest - Manifiesto a normalizar (se clona, no muta el original)
 * @returns { manifest: DeclarativeManifest, report: NormalizationReport }
 */
export function normalize(manifest: DeclarativeManifest): {
  manifest: DeclarativeManifest;
  report: NormalizationReport;
} {
  const changes: NormalizationChange[] = [];
  const unrecognized: string[] = [];
  const seenUnrecognized = new Set<string>();

  // Clonar manifiesto (shallow copy + map profundo de arrays mutables)
  const out: DeclarativeManifest = {
    ...manifest,
    paradigms: manifest.paradigms.map(p => ({ ...p, slots: p.slots.map(s => ({ ...s, realization: { ...s.realization } })) })),
    strategies: manifest.strategies.map(s => ({ ...s })),
    mutationRules: manifest.mutationRules.map(r => ({ ...r })),
    exceptions: manifest.exceptions.map(e => ({ ...e })),
    roles: manifest.roles.map(r => ({ ...r })),
  };

  // Normalizar roles
  out.roles = out.roles.map((r, idx) => {
    const original = r.id;
    const normalized = normalizeRole(original);
    if (normalized !== original) {
      changes.push({ path: `roles[${idx}].id`, from: original, to: normalized });
    } else if (!GRAMMATICAL_ROLES.some(gr => gr.key === normalized || gr.aliases.some(a => a.toLowerCase() === normalized.toLowerCase()))) {
      if (!seenUnrecognized.has(original)) {
        unrecognized.push(original);
        seenUnrecognized.add(original);
      }
    }
    return { ...r, id: normalized, name: r.name };
  });

  // Normalizar paradigms: categories, slots, features, realization
  out.paradigms = out.paradigms.map((p, idx) => {
    const originalCat = p.category;
    const normalizedCat = normalizeCategory(originalCat);
    if (normalizedCat !== originalCat) {
      changes.push({ path: `paradigms[${idx}].category`, from: originalCat, to: normalizedCat });
    }

    const slots = p.slots.map((s, sIdx) => {
      const slotChanges: NormalizationChange[] = [];
      const slotOut: DeclarativeSlot = { ...s, realization: { ...s.realization } };

      // feature: dejar como está (son valores de rasgo, no taxonomía)
      // order: numérico, no tocar
      // realization.kind
      const originalKind = slotOut.realization.kind;
      const normalizedKind = normalizeMorphemeKind(originalKind);
      if (normalizedKind !== originalKind) {
        changes.push({ path: `paradigms[${idx}].slots[${sIdx}].realization.kind`, from: originalKind, to: normalizedKind });
      }
      slotOut.realization = { ...slotOut.realization, kind: normalizedKind as DeclarativeSlot['realization']['kind'] };

      // realization.position
      const originalPos = slotOut.realization.position;
      if (originalPos) {
        const normalizedPos = normalizeAffixPosition(originalPos);
        if (normalizedPos !== originalPos) {
          changes.push({ path: `paradigms[${idx}].slots[${sIdx}].realization.position`, from: originalPos, to: normalizedPos });
        }
        slotOut.realization = { ...slotOut.realization, position: normalizedPos as DeclarativeSlot['realization']['position'] };
      }

      // realization.form: dejar como está (es la forma linguística)

      return slotOut;
    });

    return { ...p, category: normalizedCat, slots };
  });

  // Normalizar strategies
  out.strategies = out.strategies.map((s, idx) => {
    const originalType = s.type;
    const normalizedType = normalizeStrategyType(originalType);
    if (normalizedType !== originalType) {
      changes.push({ path: `strategies[${idx}].type`, from: originalType, to: normalizedType });
    }

    // affixRule.position si existe
    let affixRule = s.affixRule;
    if (affixRule?.position) {
      const originalPos = affixRule.position;
      const normalizedPos = normalizeAffixPosition(originalPos);
      if (normalizedPos !== originalPos) {
        changes.push({ path: `strategies[${idx}].affixRule.position`, from: originalPos, to: normalizedPos });
        affixRule = { ...affixRule, position: normalizedPos };
      }
    }

    return { ...s, type: normalizedType as DeclarativeStrategy['type'], affixRule };
  });

  // Normalizar mutationRules (pattern/replacement, no fromCategory/toCategory)
  out.mutationRules = out.mutationRules.map((r, idx) => {
    // mutationRules no tienen campos de categoría en DeclarativeMutationRule
    // La normalización de categorías se hace en el paso de bridge hacia GrammarManifest
    return r;
  });

  // Normalizar exceptions (context es strategy type, no categoría)
  out.exceptions = out.exceptions.map((e, idx) => {
    const updated = { ...e };
    if (e.context) {
      const original = e.context;
      // Intentar normalizar como strategy type primero (supletiva → suppletion)
      const normalizedStrategy = normalizeStrategyType(original);
      if (normalizedStrategy !== original) {
        changes.push({ path: `exceptions[${idx}].context`, from: original, to: normalizedStrategy });
        updated.context = normalizedStrategy;
      }
    }
    return updated;
  });

  const report: NormalizationReport = {
    changes,
    unrecognized,
    didChange: changes.length > 0,
  };

  return { manifest: out, report };
}
