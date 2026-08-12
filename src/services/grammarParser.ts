import { inductFromText } from './grammar/inductFromText';
import type { GrammarManifest } from '../types';

/**
 * Wrapper del nuevo pipeline de gramática.
 *
 * Usa el nuevo inductor (parseLocal → normalizer → validator → LLM booster)
 * en lugar del viejo parseGrammarText de geminiService.ts.
 *
 * Mantiene la misma interfaz pública para no romper la UI.
 */

export const parseGrammar = async (text: string): Promise<GrammarManifest> => {
  // Usar el nuevo pipeline con LLM disponible (si hay settings)
  const result = await inductFromText(text, {
    llmAvailable: true,
  });

  // Convertir DeclarativeManifest a GrammarManifest (formato legacy para UI)
  const legacy = convertToLegacy(result.manifest);

  // Añadir metadatos de importación
  legacy.meta = {
    ...legacy.meta,
    lastUpdated: new Date().toISOString(),
    sourceFormat: 'markdown',
  };

  return legacy;
};

/**
 * Convierte DeclarativeManifest a GrammarManifest (formato legacy).
 * Esto es un puente temporal hasta que la UI adopte DeclarativeManifest.
 */
export function convertToLegacy(manifest: import('../services/grammar/declarativeFormat').DeclarativeManifest): GrammarManifest {
  return {
    meta: {
      author: 'AI Importer',
      version: '1.0',
      sourceFormat: 'markdown',
      lastUpdated: new Date().toISOString(),
    },
    typology: {
      wordOrder: manifest.typology.wordOrder as GrammarManifest['typology']['wordOrder'],
      alignment: manifest.typology.alignment,
      morphology: manifest.typology.morphology as GrammarManifest['typology']['morphology'],
      headDirection: manifest.typology.headDirection as GrammarManifest['typology']['headDirection'],
    },
    roles: manifest.roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
    })),
    strategies: manifest.strategies.map(s => ({
      id: s.id,
      name: s.name,
      type: mapStrategyType(s.type) as any,
      appliesTo: s.appliesToCategories || s.appliesTo || [],
      affixRule: s.affixRule ? {
        position: s.affixRule.position as 'prefix' | 'suffix' | 'infix' | 'circumfix',
        form: s.affixRule.form,
      } : undefined,
      particleRule: s.particleRule ? {
        marker: s.particleRule.marker,
        relativePosition: s.particleRule.relativePosition as 'before' | 'after',
      } : undefined,
      toneRule: s.toneRule ? {
        description: s.toneRule.description,
        pattern: s.toneRule.pattern,
      } : undefined,
      transformationRule: s.transformationRule ? {
        pattern: s.transformationRule.pattern,
        replacement: s.transformationRule.replacement,
      } : undefined,
    })),
    paradigms: manifest.paradigms.map(p => ({
      category: p.category,
      slots: p.slots.map(s => ({
        feature: s.feature,
        order: s.order,
        realization: {
          kind: s.realization.kind as any,
          form: s.realization.form,
          when: s.realization.when,
          position: s.realization.position as any,
        },
      })),
    })),
    mutationRules: manifest.mutationRules.map(r => ({
      id: r.id,
      name: r.name,
      pattern: r.pattern,
      replacement: r.replacement,
      scope: r.scope as 'consonant' | 'vowel' | 'tone',
    })),
    exceptions: manifest.exceptions.map(e => ({
      id: e.id,
      ruleDescription: e.ruleDescription,
      exceptionPattern: e.exceptionPattern,
      context: e.context,
      example: e.example,
      featureKey: '',
      surfaceForm: '',
      createdAt: new Date().toISOString(),
    })),
    notes: [],
  };
}

/**
 * Mapea StrategyType del motor a StrategyType legacy de types.ts
 */
function mapStrategyType(type: string): string {
  const map: Record<string, string> = {
    'affix': 'suffix',
    'clitic': 'clitic',
    'particle': 'particle',
    'tone': 'tone_change',
    'mutation': 'root_internal_mutation_apophony',
    'position': 'positional',
    'auxiliary': 'auxiliary_periphrastic',
    'suppletion': 'suppletion',
  };
  return map[type] || type;
}

export { isAiAvailable } from './geminiService';
