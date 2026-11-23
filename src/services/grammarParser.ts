import { inductFromText } from './grammar/inductFromText';
import type { DeclarativeManifest, StrategyType as DeclarativeStrategyType } from './grammar/declarativeFormat';
import type {
  GrammarManifest,
  MorphosyntacticStrategy,
  SlotRealization,
  StrategyType,
} from '../types';

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
export function convertToLegacy(manifest: DeclarativeManifest): GrammarManifest {
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
    strategies: manifest.strategies.map(s => {
      const strategy: MorphosyntacticStrategy = {
        id: s.id,
        name: s.name,
        type: mapStrategyType(s.type),
        appliesTo: s.appliesToCategories || s.appliesTo || [],
      };

      if (s.affixRule) {
        strategy.affixRule = {
          position: s.affixRule.position as 'prefix' | 'suffix' | 'infix' | 'circumfix',
          form: s.affixRule.form,
        };
      }
      if (s.particleRule) {
        strategy.particleRule = {
          marker: s.particleRule.marker,
          relativePosition: s.particleRule.relativePosition as 'before' | 'after',
        };
      }
      if (s.toneRule) {
        strategy.toneRule = {
          description: s.toneRule.description,
          pattern: s.toneRule.pattern,
        };
      }
      if (s.transformationRule) {
        strategy.transformationRule = {
          pattern: s.transformationRule.pattern,
          replacement: s.transformationRule.replacement,
        };
      }

      return strategy;
    }),
    paradigms: manifest.paradigms.map(p => ({
      category: p.category,
      slots: p.slots.map(s => ({
        feature: s.feature,
        order: s.order,
        realization: toSlotRealization(s.realization),
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
 * Puente entre el `StrategyType` del formato declarativo (que incluye
 * `suppletion` y se expresa en clave de catálogo) y el `StrategyType` del
 * manifiesto canónico de `types.ts`.
 *
 * El motor de realización (`morphology.ts`) solo entiende los tipos del
 * manifiesto canónico; `suppletion` no tiene realización morfológica propia, así
 * que se agrupa en `affix` (la UI lo muestra como una estrategia de marcaje más).
 */
const STRATEGY_TYPE_MAP: Record<DeclarativeStrategyType, StrategyType> = {
  position: 'position',
  affix: 'affix',
  clitic: 'clitic',
  tone: 'tone',
  mutation: 'mutation',
  particle: 'particle',
  auxiliary: 'auxiliary',
  suppletion: 'affix',
};

function mapStrategyType(type: DeclarativeStrategyType): StrategyType {
  return STRATEGY_TYPE_MAP[type] ?? 'affix';
}

/**
 * Convierte la realización declarativa (campos `form`/`position` opcionales,
 * `kind` en un conjunto más amplio) en el `SlotRealization` canónico. El switch
 * narrows `kind` por miembro, así que cada rama construye exactamente la forma
 * que el miembro de la unión exige: `position` solo se adjunta en `affix` y cae
 * a `suffix` cuando el campo viene vacío (el motor lo trata por defecto).
 */
function toSlotRealization(
  realization: DeclarativeManifest['paradigms'][number]['slots'][number]['realization'],
): SlotRealization {
  switch (realization.kind) {
    case 'affix':
      return {
        kind: 'affix',
        position: realization.position ?? 'suffix',
        form: realization.form,
      };
    case 'mutation':
      return { kind: 'mutation', ruleId: realization.form };
    case 'tone':
      return { kind: 'tone', ruleId: realization.form };
    case 'stem':
      return { kind: 'stem', replace: realization.form };
    case 'particle':
      return { kind: 'particle', form: realization.form };
  }
}

export { isAiAvailable } from './geminiService';
