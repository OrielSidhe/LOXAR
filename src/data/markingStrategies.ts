/**
 * Marking strategy vocabulary — the controlled catalog from the Universal
 * Typological Matrix (marking_strategy_legend). Every time a grammatical
 * category (case, number, tense, negation, comparison, ...) is "marked", its
 * strategy should come from this list so languages stay comparable.
 *
 * This is a SUPERSET of the engine's `StrategyType` (7 values). The 7 engine
 * values are mapped in ENGINE_STRATEGY_MAP so the UI can explain each engine
 * type in plain language, and the extras are preserved as descriptive notes.
 */

export interface MarkingStrategyDef {
  id: string;
  description: string;
  /** User-friendly display name for UI dropdowns/tooltips */
  displayName?: string;
}

export const MARKING_STRATEGY_LEGEND: MarkingStrategyDef[] = [
  { id: 'positional', description: 'El orden de palabras por sí solo codifica la función gramatical, sin marca morfológica dedicada.', displayName: 'Orden de palabras (posición)' },
  { id: 'prefix', description: 'Morfema ligado antepuesto a la raíz.', displayName: 'Prefijo' },
  { id: 'suffix', description: 'Morfema ligado pospuesto a la raíz.', displayName: 'Sufijo' },
  { id: 'infix', description: 'Morfema insertado dentro de la raíz.', displayName: 'Infijo' },
  { id: 'circumfix', description: 'Morfema discontinuo que envuelve la raíz (prefijo + sufijo simultáneos y obligatorios).', displayName: 'Circunfijo' },
  { id: 'transfix_templatic', description: 'Patrón de vocales intercalado en un esqueleto consonántico fijo (raíces trilíteras árabes/hebreas).', displayName: 'Transfix / Raíz y patrón' },
  { id: 'clitic', description: 'Morfema fonológicamente ligado a la palabra vecina pero sintácticamente independiente/móvil.', displayName: 'Clítico' },
  { id: 'particle', description: 'Palabra libre e invariable, separada, sin flexionar.', displayName: 'Partícula' },
  { id: 'auxiliary_periphrastic', description: 'Verbo o palabra funcional separada que porta la categoría (perífrasis).', displayName: 'Auxiliar / Perífrasis' },
  { id: 'tone_change', description: 'Un cambio tonal por sí solo codifica la categoría.', displayName: 'Cambio de tono' },
  { id: 'stress_shift', description: 'Un desplazamiento del acento por sí solo codifica la categoría.', displayName: 'Cambio de acento' },
  { id: 'root_internal_mutation_apophony', description: 'Cambio vocálico o consonántico dentro de la raíz misma, sin afijo (ablaut, mutación celta, umlaut).', displayName: 'Mutación interna / Ablaut' },
  { id: 'reduplication', description: 'Repetición total o parcial de la raíz.', displayName: 'Reduplicación' },
  { id: 'suppletion', description: 'Raíz o palabra completamente distinta e irregular para la forma marcada (no derivable por regla).', displayName: 'Supletividad' },
  { id: 'zero_unmarked', description: 'La forma no marcada / de base ya cumple la función, sin marcador explícito.', displayName: 'Cero / Sin marca' },
];

export const MARKING_STRATEGY_BY_ID: Record<string, MarkingStrategyDef> = Object.fromEntries(
  MARKING_STRATEGY_LEGEND.map((s) => [s.id, s]),
);

/**
 * Plain-language help for the 7 engine `StrategyType` values used in the
 * Grammar tab's "Estrategias" editor. Keyed by the engine's StrategyType.
 */
export const STRATEGY_TYPE_HELP: Record<string, string> = {
  position: 'El orden de palabras o la posición relativa codifica la relación (ej. sujeto-verbo-objeto). Equivale a "posicional".',
  affix: 'Un morfema ligado a la raíz: prefijo (antes), sufijo (después), infijo (dentro) o circunfijo (alrededor).',
  clitic: 'Morfema que se une fonéticamente a otra palabra pero puede moverse sintácticamente (como una partícula móvil).',
  tone: 'Un cambio de tono en la voz por sí solo marca la categoría (como en lenguas tonales: mandarín, yoruba).',
  mutation: 'Cambio dentro de la raíz misma (como vocal o consonante) sin añadir afijos (ablaut, umlaut, mutación celta).',
  particle: 'Palabra libre e invariable, separada, que marca la función (ej. partícula de negación "no").',
  auxiliary: 'Verbo o palabra funcional separada que porta la categoría (perífrasis, ej. "haber + participio" en español).',
};

/**
 * Map a marking_strategy_legend id to the closest engine `StrategyType`, or
 * null if the engine has no direct equivalent (preserve as descriptive note).
 */
export const ENGINE_STRATEGY_MAP: Record<string, string | null> = {
  positional: 'position',
  prefix: 'affix',
  suffix: 'affix',
  infix: 'affix',
  circumfix: 'affix',
  transfix_templatic: 'affix',
  clitic: 'clitic',
  particle: 'particle',
  auxiliary_periphrastic: 'auxiliary',
  tone_change: 'tone',
  stress_shift: 'tone',
  root_internal_mutation_apophony: 'mutation',
  reduplication: 'affix',
  suppletion: 'affix',
  zero_unmarked: null,
};
