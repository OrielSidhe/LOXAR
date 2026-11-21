import type {
  GrammarAffix,
  GrammarManifest,
  GrammarPreviewConfig,
  LexiconEntry,
  MorphosyntacticStrategy,
  SyntacticRole,
} from '../types';
import type { FlexibleGrammar } from '../types/grammar-flexible';
import type { ClauseAST, ClauseFeatures, ClauseParticipant } from '../services/grammar/engineTypes';
import type { SyntaxCanvas } from '../types';
import { buildClauseAST, realizeClause, validatePhonology } from '../services/grammar';
import { getDefaultPreviewEntries, isMeaningfulTypology, normalizeCategory } from './grammarPreview';

/** Módulos navegables del tab de gramática. */
export type GrammarModule =
  | 'overview'
  | 'phonology'
  | 'typology'
  | 'morphology'
  | 'syntax'
  | 'semantics'
  | 'roles'
  | 'strategies'
  | 'pragmatic'
  | 'notes';

/** Sub-pestañas del módulo de sintaxis. */
export type SyntaxSubTab = 'canvas' | 'ast' | 'preview';

/** Módulo inicial del tab de gramática. */
export const DEFAULT_GRAMMAR_MODULE: GrammarModule = 'syntax';

/** Sub-pestaña inicial del módulo de sintaxis (canvas se siembra desde el motor). */
export const DEFAULT_SYNTAX_SUB_TAB: SyntaxSubTab = 'canvas';

/** Módulos navegables del tab de gramática (fuente única para validar ids del canvas). */
export const GRAMMAR_MODULES: readonly GrammarModule[] = [
  'overview',
  'phonology',
  'typology',
  'morphology',
  'syntax',
  'semantics',
  'roles',
  'strategies',
  'pragmatic',
  'notes',
];

/** Type guard de frontera para los ids de módulo que emite el canvas del dashboard. */
export function isGrammarModule(value: string): value is GrammarModule {
  return GRAMMAR_MODULES.some(module => module === value);
}

export interface ProgressMetric {
  category: string;
  completed: number;
  total: number;
  items: string[];
}

export interface GrammarProgress {
  metrics: ProgressMetric[];
  overallProgress: number;
}

export interface GrammarPreview {
  sentence: string;
  canvas: SyntaxCanvas;
  gloss: string;
  entries: ReturnType<typeof getDefaultPreviewEntries>;
  violations: string[];
}

/**
 * Detección de primer arranque: manifiesto vacío (sin paradigmas, sin fonología
 * y tipología por defecto) => el asistente se abre una única vez por sesión.
 */
export const isFirstRunManifest = (manifest: GrammarManifest): boolean =>
  (manifest.paradigms ?? []).length === 0 &&
  !manifest.phonology &&
  !isMeaningfulTypology(manifest.typology);

/** Progreso global del manifiesto por categorías (fonología, tipología, roles, estrategias). */
export const calculateGrammarProgress = (manifest: GrammarManifest): GrammarProgress => {
  const metrics: ProgressMetric[] = [
    {
      category: 'Fonología',
      completed: manifest.phonology ? 1 : 0,
      total: 1,
      items: ['Inventario definido'],
    },
    {
      category: 'Tipología',
      completed: Object.values(manifest.typology).filter(v => v && v !== '').length,
      total: 4,
      items: ['Orden de palabras', 'Alineamiento', 'Morfología', 'Dirección del núcleo'],
    },
    {
      category: 'Roles Sintácticos',
      completed: manifest.roles.length,
      total: Math.max(5, manifest.roles.length + 2),
      items: manifest.roles.map(r => r.name),
    },
    {
      category: 'Estrategias',
      completed: manifest.strategies.length,
      total: Math.max(3, manifest.strategies.length + 2),
      items: manifest.strategies.map(s => s.name),
    },
  ];

  const totalCompleted = metrics.reduce((sum, m) => sum + m.completed, 0);
  const totalItems = metrics.reduce((sum, m) => sum + m.total, 0);
  const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return { metrics, overallProgress };
};

export const createSyntacticRole = (): SyntacticRole => ({
  id: `role_${Date.now()}`,
  name: 'Nuevo Rol',
});

export const createStrategy = (): MorphosyntacticStrategy => ({
  id: `strat_${Date.now()}`,
  name: 'Nueva Estrategia',
  type: 'position',
  appliesTo: [],
});

export const createAffix = (): GrammarAffix => ({
  id: `affix_${Date.now()}`,
  form: '-',
  type: 'suffix',
  meaning: 'Nuevo afijo',
  appliesTo: [],
  source: 'manual',
  enabled: true,
});

const AFFIX_CATEGORY_TERMS = ['afijo', 'prefijo', 'sufijo', 'infijo'] as const;

