/**
 * strategyBridge.ts — Puente entre DeclarativeStrategy (formato normalizado)
 * y el formato que el motor de realización morfológica consume.
 *
 * El motor (morphology.ts) espera estrategias con estructura específica:
 *   - affixRule: { position, form }
 *   - particleRule: { marker, relativePosition }
 *   - toneRule / mutationRule
 *
 * DeclarativeStrategy ya usa esta estructura, pero el bridge garantiza
 * compatibilidad total y convierte tipos legacy si es necesario.
 *
 * Módulo PURO: sin dependencias de React ni Tauri.
 */

import type { DeclarativeStrategy, DeclarativeManifest } from './declarativeFormat';
import type { MarkingStrategy, GrammarManifest } from '../../types';

// ---------------------------------------------------------------------------
// Tipos internos del bridge
// ---------------------------------------------------------------------------

export interface BridgedStrategy {
  /** ID original */
  id: string;
  /** Nombre display */
  name: string;
  /** StrategyType del motor */
  type: string;
  /** Categorías objetivo */
  appliesToCategories: string[];
  /** Regla de afijo (si aplica) */
  affixRule?: { position: string; form: string };
  /** Regla de partícula (si aplica) */
  particleRule?: { marker: string; relativePosition: string };
  /** Regla de tono (si aplica) */
  toneRule?: { description: string; pattern?: string };
  /** Regla de mutación (si aplica) */
  transformationRule?: { pattern: string; replacement: string };
}

// ---------------------------------------------------------------------------
// Helpers de conversión
// ---------------------------------------------------------------------------

/**
 * Convierte una DeclarativeStrategy a BridgedStrategy.
 * Si la estrategia ya tiene formato motor, la preserva.
 * Si tiene formato legacy, la convierte.
 */
export function bridgeStrategy(strategy: DeclarativeStrategy): BridgedStrategy {
  const out: BridgedStrategy = {
    id: strategy.id,
    name: strategy.name || strategy.id,
    type: strategy.type,
    appliesToCategories: strategy.appliesToCategories || strategy.appliesTo || [],
  };

  // affixRule
  if (strategy.affixRule) {
    out.affixRule = {
      position: strategy.affixRule.position || 'suffix',
      form: strategy.affixRule.form || '',
    };
  }

  // particleRule
  if (strategy.particleRule) {
    out.particleRule = {
      marker: strategy.particleRule.marker || '',
      relativePosition: strategy.particleRule.relativePosition || 'before',
    };
  }

  // toneRule (legacy: toneChange description/pattern)
  if (strategy.toneRule) {
    out.toneRule = {
      description: strategy.toneRule.description || '',
      pattern: strategy.toneRule.pattern || '',
    };
  }

  // transformationRule (legacy: mutation pattern/replacement)
  if (strategy.transformationRule) {
    out.transformationRule = {
      pattern: strategy.transformationRule.pattern || '',
      replacement: strategy.transformationRule.replacement || '',
    };
  }

  return out;
}

/**
 * Convierte un array de DeclarativeStrategy a array de BridgedStrategy.
 */
export function bridgeStrategies(strategies: DeclarativeStrategy[]): BridgedStrategy[] {
  return strategies.map(bridgeStrategy);
}

/**
 * Convierte un DeclarativeManifest completo a un formato intermedio
 * que el motor puede consumir.
 *
 * IMPORTANTE: No convierte a GrammarManifest (viejo formato) porque
 * eso requeriría mapear todos los campos. En su lugar, devuelve
 * un mapa de estrategias bridgeadas que el motor puede usar directamente.
 */
export function bridgeManifest(manifest: DeclarativeManifest): {
  strategies: BridgedStrategy[];
  /** Mapa category → estrategias aplicables */
  strategyIndex: Map<string, BridgedStrategy[]>;
} {
  const bridged = bridgeStrategies(manifest.strategies);
  const strategyIndex = new Map<string, BridgedStrategy[]>();

  bridged.forEach(s => {
    s.appliesToCategories.forEach(cat => {
      const existing = strategyIndex.get(cat) || [];
      existing.push(s);
      strategyIndex.set(cat, existing);
    });
  });

  return { strategies: bridged, strategyIndex };
}

/**
 * Obtiene las estrategias aplicables para una categoría léxica dada.
 */
export function getStrategiesForCategory(
  category: string,
  strategyIndex: Map<string, BridgedStrategy[]>
): BridgedStrategy[] {
  return strategyIndex.get(category) || [];
}

/**
 * Aplica una estrategia de afijo a una forma base.
 * Compatible con el motor de realización morfológica.
 */
export function applyAffixStrategy(
  form: string,
  strategy: BridgedStrategy
): string {
  if (!strategy.affixRule || !strategy.affixRule.form) return form;

  const { position, form: affix } = strategy.affixRule;

  switch (position) {
    case 'prefix':
      return affix + form;
    case 'suffix':
      return form + affix;
    case 'infix': {
      const mid = Math.max(1, Math.floor(form.length / 2));
      return form.slice(0, mid) + affix + form.slice(mid);
    }
    case 'circumfix': {
      const parts = affix.split('^');
      return (parts[0] || '') + form + (parts[1] || '');
    }
    default:
      return form + affix;
  }
}

/**
 * Aplica una estrategia de partícula a una forma base.
 */
export function applyParticleStrategy(
  form: string,
  strategy: BridgedStrategy
): string {
  if (!strategy.particleRule || !strategy.particleRule.marker) return form;

  const { marker, relativePosition } = strategy.particleRule;

  if (relativePosition === 'before') {
    return marker + ' ' + form;
  } else {
    return form + ' ' + marker;
  }
}
