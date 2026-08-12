/**
 * taxonomy.ts
 * ----------------------------------------------------------------------------
 * TAXONOMÍA INTERNA DE LOXAR — Diccionario de entidades canónicas.
 *
 * REGLAS DE ORO:
 *   1. Valores canónicos (DB + motor): SIN ACENTOS, sin espacios, snake_case
 *      para términos compuestos. Son las "keys" que se guardan en SQLite y
 *      que el motor consume.
 *   2. Labels de display: español con tildes, formato UI prolijo.
 *   3. Aliases: cualquier variante de acento/caso/espacio que un humano o
 *      la IA pueda devolver, mapeada → canonical key.
 *   4. Jerarquía: categorías léxicas pueden ser subcategorías de otra
 *      (p.ej. pronombre es un tipo de sustantivo). El unificador de
 *      categorías (CategoryManagerModal) edita esta estructura.
 *   5. affects: cada categoría puede declarar a qué paradigmas/estrategias
 *      o roles del motor afecta, para que el traductor y el preview
 *      sepan cómo tratarla sin traducciones ad-hoc.
 * ----------------------------------------------------------------------------
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TaxonomyEntry {
  /** Clave canónica SIN acentos, sin espacios, code-safe */
  key: string;
  /** Label para mostrar en la UI (puede tener tildes) */
  label: string;
  /** Variantes aceptadas: cualquier acento/caso/espacio */
  aliases: string[];
  /** Clave de la categoría padre (jerarquía). `undefined` = raíz */
  parent?: string;
  /** Descripción breve para tooltips/InfoHint */
  description?: string;
  /** Entidades del motor que esta categoría afecta por defecto */
  affects?: {
    /** IDs de paradigmas o patrones de categoría que aplican */
    paradigms?: string[];
    /** Tipos de estrategia de marcaje que aplican */
    strategies?: string[];
    /** Roles gramaticales que esta categoría puede desempeñar */
    roles?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 1 — CATEGORÍA GRAMATICAL LÉXICA
// ═══════════════════════════════════════════════════════════════════════════════
//
// Jerarquía:
//
//   sustantivo  (raíz)
//   ├── nombre           (nombre propio)
//   ├── pronombre        (pronombre)
//   ├── numeral          (numeral)
//   ├── verboide_sn      (verboide como sustantivo: infinitivo nominal)
//   ├── clasificador     (clasificador nominal)
//   └── colectivo        (sustantivo colectivo)
//
//   verbo  (raíz)
//   ├── auxiliar         (verbo auxiliar)
//   ├── copulativo       (ser / estar)
//   ├── verboide_v       (verboide como verbo: infinitivo, gerundio, participio)
//   └── frasema          (verbo frasal)
//
//   adjetivo  (raíz)
//   ├── participio       (participio adjetival)
//   ├── posesivo         (adjetivo posesivo)
//   └── demostrativo     (adjetivo demostrativo)
//
//   adverbio  (raíz)
//   ├── adv_modo         (modo)
//   ├── adv_lugar        (lugar)
//   ├── adv_tiempo       (tiempo)
//   └── adv_cantidad     (cantidad / grado)
//
//   afijo  (raíz)
//   ├── prefijo
//   ├── sufijo
//   ├── infijo
//   ├── circunfijo
//   └── desinencia
//
//   frase_verbal  (raíz)
//   ├── perifrasis       (perífrasis verbal)
//   └── locucion         (locución verbal)

export const LEXICAL_CATEGORIES: TaxonomyEntry[] = [
  // ── Raíces ──────────────────────────────────────────────────────────
  {
    key: 'sustantivo',
    label: 'Sustantivo',
    aliases: ['sustantivo', 'noun', 'nombre', 'sn'],
    description: 'Palabra que designa un ser, objeto, concepto o cualidad concreta o abstracta',
    affects: { roles: ['object'] },
  },
  {
    key: 'verbo',
    label: 'Verbo',
    aliases: ['verbo', 'verb', 'accion', 'v'],
    description: 'Palabra que expresa acción, estado o proceso',
    affects: { roles: ['root', 'auxiliary_verb'], paradigms: ['verbo'], strategies: ['affix', 'position', 'clitic', 'particle', 'auxiliary'] },
  },
  {
    key: 'adjetivo',
    label: 'Adjetivo',
    aliases: ['adjetivo', 'adjective', 'adj', 'adjt'],
    description: 'Palabra que califica o determina a un sustantivo',
    affects: { roles: ['modifier'] },
  },
  {
    key: 'adverbio',
    label: 'Adverbio',
    aliases: ['adverbio', 'adverb', 'adv'],
    description: 'Palabra que modifica al verbo, adjetivo u otro adverbio',
    affects: { roles: ['modifier'] },
  },
  {
    key: 'preposicion',
    label: 'Preposición',
    aliases: ['preposicion', 'preposición', 'preposition', 'prep'],
    affects: { roles: ['particle', 'connector'], strategies: ['position', 'particle'] },
  },
  {
    key: 'conjuncion',
    label: 'Conjunción',
    aliases: ['conjuncion', 'conjunción', 'conjunction', 'conj'],
    affects: { roles: ['connector'], strategies: ['position', 'particle'] },
  },
  {
    key: 'interjeccion',
    label: 'Interjección',
    aliases: ['interjeccion', 'interjección', 'interjection', 'interj'],
    affects: { roles: ['particle'] },
  },
  {
    key: 'articulo',
    label: 'Artículo',
    aliases: ['articulo', 'artículo', 'article', 'art'],
    parent: 'sustantivo',
    affects: { roles: ['modifier'], strategies: ['position', 'clitic'] },
  },
  {
    key: 'determinante',
    label: 'Determinante',
    aliases: ['determinante', 'determiner', 'det'],
    parent: 'sustantivo',
    affects: { roles: ['modifier'], strategies: ['position', 'clitic'] },
  },
  {
    key: 'pronombre',
    label: 'Pronombre',
    aliases: ['pronombre', 'pronoun', 'pro'],
    parent: 'sustantivo',
    description: 'Sustantivo que sustituye o representa a otro',
    affects: { roles: ['subject', 'object'] },
  },
  {
    key: 'afijo',
    label: 'Afijo',
    aliases: ['afijo', 'affix', 'af'],
    description: 'Morfema ligado que se adjunta a una raíz',
    affects: { strategies: ['affix'] },
  },
  {
    key: 'caso',
    label: 'Caso',
    aliases: ['caso', 'case', 'cas'],
    parent: 'sustantivo',
    description: 'Marca de caso gramatical',
    affects: { paradigms: ['sustantivo'], strategies: ['affix', 'position'] },
  },
  {
    key: 'numeral',
    label: 'Numeral',
    aliases: ['numeral', 'numeral_number', 'num', 'numero', 'número'],
    parent: 'sustantivo',
    description: 'Número cardinal, ordinal o distributivo',
    affects: { roles: ['modifier', 'object'] },
  },
  {
    key: 'frase_verbal',
    label: 'Frase verbal',
    aliases: ['frase_verbal', 'frase verbal', 'verbal_phrase', 'VP', 'vp'],
    description: 'Grupo de palabras con núcleo verbal',
    affects: { roles: ['root'] },
  },
  {
    key: 'marcador',
    label: 'Marcador',
    aliases: ['marcador', 'marker'],
    description: 'Marca gramatical no clasificada en otra categoría',
    affects: { roles: ['particle', 'connector'] },
  },
  {
    key: 'particula',
    label: 'Partícula',
    aliases: ['particula', 'partícula', 'particle_word'],
    description: 'Palabra invariable que funciona como conector o marcador',
    affects: { roles: ['particle', 'connector'], strategies: ['particle', 'clitic'] },
  },
  {
    key: 'desconocida',
    label: '(sin categoría)',
    aliases: ['desconocida', 'desconocido', 'unknown', 'n/a', 'sin_clasificar', 'sin clasificar', 'pendiente', '?', '-', 'na', 'n.a', ''],
    description: 'Categoría no determinada o desconocida',
  },
  // ── Subcategorías de sustantivo ──────────────────────────────────────
  {
    key: 'nombre_propio',
    label: 'Nombre',
    aliases: ['nombre_propio', 'nombre propio', 'proper_noun', 'nomb', 'toponimo', 'topónimo'],
    parent: 'sustantivo',
    description: 'Nombre propio de persona, lugar o entidad',
  },
  {
    key: 'verboide_sn',
    label: 'Verboide (sustantivo)',
    aliases: ['verboide_sn', 'verboide como sustantivo', 'infinitivo_nominal', 'gerundio_nominal'],
    parent: 'sustantivo',
    description: 'Forma verbal que funciona como sustantivo (infinitivo, gerundio sustantivado)',
  },
  {
    key: 'clasificador',
    label: 'Clasificador',
    aliases: ['clasificador', 'classifier', 'clasif'],
    parent: 'sustantivo',
    description: 'Palabra que clasifica sustantivos por forma, tipo o contabilidad',
  },
  {
    key: 'colectivo',
    label: 'Colectivo',
    aliases: ['colectivo', 'collective', 'colect'],
    parent: 'sustantivo',
    description: 'Sustantivo que denota un grupo o colección',
  },
  // ── Subcategorías de verbo ───────────────────────────────────────────
  {
    key: 'auxiliar',
    label: 'Auxiliar',
    aliases: ['auxiliar', 'auxiliary_verb', 'aux', 'verbo_aux', 'verbo auxiliar'],
    parent: 'verbo',
    description: 'Verbo que auxilia a otro para formar tiempos, modos o voces',
    affects: { roles: ['auxiliary_verb'], strategies: ['auxiliary'] },
  },
  {
    key: 'copulativo',
    label: 'Copulativo',
    aliases: ['copulativo', 'copula', 'copula_verb', 'ser_estar'],
    parent: 'verbo',
    description: 'Verbo que une sujeto con atributo (ser, estar, parecer)',
  },
  {
    key: 'verboide_v',
    label: 'Verboide (verbo)',
    aliases: ['verboide_v', 'verboide como verbo', 'infinitivo', 'gerundio', 'participio_verbal'],
    parent: 'verbo',
    description: 'Forma no personal del verbo (infinitivo, gerundio, participio)',
  },
  {
    key: 'frasema',
    label: 'Frasema',
    aliases: ['frasema', 'phrasal_verb', 'verbo frasal', 'verbo_frasal'],
    parent: 'frase_verbal',
    description: 'Combinación de verbo + partícula que forma unidad semántica',
  },
  {
    key: 'perifrasis',
    label: 'Perífrasis',
    aliases: ['perifrasis', 'perífrasis', 'periphrasis', 'perifrasis_verbal'],
    parent: 'frase_verbal',
    description: 'Construcción verbal con varios verbos que funciona como una sola unidad',
  },
  {
    key: 'locucion',
    label: 'Locución',
    aliases: ['locucion', 'locución', 'locution', 'locucion_verbal'],
    parent: 'frase_verbal',
    description: 'Grupo verbal fijo con significado no componencial',
  },
  // ── Subcategorías de adjetivo ────────────────────────────────────────
  {
    key: 'participio',
    label: 'Participio',
    aliases: ['participio', 'participle', 'part'],
    parent: 'adjetivo',
    description: 'Forma no personal del verbo que funciona como adjetivo',
  },
  {
    key: 'posesivo',
    label: 'Posesivo',
    aliases: ['posesivo', 'possessive', 'poss'],
    parent: 'adjetivo',
    description: 'Adjetivo que indica posesión o pertenencia',
  },
  {
    key: 'demostrativo',
    label: 'Demostrativo',
    aliases: ['demostrativo', 'demonstrative', 'dem'],
    parent: 'adjetivo',
    description: 'Adjetivo que señala una referencia espacial o temporal',
  },
  // ── Subcategorías de adverbio ────────────────────────────────────────
  {
    key: 'adv_modo',
    label: 'Adverbio de modo',
    aliases: ['adv_modo', 'adverbio de modo', 'manner_adverb'],
    parent: 'adverbio',
    description: 'Indica la manera o forma de la acción',
  },
  {
    key: 'adv_lugar',
    label: 'Adverbio de lugar',
    aliases: ['adv_lugar', 'adverbio de lugar', 'place_adverb', 'locativo'],
    parent: 'adverbio',
    description: 'Indica el lugar donde ocurre la acción',
  },
  {
    key: 'adv_tiempo',
    label: 'Adverbio de tiempo',
    aliases: ['adv_tiempo', 'adverbio de tiempo', 'temporal_adverb', 'tiempo'],
    parent: 'adverbio',
    description: 'Indica cuándo ocurre la acción',
  },
  {
    key: 'adv_cantidad',
    label: 'Adverbio de cantidad',
    aliases: ['adv_cantidad', 'adverbio de cantidad', 'degree_adverb', 'grado', 'cantidad'],
    parent: 'adverbio',
    description: 'Indica intensidad, grado o cantidad',
  },
  // ── Subcategorías de afijo ───────────────────────────────────────────
  {
    key: 'prefijo',
    label: 'Prefijo',
    aliases: ['prefijo', 'prefix', 'pre'],
    parent: 'afijo',
    affects: { strategies: ['affix'] },
  },
  {
    key: 'sufijo',
    label: 'Sufijo',
    aliases: ['sufijo', 'suffix', 'suf'],
    parent: 'afijo',
    affects: { strategies: ['affix'] },
  },
  {
    key: 'infijo',
    label: 'Infijo',
    aliases: ['infijo', 'infix', 'inf'],
    parent: 'afijo',
    affects: { strategies: ['affix'] },
  },
  {
    key: 'circunfijo',
    label: 'Circunfijo',
    aliases: ['circunfijo', 'circumfix', 'circ'],
    parent: 'afijo',
    affects: { strategies: ['affix'] },
  },
  {
    key: 'desinencia',
    label: 'Desinencia',
    aliases: ['desinencia', 'desinence', 'ending', 'desin', 'terminacion', 'terminación'],
    parent: 'afijo',
    description: 'Afijo que marca concordancia verbal o nominal (flexión)',
    affects: { paradigms: ['verbo', 'sustantivo'], strategies: ['affix'] },
  },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 2 — ROL GRAMATICAL (syntactic role / grammatical function)
// ═══════════════════════════════════════════════════════════════════════════════
//
// NOTA: Estas son las "partes de la oración" desde el punto de vista sintáctico
// (qué función cumple una palabra en la estructura de la oración).
// SE DISTINGUEN de la categoría léxica (Dominio 1):
//   - "sustantivo" es una categoría léxica (Dominio 1)
//   - "subject" es un rol sintáctico (Dominio 2) — un sustantivo puede ser sujeto
//   - "object" es otro rol sintáctico — un sustantivo puede ser objeto
//   - "root" es el rol del núcleo verbal en el AST

export const GRAMMATICAL_ROLES: TaxonomyEntry[] = [
  { key: 'root',           label: 'Raíz (núcleo verbal)', aliases: ['root', 'raiz', 'raíz', 'stem', 'main_verb', 'nucleo', 'núcleo', 'head'], affects: { roles: ['root'] } },
  { key: 'subject',        label: 'Sujeto',              aliases: ['subject', 'sujeto', 'subj', 'S'], affects: { roles: ['subject'] } },
  { key: 'object',         label: 'Objeto',              aliases: ['object', 'objeto', 'obj', 'O'], affects: { roles: ['object'] } },
  { key: 'modifier',       label: 'Modificador',         aliases: ['modifier', 'modificador', 'adj', 'attribute', 'attribute_noun', 'mod'], affects: { roles: ['modifier'] } },
  { key: 'particle',       label: 'Partícula',           aliases: ['particle', 'particula', 'partícula', 'particle_word'], affects: { roles: ['particle'] } },
  { key: 'auxiliary_verb', label: 'Verbo auxiliar',      aliases: ['auxiliary_verb', 'auxiliary', 'aux', 'verbo_aux', 'verbo auxiliar', 'auxVerbo'], affects: { roles: ['auxiliary_verb'], strategies: ['auxiliary'] } },
  { key: 'clitic',         label: 'Clítico',             aliases: ['clitic', 'clitico', 'clítido', 'enclitic', 'proclitic'], affects: { roles: ['clitic'], strategies: ['clitic'] } },
  { key: 'connector',      label: 'Conector / Nexo',     aliases: ['connector', 'nexo', 'conector', 'linker', 'conjunction_word', 'conector_logico'], affects: { roles: ['connector'], strategies: ['position', 'particle'] } },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 3 — TIPO DE MORFEMA (morpheme kind)
// ═══════════════════════════════════════════════════════════════════════════════

export const MORPHEME_KINDS: TaxonomyEntry[] = [
  { key: 'stem',      label: 'Raíz',          aliases: ['stem', 'raiz', 'raíz', 'base', 'root'], description: 'Portador del significado léxico principal' },
  { key: 'affix',     label: 'Afijo',          aliases: ['affix', 'afijo'], description: 'Morfema ligado a la raíz' },
  { key: 'mutation',  label: 'Mutación',       aliases: ['mutation', 'mutacion', 'mutación', 'ablaut', 'alternancia'], description: 'Cambio fonético en la raíz (apofonía, lenición, etc.)' },
  { key: 'tone',      label: 'Tono',           aliases: ['tone', 'tono', 'tonal'], description: 'Cambio de tono que marca una categoría' },
  { key: 'particle',  label: 'Partícula',      aliases: ['particle', 'particula', 'partícula'], description: 'Morfema libre que funciona como conector o marcador' },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 4 — POSICIÓN DE AFIJO (affix position)
// ═══════════════════════════════════════════════════════════════════════════════

export const AFFIX_POSITIONS: TaxonomyEntry[] = [
  { key: 'prefix',    label: 'Prefijo',     aliases: ['prefix', 'prefijo', 'pre', 'antes'] },
  { key: 'suffix',    label: 'Sufijo',     aliases: ['suffix', 'sufijo', 'suf', 'despues', 'después', 'sufijacion', 'sufijación'] },
  { key: 'infix',     label: 'Infijo',     aliases: ['infix', 'infijo', 'inf', 'dentro'] },
  { key: 'circumfix', label: 'Circunfijo', aliases: ['circumfix', 'circunfijo', 'circ', 'alrededor'] },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 5 — ESTRATEGIA DE MARCAJE (marking strategy)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Dos namespaces:
//   LEGEND (15) — del YAML Matriz Tipológica Universal, para el UI del unificador
//   ENGINE  (7)  — tipos que el motor de realización morfológica entiende
//   ENGINE_MAP   — puente LEGEND → ENGINE

import { StrategyType, MarkingStrategy } from '../types';

export const STRATEGY_LEGEND: TaxonomyEntry[] = [
  { key: 'positional',               label: 'Orden de palabras (posición)',            aliases: ['positional', 'orden', 'posicion', 'posición'], affects: { strategies: ['position'] } },
  { key: 'prefix',                   label: 'Prefijo',                                aliases: ['prefix', 'prefijo'], affects: { strategies: ['affix'] } },
  { key: 'suffix',                   label: 'Sufijo',                                aliases: ['suffix', 'sufijo'], affects: { strategies: ['affix'] } },
  { key: 'infix',                    label: 'Infijo',                                aliases: ['infix', 'infijo'], affects: { strategies: ['affix'] } },
  { key: 'circumfix',                label: 'Circunfijo',                            aliases: ['circumfix', 'circunfijo'], affects: { strategies: ['affix'] } },
  { key: 'transfix_templatic',       label: 'Transfix / Raíz y patrón',              aliases: ['transfix_templatic', 'transfix', 'templatic', 'templatico', 'plantilla'], affects: { strategies: ['affix'] } },
  { key: 'clitic',                   label: 'Clítico',                               aliases: ['clitic', 'clitico', 'clítido'], affects: { strategies: ['clitic'] } },
  { key: 'particle',                 label: 'Partícula',                             aliases: ['particle', 'particula', 'partícula'], affects: { strategies: ['particle'] } },
  { key: 'auxiliary_periphrastic',   label: 'Auxiliar / Perífrasis',                 aliases: ['auxiliary_periphrastic', 'auxiliar', 'perifrasis', 'perífrasis', 'periphrasis'], affects: { strategies: ['auxiliary'] } },
  { key: 'tone_change',              label: 'Cambio de tono',                        aliases: ['tone_change', 'cambio_de_tono', 'tono'], affects: { strategies: ['tone'] } },
  { key: 'stress_shift',             label: 'Cambio de acento',                      aliases: ['stress_shift', 'cambio_de_acento', 'acento', 'stress'], affects: { strategies: ['tone'] } },
  { key: 'root_internal_mutation_apophony', label: 'Mutación interna / Ablaut',       aliases: ['root_internal_mutation_apophony', 'mutacion_interna', 'mutación interna', 'ablaut', 'apophony', 'alternancia'], affects: { strategies: ['mutation'] } },
  { key: 'reduplication',            label: 'Reduplicación',                         aliases: ['reduplication', 'reduplicacion', 'reduplicación'], affects: { strategies: ['affix'] } },
  { key: 'suppletion',               label: 'Supletividad',                          aliases: ['suppletion', 'supletividad', 'supletivo', 'supletiva'], affects: { strategies: ['affix'] } },
  { key: 'zero_unmarked',            label: 'Cero / Sin marca',                      aliases: ['zero_unmarked', 'cero', 'sin_marca', 'sin marca', 'unmarked', 'zero'], affects: {} },
];

/** Mapeo legend ID → engine StrategyType. */
export const ENGINE_STRATEGY_MAP: Record<string, StrategyType | null> = {
  positional:               'position',
  prefix:                   'affix',
  suffix:                   'affix',
  infix:                    'affix',
  circumfix:                'affix',
  transfix_templatic:       'affix',
  clitic:                   'clitic',
  particle:                 'particle',
  auxiliary_periphrastic:   'auxiliary',
  tone_change:              'tone',
  stress_shift:             'tone',
  root_internal_mutation_apophony: 'mutation',
  reduplication:            'affix',
  suppletion:               'affix',
  zero_unmarked:            null,
};

/** Display labels para los 7 StrategyType del motor */
export const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  position:  'Orden de palabras',
  affix:     'Afijo',
  clitic:    'Clítico',
  tone:      'Tono / Acento',
  mutation:  'Mutación interna',
  particle:  'Partícula',
  auxiliary: 'Verbo auxiliar / Perífrasis',
};


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 6 — TIPO DE NODO SINTÁCTICO
// ═══════════════════════════════════════════════════════════════════════════════

export const NODE_TYPES: TaxonomyEntry[] = [
  { key: 'clause',   label: 'Cláusula / Oración', aliases: ['clause', 'clausula', 'cláusula', 'oracion', 'oración', 'sentence', 'sentencia'] },
  { key: 'phrase',   label: 'Frase / Sintagma',   aliases: ['phrase', 'frase', 'sintagma', 'sintagma_nominal', 'SN', 'SV', 'SP', 'grupo'] },
  { key: 'word',     label: 'Palabra',            aliases: ['word', 'palabra', 'pal'] },
  { key: 'morpheme', label: 'Morfema',            aliases: ['morpheme', 'morfema', 'morf'] },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 7 — TIPO DE CONEXIÓN SINTÁCTICA
// ═══════════════════════════════════════════════════════════════════════════════

export const CONNECTION_TYPES: TaxonomyEntry[] = [
  { key: 'dependency', label: 'Dependencia',  aliases: ['dependency', 'dependencia', 'dep'] },
  { key: 'agreement',  label: 'Concordancia', aliases: ['agreement', 'concordancia', 'concord', 'agr', 'agreement_type'] },
  { key: 'movement',   label: 'Movimiento',   aliases: ['movement', 'movimiento', 'mov', 'topicalization'] },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 8 — RANURA DE ORDEN DE PALABRAS (word-order slot)
// ═══════════════════════════════════════════════════════════════════════════════

export const WORD_ORDER_SLOTS: TaxonomyEntry[] = [
  { key: 'S', label: 'Sujeto',    aliases: ['S', 'sujeto', 'subject', 'subj'], affects: { roles: ['subject'] } },
  { key: 'V', label: 'Predicado', aliases: ['V', 'verbo', 'verb', 'predicado', 'predicate', 'pred'], affects: { roles: ['root'] } },
  { key: 'O', label: 'Objeto',    aliases: ['O', 'objeto', 'object', 'obj'], affects: { roles: ['object'] } },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 9 — MODOS DE GENERACIÓN IA
// ═══════════════════════════════════════════════════════════════════════════════

export const GENERATION_MODES: TaxonomyEntry[] = [
  { key: 'generative',    label: 'Generativo',    aliases: ['generative', 'generativo', 'perfil_generativo'] },
  { key: 'etymological',  label: 'Etimológico',   aliases: ['etymological', 'etimologico', 'etimológico', 'etim'] },
  { key: 'derivational',  label: 'Derivacional',  aliases: ['derivational', 'derivacional', 'deriv', 'der'] },
];


// ═══════════════════════════════════════════════════════════════════════════════
// DOMINIO 10 — VALORES DE TIPOLOGÍA (para dropdowns de GrammarTab / Wizard)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Canonical: SIN ACENTOS (lo que se guarda en el manifiesto GrammarManifest)
// Display:   CON ACENTOS para la UI

export const TIPOLOGY_VALUES = {
  wordOrder: [
    { key: 'SVO',           label: 'SVO' },
    { key: 'SOV',           label: 'SOV' },
    { key: 'VSO',           label: 'VSO' },
    { key: 'VOS',           label: 'VOS' },
    { key: 'OVS',           label: 'OVS' },
    { key: 'OSV',           label: 'OSV' },
    { key: 'Libre',         label: 'Libre (Pragmático)' },
  ],
  alignment: [
    { key: 'Nominativo-Acusativo',    label: 'Nominativo-Acusativo' },
    { key: 'Ergativo-Absolutivo',     label: 'Ergativo-Absolutivo' },
    { key: 'Split-Ergativo',          label: 'Alineamiento Dividido' },
    { key: 'Activo-Estativo',         label: 'Activo-Estativo' },
    { key: 'Tripartito',              label: 'Tripartito' },
    { key: 'MarcacionNucleo',         label: 'Marcación de Núcleo' },
  ],
  morphology: [
    { key: 'Aislante',      label: 'Aislante' },
    { key: 'Aglutinante',   label: 'Aglutinante' },
    { key: 'Fusional',      label: 'Fusional' },
    { key: 'Polisintetico', label: 'Polisintético' },
    { key: 'Templatico',    label: 'Templático' },
  ],
  headDirection: [
    { key: 'Head-Initial', label: 'Núcleo Inicial (Head-Initial)' },
    { key: 'Head-Final',   label: 'Núcleo Final (Head-Final)' },
    { key: 'Mixed',        label: 'Mixto (Mixed)' },
  ],
} as const;


// ═══════════════════════════════════════════════════════════════════════════════
// ÍNDICES / LOOKUP TABLES
// ═══════════════════════════════════════════════════════════════════════════════

/** Mapa unificado alias → canonical key para categorías léxicas */
const lexicalAliasIndex: Record<string, string> = {};
LEXICAL_CATEGORIES.forEach(cat => {
  // La key canónica siempre se mapea a sí misma
  lexicalAliasIndex[cat.key] = cat.key;
  // Todos los aliases mapean a la key
  cat.aliases.forEach(alias => {
    // Normalizamos: minúsculas + sin acentos + sin espacios → underscore
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    lexicalAliasIndex[normalized] = cat.key;
  });
});

/** Mapa unificado alias → canonical key para roles gramaticales */
const roleAliasIndex: Record<string, string> = {};
GRAMMATICAL_ROLES.forEach(role => {
  roleAliasIndex[role.key] = role.key;
  role.aliases.forEach(alias => {
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    roleAliasIndex[normalized] = role.key;
  });
});

/** Mapa unificado alias → canonical key para tipos de morfema */
const morphemeKindAliasIndex: Record<string, string> = {};
MORPHEME_KINDS.forEach(mk => {
  morphemeKindAliasIndex[mk.key] = mk.key;
  mk.aliases.forEach(alias => {
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    morphemeKindAliasIndex[normalized] = mk.key;
  });
});

/** Mapa unificado alias → canonical key para posiciones de afijo */
const affixPosAliasIndex: Record<string, string> = {};
AFFIX_POSITIONS.forEach(ap => {
  affixPosAliasIndex[ap.key] = ap.key;
  ap.aliases.forEach(alias => {
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    affixPosAliasIndex[normalized] = ap.key;
  });
});

/** Mapa unificado alias → canonical key para tipos de nodo */
const nodeTypeAliasIndex: Record<string, string> = {};
NODE_TYPES.forEach(nt => {
  nodeTypeAliasIndex[nt.key] = nt.key;
  nt.aliases.forEach(alias => {
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    nodeTypeAliasIndex[normalized] = nt.key;
  });
});

/** Mapa unificado alias → canonical key para tipos de conexión */
const connTypeAliasIndex: Record<string, string> = {};
CONNECTION_TYPES.forEach(ct => {
  connTypeAliasIndex[ct.key] = ct.key;
  ct.aliases.forEach(alias => {
    const normalized = alias
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    connTypeAliasIndex[normalized] = ct.key;
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Lookup entry by canonical key (o null si no existe) */
function findLexical(key: string): TaxonomyEntry | undefined {
  return LEXICAL_CATEGORIES.find(c => c.key === key) ?? undefined;
}
function findRole(key: string): TaxonomyEntry | undefined {
  return GRAMMATICAL_ROLES.find(c => c.key === key) ?? undefined;
}
function findMorphemeKind(key: string): TaxonomyEntry | undefined {
  return MORPHEME_KINDS.find(c => c.key === key) ?? undefined;
}
function findAffixPosition(key: string): TaxonomyEntry | undefined {
  return AFFIX_POSITIONS.find(c => c.key === key) ?? undefined;
}
function findNodeType(key: string): TaxonomyEntry | undefined {
  return NODE_TYPES.find(c => c.key === key) ?? undefined;
}
function findConnectionType(key: string): TaxonomyEntry | undefined {
  return CONNECTION_TYPES.find(c => c.key === key) ?? undefined;
}


// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA — Resolvers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza cualquier input (alias, label con tildes, case variado, espacios)
 * a la clave canónica de categoría léxica SIN acentos.
 *
 * Flujo:
 *   1. Si input vacío/null → 'desconocida'
 *   2. Normalizar: minúsculas + quitar tildes + espacios → underscore
 *   3. Buscar en índice de aliases
 *   4. Si no match → 'desconocida' (nunca lanza)
 */
export function resolveLexicalCategory(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return 'desconocida';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return lexicalAliasIndex[normalized] ?? 'desconocida';
}

/**
 * Normaliza cualquier input a clave canónica de rol gramatical.
 * Nunca lanza; fallback al mismo input si no hay match.
 */
export function resolveGrammaticalRole(input: string | undefined | null): string {
  if (!input || typeof input !== 'string' || input.trim() === '') return 'root';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return roleAliasIndex[normalized] ?? input.trim().toLowerCase();
}

/**
 * Normaliza cualquier input a clave canónica de tipo de morfema.
 */
export function resolveMorphemeKind(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return 'stem';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return morphemeKindAliasIndex[normalized] ?? input.trim().toLowerCase();
}

/**
 * Normaliza cualquier input a clave canónica de posición de afijo.
 */
export function resolveAffixPosition(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return 'suffix';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return affixPosAliasIndex[normalized] ?? input.trim().toLowerCase();
}

/**
 * Normaliza cualquier input a clave canónica de tipo de nodo sintáctico.
 */
export function resolveNodeType(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return 'word';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return nodeTypeAliasIndex[normalized] ?? input.trim().toLowerCase();
}

/**
 * Normaliza cualquier input a clave canónica de tipo de conexión.
 */
export function resolveConnectionType(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return 'dependency';

  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  return connTypeAliasIndex[normalized] ?? input.trim().toLowerCase();
}


// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA — Display labels
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve el label de display (con tildes) para una clave canónica.
 * Si no encuentra match, retorna la propia key (fallback seguro).
 */
export function displayOf(category: string): string {
  const found = findLexical(category);
  return found?.label ?? category;
}

/**
 * Devuelve el label de display para un rol gramatical.
 */
export function displayOfRole(role: string): string {
  const found = findRole(role);
  return found?.label ?? role;
}

/**
 * Devuelve el label de display para un tipo de morfema.
 */
export function displayOfMorphemeKind(kind: string): string {
  const found = findMorphemeKind(kind);
  return found?.label ?? kind;
}

/**
 * Devuelve el label de display para una posición de afijo.
 */
export function displayOfAffixPosition(pos: string): string {
  const found = findAffixPosition(pos);
  return found?.label ?? pos;
}

/**
 * Devuelve el label para un StrategyType del motor.
 */
export function displayOfStrategyType(type: StrategyType): string {
  return STRATEGY_TYPE_LABELS[type] ?? type;
}


// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA — Jerarquía (para el CategoryManagerModal y filtros)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve la cadena de ancestros de una categoría léxica, desde la raíz
 * hasta sí misma. Ej: getAncestors('pronombre') → ['sustantivo', 'pronombre']
 */
export function getAncestors(key: string): string[] {
  const entry = findLexical(key);
  if (!entry) return [key];
  if (!entry.parent) return [key];
  return [...getAncestors(entry.parent), key];
}

/**
 * Devuelve todos los descendientes (hijos, nietos, etc.) de una categoría.
 */
export function getDescendants(key: string): string[] {
  const children = LEXICAL_CATEGORIES.filter(c => c.parent === key);
  return children.flatMap(c => [c.key, ...getDescendants(c.key)]);
}

/**
 * ¿Es `childKey` subcategoría de `parentKey`?
 */
export function isSubcategory(childKey: string, parentKey: string): boolean {
  if (childKey === parentKey) return true;
  const entry = findLexical(childKey);
  if (!entry?.parent) return false;
  return isSubcategory(entry.parent, parentKey);
}

/**
 * Devuelve todas las categorías léxicas de nivel raíz (sin parent).
 */
export function getRootCategories(): TaxonomyEntry[] {
  return LEXICAL_CATEGORIES.filter(c => !c.parent);
}

/**
 * Devuelve las hijas directas de una categoría.
 */
export function getChildren(parentKey: string): TaxonomyEntry[] {
  return LEXICAL_CATEGORIES.filter(c => c.parent === parentKey);
}


// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA — Opciones para dropdowns (consistencia en UI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Devuelve las categorías en formato `{ value, label }` para usar en
 * `<select>`, `<MultiSelectDropdown>` etc.
 * `includeSubcategories`: si true incluye hijas; si false solo raíces.
 */
export function lexicalCategoryOptions(includeSubcategories = true): { value: string; label: string }[] {
  const cats = includeSubcategories
    ? LEXICAL_CATEGORIES
    : getRootCategories();
  return cats.map(c => ({ value: c.key, label: c.label }));
}

/**
 * Devuelve las opciones de rol gramatical para dropdowns.
 */
export function grammaticalRoleOptions(): { value: string; label: string }[] {
  return GRAMMATICAL_ROLES.map(r => ({ value: r.key, label: r.label }));
}

/**
 * Devuelve las opciones de tipo de afijo para dropdowns.
 */
export function affixPositionOptions(): { value: string; label: string }[] {
  return AFFIX_POSITIONS.map(p => ({ value: p.key, label: p.label }));
}


// ═══════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY SHIMS — reemplazan STANDARD_CATEGORIES / DEFAULT_FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Usar `lexicalCategoryOptions()` en su lugar.
 * Lista de keys canónicos (sin acentos) sincronizada con LEXICAL_CATEGORIES.
 */
export const STANDARD_CATEGORIES_KEYS: string[] = LEXICAL_CATEGORIES.map(c => c.key);

/**
 * @deprecated Usar `LEXICAL_CATEGORIES` directamente.
 * Seed de categorías por defecto para `customFunctions`.
 * Ahora coincide exactamente con STANDARD_CATEGORIES_KEYS (antes DEFAULT_FUNCTIONS
 * tenía 12 items que diferían de STANDARD_CATEGORIES en 5 valores).
 */
export const DEFAULT_CATEGORIES: string[] = LEXICAL_CATEGORIES.map(c => c.key);
