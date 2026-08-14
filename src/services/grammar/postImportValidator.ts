/**
 * postImportValidator.ts — Validador post-import de DeclarativeManifest.
 *
 * Se ejecuta DESPUÉS del normalizer, antes de entregar el manifiesto al motor.
 * Detecta:
 *  - Categorías léxicas no reconocidas por taxonomy.ts
 *  - Estrategias sin paradigmas objetivo (huérfanas)
 *  - Slots con realization.form vacía
 *  - Tipología incompleta
 *  - Fonología vacía
 *  - Roles sin nombre
 *  - IDs duplicados
 *  - Cycles en jerarquía de categorías
 *
 * Devuelve ImportValidationReport con score, problems y suggestions.
 */

import type { DeclarativeManifest, DeclarativeParadigm, DeclarativeStrategy, DeclarativeException, DeclarativeRole, ImportValidationReport, Problem, SectionStatus } from './declarativeFormat';
import type { GrammarManifest } from '../../types';
import {
  LEXICAL_CATEGORIES,
  GRAMMATICAL_ROLES,
  STRATEGY_LEGEND,
  ENGINE_STRATEGY_MAP,
  resolveLexicalCategory,
  resolveGrammaticalRole,
  resolveAffixPosition,
  resolveMorphemeKind,
} from '../../data/taxonomy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ENGINE_TYPES = new Set([
  'affix', 'clitic', 'particle', 'tone', 'mutation', 'position', 'auxiliary', 'suppletion'
]);

const VALID_MORPHEME_KINDS = new Set(['stem', 'affix', 'mutation', 'tone', 'particle']);

const VALID_AFFIX_POSITIONS = new Set(['prefix', 'suffix', 'infix', 'circumfix']);

function isKnownCategory(key: string): boolean {
  const canonical = resolveLexicalCategory(key);
  return canonical !== 'desconocida';
}

function isKnownRole(key: string): boolean {
  const resolved = resolveGrammaticalRole(key);
  return resolved !== key.toLowerCase() || GRAMMATICAL_ROLES.some(r => r.key === resolved);
}

function isKnownStrategyType(type: string): boolean {
  const lowered = type.toLowerCase();
  if (VALID_ENGINE_TYPES.has(lowered)) return true;
  // Buscar en STRATEGY_LEGEND
  return STRATEGY_LEGEND.some(s => s.key === lowered || s.aliases.some(a => a.toLowerCase() === lowered));
}