/**
 * Deriva afijos del léxico activo (entradas categorizadas como afijo/prefijo/
 * sufijo/infijo). Se añaden al inventario solo cuando el preview lo habilita.
 */
export const buildLexiconAffixes = (
  lexicon: LexiconEntry[],
  useLexiconAffixes: boolean
): GrammarAffix[] =>
  lexicon
    .filter(entry => AFFIX_CATEGORY_TERMS.some(term => normalizeCategory(entry.Categoría).includes(term)))
    .map(entry => {
      const category = normalizeCategory(entry.Categoría);
      const type: GrammarAffix['type'] = category.includes('prefijo')
        ? 'prefix'
        : category.includes('infijo')
          ? 'infix'
          : 'suffix';
      return {
        id: `lexicon_${entry.ID}`,
        form: entry.Léxema?.[0] || entry.Raíz,
        type,
        meaning: entry.Significado?.[0] || entry.Categoría || '',
        appliesTo: [],
        source: 'lexicon' as const,
        enabled: useLexiconAffixes,
      };
    })
    .filter(affix => affix.form);

/** Inventario efectivo: manual + afijos del léxico (si el preview los habilita). */
export const withLexiconAffixes = (
  manifest: GrammarManifest,
  lexiconAffixes: GrammarAffix[]
): GrammarManifest => ({
  ...manifest,
  affixInventory: [...(manifest.affixInventory || []), ...lexiconAffixes],
});

/** Participantes planos de la cláusula de preview (S/V/O desde el léxico). */
export const buildClauseParticipants = (
  entries: ReturnType<typeof getDefaultPreviewEntries>
): ClauseParticipant[] =>
  [
    { role: 'subject', lexeme: entries.subject, features: {} },
    { role: 'verb', lexeme: entries.verb, features: {} },
    { role: 'object', lexeme: entries.object, features: {} },
  ].filter((p): p is ClauseParticipant => Boolean(p.lexeme));

/**
 * Realiza la cláusula de preview con el motor real (AST + morfología) y
 * valida la fonología de la oración resultante. Si el motor falla, cae al
 * formato plano legacy para no romper el tab.
 */
export const buildClausePreview = (
  lexicon: LexiconEntry[],
  manifest: GrammarManifest
): GrammarPreview => {
  const entries = getDefaultPreviewEntries(lexicon, manifest.preview);
  const participants = buildClauseParticipants(entries);

  let ast: ClauseAST | ClauseFeatures;
  try {
    ast = buildClauseAST(participants) as ClauseAST;
  } catch {
    ast = { participants };
  }

  const result = realizeClause(ast, manifest);
  const violations = validatePhonology(result.sentence.replace(/ /g, ''), manifest.phonology);

  return {
    ...result,
    gloss: (manifest.typology.wordOrder || 'SVO').toUpperCase(),
    entries,
    violations,
  };
};

/**
 * Fusiona una gramática flexible importada (texto/markdown) sobre el manifiesto
 * en edición: prioriza lo estructurado, conserva meta del editor y registra la
 * procedencia en `meta.sourceFormat`.
 */
export const mergeFlexibleGrammar = (
  edited: GrammarManifest,
  grammar: FlexibleGrammar
): GrammarManifest => {
  const importedManifest: GrammarManifest = grammar.structured?.manifest || {
    ...edited,
    notes: grammar.rawText ? [grammar.rawText] : edited.notes,
  };

  return {
    ...edited,
    ...importedManifest,
    meta: {
      ...edited.meta,
      ...importedManifest.meta,
      sourceFormat: 'markdown',
      lastUpdated: new Date().toISOString(),
    },
    typology: {
      ...edited.typology,
      ...(importedManifest.typology || {}),
    },
    phonology: importedManifest.phonology || edited.phonology,
    affixInventory: importedManifest.affixInventory || edited.affixInventory,
    strategies: importedManifest.strategies || edited.strategies,
    roles: importedManifest.roles || edited.roles,
    typologicalProfile: importedManifest.typologicalProfile || edited.typologicalProfile,
    notes: importedManifest.notes?.length
      ? importedManifest.notes
      : grammar.rawText
        ? [grammar.rawText]
        : edited.notes,
  };
};

/** Configuración de preview con default explícito (`useLexiconAffixes: false`). */
export const mergePreviewConfig = (
  current: GrammarPreviewConfig | undefined,
  updates: Partial<GrammarPreviewConfig>
): GrammarPreviewConfig => ({
  useLexiconAffixes: false,
  ...(current || {}),
  ...updates,
});

/** Sello de guardado: actualiza `meta.lastUpdated` sin mutar el manifiesto original. */
export const withLastUpdated = (manifest: GrammarManifest): GrammarManifest => ({
  ...manifest,
  meta: {
    ...manifest.meta,
    lastUpdated: new Date().toISOString(),
  },
});