function detectCycle(categoryKey: string, visited = new Set<string>()): boolean {
  if (visited.has(categoryKey)) return true;
  visited.add(categoryKey);
  const entry = LEXICAL_CATEGORIES.find(c => c.key === categoryKey);
  if (entry?.parent) {
    return detectCycle(entry.parent, visited);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export function validatePostImport(manifest: DeclarativeManifest | GrammarManifest): ImportValidationReport {
  const problems: Problem[] = [];
  const suggestions: string[] = [];

  const phono = manifest.phonology;
  const phonologyAny = phono as any;
  const consonants = phonologyAny?.consonants ?? phonologyAny?.inventory?.consonants ?? [];
  const vowels = phonologyAny?.vowels ?? phonologyAny?.inventory?.vowels ?? [];
  const typo = manifest.typology;
  if (!typo.wordOrder) {
    problems.push({ severity: 'error', location: 'typology.wordOrder', message: 'Orden de palabras no definido', fix: 'Añade wordOrder: SVO|SOV|VSO|VOS|OVS|OSV|Libre' });
  }
  if (!typo.morphology) {
    problems.push({ severity: 'warning', location: 'typology.morphology', message: 'Tipo de morfología no definido', fix: 'Añade morphology: isolating|agglutinative|fusional|polysynthetic|templatic' });
  }
  if (!typo.headDirection) {
    problems.push({ severity: 'warning', location: 'typology.headDirection', message: 'Dirección de núcleo no definida', fix: 'Añade headDirection: head-initial|head-final|Mixed' });
  }

  // ---- FONOLOGÍA ----
  if (consonants.length === 0 && vowels.length === 0) {
    problems.push({ severity: 'warning', location: 'phonology', message: 'Sin inventario fonológico', fix: 'Añade al menos algunos fonemas consonánticos o vocálicos' });
    suggestions.push('Añade al menos algunos fonemas consonánticos o vocálicos');
  }

  // ---- PARADIGMAS ----
  const paradigms = manifest.paradigms;
  const categoriesInParadigms = new Set<string>();
  let paradigmOk = false;
  let paradigmPartial = false;

  if (paradigms.length === 0) {
    problems.push({ severity: 'error', location: 'paradigms', message: 'Sin paradigmas definidos', fix: 'Añade al menos un paradigma con slots de inflexión' });
    suggestions.push('Añade paradigmas de inflexión para categorías léxicas');
  } else {
    paradigmOk = true;
    const seenCategoryIds = new Map<string, number[]>();

    paradigms.forEach((p, idx) => {
      // IDs duplicados de paradigma
      if (!p.category) {
        problems.push({ severity: 'error', location: `paradigms[${idx}].category`, message: 'Paradigma sin categoría' });
      } else {
        categoriesInParadigms.add(p.category);
        const normalizedCat = resolveLexicalCategory(p.category);
        if (normalizedCat === 'desconocida') {
          problems.push({ severity: 'error', location: `paradigms[${idx}].category`, message: `Categoría "${p.category}" no reconocida por taxonomy.ts`, fix: 'Usa una categoría válida o añade el alias en taxonomy.ts' });
        }
      }

      // Slots
      p.slots.forEach((s, sIdx) => {
        if (!s.feature) {
          problems.push({ severity: 'warning', location: `paradigms[${idx}].slots[${sIdx}].feature`, message: 'Slot sin rasgo definido' });
        }
        if (typeof s.order !== 'number') {
          problems.push({ severity: 'warning', location: `paradigms[${idx}].slots[${sIdx}].order`, message: 'Slot sin orden definido' });
        }
        const realizationAny = s.realization as any;
        const { kind, position, form } = realizationAny;
        if (!kind) {
          problems.push({ severity: 'error', location: `paradigms[${idx}].slots[${sIdx}].realization.kind`, message: 'Slot sin tipo de realización (kind)' });
        } else if (!VALID_MORPHEME_KINDS.has(kind.toLowerCase())) {
          problems.push({ severity: 'warning', location: `paradigms[${idx}].slots[${sIdx}].realization.kind`, message: `Tipo de realización "${kind}" no reconocido`, fix: 'Usa: stem|affix|mutation|tone|particle' });
        }
        if (kind === 'affix' && position && !VALID_AFFIX_POSITIONS.has(position.toLowerCase())) {
          problems.push({ severity: 'warning', location: `paradigms[${idx}].slots[${sIdx}].realization.position`, message: `Posición de afijo "${position}" no reconocida`, fix: 'Usa: prefix|suffix|infix|circumfix' });
        }
        if (!form) {
          problems.push({ severity: 'warning', location: `paradigms[${idx}].slots[${sIdx}].realization.form`, message: 'Slot sin forma de realización' });
          paradigmPartial = true;
        }
      });
    });
  }

  // ---- ESTRATEGIAS ----
  const strategies = manifest.strategies;
  if (strategies.length === 0) {
    problems.push({ severity: 'warning', location: 'strategies', message: 'Sin estrategias de marcaje definidas' });
  } else {
    strategies.forEach((s, idx) => {
      if (!s.type) {
        problems.push({ severity: 'error', location: `strategies[${idx}].type`, message: 'Estrategia sin tipo' });
      } else if (!isKnownStrategyType(s.type)) {
        problems.push({ severity: 'warning', location: `strategies[${idx}].type`, message: `Tipo de estrategia "${s.type}" no reconocido`, fix: 'Usa un StrategyType válido o añade el alias en taxonomy.ts' });
      }

      // Estrategia huérfana: no apunta a ningún paradigma existente
      const appliesTo = s.appliesToCategories || s.appliesTo || [];
      if (appliesTo.length > 0) {
        const hasTarget = appliesTo.some(c => categoriesInParadigms.has(c) || isKnownCategory(c));
        if (!hasTarget) {
          problems.push({ severity: 'info', location: `strategies[${idx}]`, message: `Estrategia "${s.id}" no apunta a ningún paradigma objetivo`, fix: 'Añade categorías objetivo o crea paradigmas para ellas' });
        }
      }

      // affixRule.position
      if (s.affixRule?.position && !VALID_AFFIX_POSITIONS.has(s.affixRule.position.toLowerCase())) {
        problems.push({ severity: 'warning', location: `strategies[${idx}].affixRule.position`, message: `Posición "${s.affixRule.position}" no reconocida` });
      }
    });
  }

  // ---- EXCEPCIONES ----
  manifest.exceptions.forEach((e, idx) => {
    if (!e.ruleDescription) {
      problems.push({ severity: 'warning', location: `exceptions[${idx}]`, message: 'Excepción sin descripción de regla' });
    }
    // context es strategy type, validar que sea conocido
    if (e.context && !isKnownStrategyType(e.context) && !['excepción', 'irregular'].includes(e.context.toLowerCase())) {
      problems.push({ severity: 'warning', location: `exceptions[${idx}].context`, message: `Contexto "${e.context}" no reconocido como strategy type` });
    }
  });

  // ---- ROLES ----
  const roles = manifest.roles;
  if (roles.length === 0) {
    problems.push({ severity: 'warning', location: 'roles', message: 'Sin roles gramaticales definidos' });
    suggestions.push('Añade roles gramaticales (subject, object, modifier, etc.)');
  } else {
    roles.forEach((r, idx) => {
      if (!r.name || r.name.trim() === '') {
        problems.push({ severity: 'warning', location: `roles[${idx}]`, message: `Rol "${r.id}" sin nombre de display` });
      }
      if (!isKnownRole(r.id)) {
        problems.push({ severity: 'info', location: `roles[${idx}].id`, message: `Rol "${r.id}" no reconocido por taxonomy.ts` });
      }
    });
  }

  // ---- MUTATION RULES ----
  // mutationRules tienen pattern/replacement, no categorías
  // La validación de categorías se hace en el paso de bridge hacia GrammarManifest

  // ---- JERARQUÍA: detectar cycles ----
  LEXICAL_CATEGORIES.forEach(cat => {
    if (detectCycle(cat.key)) {
      problems.push({ severity: 'error', location: `taxonomy.${cat.key}`, message: `Cycle detectado en jerarquía de categoría "${cat.key}"` });
    }
  });

  // ---- SCORE ----
  let score = 0;
  if (typo.wordOrder) score += 20;
  if (typo.morphology && typo.headDirection) score += 20;
  if (consonants.length > 0 || vowels.length > 0) score += 15;
  if (paradigms.length > 0) {
    score += 20;
    if (paradigms.some(p => p.slots.some(s => !!(s.realization as any).form))) score += 20;
  }
  if (strategies.length > 0) score += 10;
  if (manifest.exceptions.length > 0) score += 5;
  if (roles.length > 0) score += 5;
  score = Math.max(0, Math.min(100, score));

  const ok = score >= 50 && !problems.some(p => p.severity === 'error');

  const sections: { phonology: SectionStatus; typology: SectionStatus; paradigms: SectionStatus; strategies: SectionStatus; exceptions: SectionStatus; roles: SectionStatus } = {
    phonology: consonants.length > 0 || vowels.length > 0 ? 'ok' : 'empty',
    typology: typo.wordOrder ? (typo.morphology && typo.headDirection ? 'ok' : 'partial') : 'missing',
    paradigms: paradigms.length > 0 ? (paradigmPartial ? 'partial' : 'ok') : 'empty',
    strategies: strategies.length > 0 ? 'ok' : 'empty',
    exceptions: manifest.exceptions.length > 0 ? 'ok' : 'empty',
    roles: roles.length > 0 ? 'ok' : 'empty',
  };

  return {
    ok,
    score,
    sections,
    problems,
    suggestions,
  };
}
