/**
 * textParser.ts — Parser local de gramática textual.
 *
 * Convierte texto libre (prosa de gramática) → DeclarativeManifest SIN LLM.
 * Determinista, sin random, sin side-effects.
 *
 * NOTA: Este parser incluye su propio resolver de entidades (categorías, posiciones,
 * estrategias) para no depender de taxonomy.ts en la primera pasada. En Fase 3,
 * taxonomy.ts se cablea como capa adicional de normalización post-parse.
 *
 * Esto garantiza que Fase 1 sea independiente y testeable sin dependencias externas.
 */

import type {
  DeclarativeManifest,
  DeclarativeParadigm,
  DeclarativeSlot,
  DeclarativeStrategy,
  DeclarativeMutationRule,
  DeclarativeException,
  DeclarativeRole,
  ParseReport,
} from './declarativeFormat';

// ---------------------------------------------------------------------------
// Tipos internos del parser (no exportados)
// ---------------------------------------------------------------------------

interface RawSection {
  header: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Resolver local de entidades (independiente de taxonomy.ts)
// ---------------------------------------------------------------------------
// En Fase 3, taxonomy.ts se cablea como capa adicional post-parse.
// Este resolver es el mínimo viable para que el parser funcione standalone.

const LOCAL_CATEGORY_MAP: Record<string, string> = {
  sustantivo: 'noun', nombre: 'noun', sostantivo: 'noun', nomen: 'noun',
  sust: 'noun', sn: 'noun', nombre_comun: 'noun', nombre_propio: 'noun',
  verbo: 'verb', verba: 'verb', vb: 'verb', verbal: 'verb',
  adjetivo: 'adjective', adj: 'adjective', adjet: 'adjective',
  numeral: 'numeral', num: 'numeral', numero: 'numeral',
  pronombre: 'pronoun', pron: 'pronoun', pronominal: 'pronoun',
  partícula: 'particle', particle: 'particle', part: 'particle',
  preposición: 'preposition', prep: 'preposition', preposicion: 'preposition',
  conjunción: 'conjunction', conj: 'conjunction',
  interjección: 'interjection', interj: 'interjection',
  adverbio: 'adverb', adv: 'adverb',
  artículo: 'article', art: 'article',
  determinante: 'determiner', det: 'determiner',
  auxiliar: 'auxiliary', aux: 'auxiliary',
  partícula_verbal: 'particle',
  clítico: 'clitic', clit: 'clitic',
  demostrativo: 'demonstrative', dem: 'demonstrative',
  posesivo: 'possessive', poss: 'possessive',
  interrogativo: 'interrogative', int: 'interrogative',
  relativo: 'relative', rel: 'relative',
  indefinido: 'indefinite', indef: 'indefinite',
};

const LOCAL_AFFIX_POSITION_MAP: Record<string, 'prefix' | 'suffix' | 'infix' | 'circumfix'> = {
  prefijo: 'prefix', prefix: 'prefix', pref: 'prefix', pre: 'prefix',
  sufijo: 'suffix', suffix: 'suffix', suf: 'suffix', post: 'suffix',
  infijo: 'infix', infix: 'infix', in: 'infix', inter: 'infix',
  circumfijo: 'circumfix', circumfix: 'circumfix', circum: 'circumfix',
  cirdunfijo: 'circumfix',
};

const LOCAL_STRATEGY_TYPE_MAP: Record<string, DeclarativeStrategy['type']> = {
  afijo: 'affix', affix: 'affix',
  prefijación: 'affix', prefijacion: 'affix',
  sufijación: 'affix', sufijacion: 'affix',
  partícula: 'particle', particle: 'particle',
  clítico: 'clitic', clitic: 'clitic',
  tono: 'tone', tone: 'tone', cambio_de_tono: 'tone',
  mutación: 'mutation', mutation: 'mutation', cambio: 'mutation',
  supletiva: 'suppletion', suppletion: 'suppletion',
  posición: 'position', positional: 'position',
  auxiliar: 'auxiliary', auxiliary: 'auxiliary',
  reduplicación: 'affix', reduplication: 'affix',
};

// Features comunes en español → inglés canónico
const LOCAL_FEATURE_MAP: Record<string, string> = {
  pasado: 'past', presente: 'present', futuro: 'future',
  singular: 'singular', plural: 'plural',
  masculino: 'masculine', femenino: 'feminine', neutro: 'neuter',
  primera: 'first', segundo: 'second', tercera: 'third',
  primera_persona: 'first', segunda_persona: 'second', tercera_persona: 'third',
  sg: 'singular', pl: 'plural',
  m: 'masculine', f: 'feminine', n: 'neuter',
  nominativo: 'nominative', acusativo: 'accusative',
  dativo: 'dative', genitivo: 'genitive',
  ablativo: 'ablative', vocativo: 'vocative',
  locativo: 'locative', instrumental: 'instrumental',
  comitativo: 'comitative', ablative: 'ablative',
  ergativo: 'ergative', absolutivo: 'absolutive',
  activo: 'active', pasivo: 'passive',
  indicativo: 'indicative', subjuntivo: 'subjunctive',
  imperativo: 'imperative', condicional: 'conditional',
  perfecto: 'perfect', imperfecto: 'imperfect',
  pluscuamperfecto: 'pluperfect',
};

function resolveFeatureLocal(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return LOCAL_FEATURE_MAP[lower] || lower;
}

const LOCAL_ROLE_MAP: Record<string, string> = {
  sujeto: 'subject', subject: 'subject', subj: 'subject',
  objeto: 'object', object: 'object', obj: 'object', complemento: 'object',
  verbo: 'verb', verb: 'verb', raiz: 'root', root: 'root',
  modificador: 'modifier', modifier: 'modifier', adj: 'modifier', adjetivo: 'modifier',
  partícula: 'particle', particle: 'particle', part: 'particle',
  auxiliar: 'auxiliary_verb', auxiliary: 'auxiliary_verb', aux: 'auxiliary_verb',
  nodo: 'modifier', frase: 'modifier',
};

function resolveCategoryLocal(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return LOCAL_CATEGORY_MAP[lower] || lower;
}

function resolveAffixPositionLocal(raw: string): 'prefix' | 'suffix' | 'infix' | 'circumfix' {
  const lower = raw.toLowerCase().trim();
  return LOCAL_AFFIX_POSITION_MAP[lower] || 'suffix';
}

function resolveStrategyTypeLocal(raw: string): DeclarativeStrategy['type'] {
  const lower = raw.toLowerCase().trim();
  return LOCAL_STRATEGY_TYPE_MAP[lower] || 'affix';
}

function resolveRoleLocal(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return LOCAL_ROLE_MAP[lower] || lower;
}

// ---------------------------------------------------------------------------
// Tipos internos del parser (no exportados)
// ---------------------------------------------------------------------------

interface RawSection {
  header: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Detección de secciones
// ---------------------------------------------------------------------------

const SECTION_PATTERNS: { header: string; aliases: RegExp[] }[] = [
  { header: 'typology', aliases: [/\btipolog/i, /\btypolog/i, /\bword.?order\b/i, /\bvortoordo\b/i, /\bordei?\b/i, /語順/, /\bmorphology\b/i, /\bmorfolog/i, /\bhead.?direction\b/i, /\bcabeza\b/i, /\bdirecci[oó]n\b/i, /\balignment\b/i, /\balineaci[oó]n\b/i, /\bkapdirekto\b/i] },
  { header: 'phonology', aliases: [/\bfonolog/i, /\bphonolog/i, /\bsonid/i, /\binventari/i, /\bfonetica\b/i, /\bfonetiko\b/i, /\bfon[eé]tica\b/i, /\bfonetiko\b/i] },
  { header: 'nouns', aliases: [/\bsustantiv/i, /\bnouns?\b/i, /\bnombre\b/i, /\bnomina\b/i, /\bsubstantivo\b/i, /品詞/, /\bplural\b/i, /\bnumber\b/i, /\bsust/i, /\bsn\b/i] },
  { header: 'verbs', aliases: [/\bverb/i, /\bverba\b/i, /動詞/, /\bpast\b/i, /\bpasado\b/i, /\bpresent\b/i, /\bpresente\b/i, /\bfuture\b/i, /\bfuturo\b/i, /\btense\b/i, /\bconjug/i] },
  { header: 'adjectives', aliases: [/\badjetiv/i, /\badjectives?\b/i, /\badj\b/i, /\badjetivo\b/i, /形容詞/, /\badverb/i, /\badverbio\b/i] },
  { header: 'exceptions', aliases: [/\bexcepcion/i, /\bexceptions?\b/i, /\bsupletiv/i, /\birregular\b/i, /\birregulares?\b/i] },
  { header: 'strategies', aliases: [/\bestrategia/i, /\bstrateg/i, /\bmarcaje/i, /\bmarking\b/i, /\bstrategio\b/i, /助詞/, /marking/i, /\bparticle\b/i, /\bpart[ií]cula\b/i, /\bpart[ií]culas?\b/i] },
  { header: 'roles', aliases: [/\brol\b/i, /\broles?\b/i, /\bsint[áa]xis\b/i, /\bsynta\b/i, /\brols\b/i, /\bgramatical\b/i, /\broles?\b/i] },
];

function detectSections(text: string): RawSection[] {
  const lines = text.split(/\n+/);
  const sections: RawSection[] = [];
  let current: RawSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^§\s*(.+)$/);
    let header: string | null = null;
    let initialContent = '';

    if (sectionMatch) {
      const raw = sectionMatch[1].trim();
      const colon = raw.indexOf(':');
      const dash = raw.indexOf(' — ');
      const sep = colon >= 0 ? (dash >= 0 ? Math.min(colon, dash) : colon) : dash;
      if (sep >= 0) {
        header = raw.substring(0, sep).trim().toLowerCase();
        initialContent = raw.substring(sep + 1).trim();
      } else {
        header = raw.toLowerCase();
        initialContent = '';
      }
    } else {
      const freeMatch = trimmed.match(/^([A-Za-z\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF][A-Za-z0-9\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\s\/\-]*?):\s*(.*)?$/);
      if (freeMatch && freeMatch[1].length < 60 && freeMatch[1].length > 1) {
        const potentialHeader = freeMatch[1].toLowerCase();
        if (classifySection(potentialHeader)) {
          header = potentialHeader;
          initialContent = freeMatch[2] || '';
        }
      }
    }

    if (header) {
      if (current) sections.push(current);
      current = { header, content: initialContent };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + trimmed;
    }
  }

  if (current) sections.push(current);

  return sections;
}

function classifySection(header: string): string | null {
  for (const pattern of SECTION_PATTERNS) {
    for (const alias of pattern.aliases) {
      if (alias.test(header)) {
        return pattern.header;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parsers por sección
// ---------------------------------------------------------------------------

function parseTypography(content: string): {
  typology: DeclarativeManifest['typology'];
  warnings: string[];
} {
  const warnings: string[] = [];
  const typology: DeclarativeManifest['typology'] = {
    wordOrder: 'SVO',
    morphology: 'isolating',
    headDirection: 'head-initial',
    alignment: 'nominative',
  };

  // Word order
  const woMatch = content.match(/\b(SVO|SOV|VSO|VOS|OVS|OSV)\b/i);
  if (woMatch) {
    typology.wordOrder = woMatch[1].toUpperCase() as DeclarativeManifest['typology']['wordOrder'];
  } else {
    warnings.push('No se detectó orden de palabras (SVO/SOV/etc.)');
  }

  // Morphology type
  const morphMatch = content.match(
    /\b(aislante|isolating|aglutinante|agglutinative|fusional|polisint[eé]tico|polysynthetic)\b/i
  );
  if (morphMatch) {
    const raw = morphMatch[1].toLowerCase();
    const mapping: Record<string, DeclarativeManifest['typology']['morphology']> = {
      aislante: 'isolating',
      isolating: 'isolating',
      aglutinante: 'agglutinative',
      agglutinative: 'agglutinative',
      fusional: 'fusional',
      polisintético: 'polysynthetic',
      polysynthetic: 'polysynthetic',
    };
    typology.morphology = mapping[raw] || 'isolating';
  }

  // Head direction
  if (/\bhead.?initial\b/i.test(content)) {
    typology.headDirection = 'head-initial';
  } else if (/\bhead.?final\b/i.test(content)) {
    typology.headDirection = 'head-final';
  }

  // Alignment
  const alignMatch = content.match(
    /\b(nominativo|nominative|ergativo|ergative|absolutivo|absolutive|acusativo|accusative|tripartito|tripartite)\b/i
  );
  if (alignMatch) {
    typology.alignment = alignMatch[1].toLowerCase();
  }

  return { typology, warnings };
}

function parsePhonology(content: string): {
  phonology: DeclarativeManifest['phonology'];
  warnings: string[];
} {
  const warnings: string[] = [];
  const phonology: DeclarativeManifest['phonology'] = {
    consonants: [],
    vowels: [],
    syllableStructures: ['CV'],
  };

  // 1. Formato IPA: /p t k/ o /p,t,k/
  const ipaMatch = content.match(/\/([^\/]+)\//g);
  if (ipaMatch) {
    for (const match of ipaMatch) {
      const inside = match.slice(1, -1).trim();
      const phonemes = inside.split(/[\s,]+/).filter(p => p.length > 0);
      const vowelPattern = /^[aeiouyàáâãäåæəɛɪɨœøɵʊʌɔɒɤʉʏʝɲŋθðʃʒʧʤɨʂʐʀ]+$/i;
      for (const p of phonemes) {
        if (vowelPattern.test(p)) {
          if (!phonology.vowels.includes(p)) phonology.vowels.push(p);
        } else {
          if (!phonology.consonants.includes(p)) phonology.consonants.push(p);
        }
      }
    }
  }

  // 2. Lista explícita sin formato IPA: "Consonantes: b, c, d..." o "Vocales: a, e, i..."
  const consonantListMatch = content.match(/consonantes?:\s*([^\n]+)/i);
  if (consonantListMatch) {
    const raw = consonantListMatch[1];
    // Extraer tokens individuales (letras o digraphs conocidos)
    const tokens = raw.match(/\b(ch|th|ae|oe|[b-df-hj-np-tv-z])\b/gi) || [];
    tokens.forEach(t => {
      const lower = t.toLowerCase();
      if (!phonology.consonants.includes(lower)) phonology.consonants.push(lower);
    });
  }

  const vowelListMatch = content.match(/vocales?:\s*([^\n]+)/i);
  if (vowelListMatch) {
    const raw = vowelListMatch[1];
    const tokens = raw.match(/\b([aeiou])\b/gi) || [];
    tokens.forEach(t => {
      const lower = t.toLowerCase();
      if (!phonology.vowels.includes(lower)) phonology.vowels.push(lower);
    });
  }

  // 3. Syllable structures: CVC, CV, CCV, etc.
  const syllMatch = content.match(/\b(CV|CVC|CCV|CCVC|VC|V)\b/g);
  if (syllMatch) {
    phonology.syllableStructures = [...new Set(syllMatch.map(s => s.toUpperCase()))];
  }

  if (phonology.consonants.length === 0 && phonology.vowels.length === 0) {
    warnings.push('No se detectaron fonemas en formato IPA (/p t k/) ni lista explícita');
  }

  return { phonology, warnings };
}

function resolveCategory(raw: string): string {
  return resolveCategoryLocal(raw);
}

function resolveAffixPosition(raw: string): 'prefix' | 'suffix' | 'infix' | 'circumfix' {
  return resolveAffixPositionLocal(raw);
}

function resolveStrategyType(raw: string): DeclarativeStrategy['type'] {
  return resolveStrategyTypeLocal(raw);
}

// ---------------------------------------------------------------------------
// Parsers de categorías (sustantivos, verbos, adjetivos)
// ---------------------------------------------------------------------------

function parseCategorySection(
  content: string,
  categoryHint: string
): { paradigms: DeclarativeParadigm[]; warnings: string[] } {
  const paradigms: DeclarativeParadigm[] = [];
  const warnings: string[] = [];
  const category = resolveCategory(categoryHint);

  // Patrón 1: "X por -Y sufijo/prefijo/infijo" (admite rasgos multi-palabra)
  const affixPattern = /(.+?)\s+por\s+(-[\w']+)\s+(sufijo|prefijo|infijo|circunfijo)/i;
  const matches = content.matchAll(new RegExp(affixPattern.source, 'gi'));

  for (const match of matches) {
    const featureRaw = match[1].trim();
    if (featureRaw.length < 2 || featureRaw.length > 40) continue;
    const feature = resolveFeatureLocal(featureRaw);
    const form = match[2].trim();
    const position = resolveAffixPosition(match[3]);

    paradigms.push({
      category,
      slots: [
        {
          id: `${category}_${feature}`,
          feature,
          order: paradigms.length,
          realization: { kind: 'affix', form, position },
        },
      ],
    });
  }

  // Patrón 2: "tiempo1 -form1, tiempo2 -form2" (verbos)
  const tensePattern = /(\w+)\s+(-[\w']+)/g;
  const tenseMatches = content.matchAll(tensePattern);

  // Si ya tenemos paradigmas del patrón 1, no duplicar
  if (paradigms.length === 0) {
    let order = 0;
    for (const match of tenseMatches) {
      const feature = resolveFeatureLocal(match[1]);
      const form = match[2].trim();
      if (['por', 'con', 'y', 'o', 'la', 'el', 'los', 'las', 'un', 'una'].includes(feature)) continue;
      if (feature.length < 2) continue;

      paradigms.push({
        category,
        slots: [
          {
            id: `${category}_${feature}`,
            feature,
            order: order++,
            realization: { kind: 'affix', form, position: 'suffix' },
          },
        ],
      });
    }
  }

  // Patrón 3: "-form" standalone o "feature: -form" / "suffix -form"
  if (paradigms.length === 0) {
    const standaloneForms = content.matchAll(/(-[\w']+)/g);
    let order = 0;
    for (const match of standaloneForms) {
      const form = match[1];
      // Buscar feature en el contenido
      const featureCandidates = ['plural', 'past', 'present', 'future', 'singular', 'number', 'tense', 'modo', 'gender', 'case'];
      let feature = 'default';
      for (const candidate of featureCandidates) {
        if (content.toLowerCase().includes(candidate)) {
          feature = resolveFeatureLocal(candidate);
          break;
        }
      }
      if (feature === 'default') feature = resolveFeatureLocal(categoryHint);

      paradigms.push({
        category,
        slots: [
          {
            id: `${category}_${feature}`,
            feature,
            order: order++,
            realization: { kind: 'affix', form, position: 'suffix' },
          },
        ],
      });
    }
  }

  if (paradigms.length === 0 && content.trim().length > 0) {
    warnings.push(`No se extrajeron paradigmas de "${categoryHint}"`);
  }

  return { paradigms, warnings };
}

function parseExceptions(content: string): { exceptions: DeclarativeException[]; warnings: string[] } {
  const exceptions: DeclarativeException[] = [];
  const warnings: string[] = [];

  // Patrón: "X → Y (supletiva)" o "X → Y"
  const suppletivePattern = /(\S+)\s*→\s*(\S+)(?:\s*\(([^)]+)\))?/g;
  const matches = content.matchAll(suppletivePattern);

  for (const match of matches) {
    const base = match[1].trim();
    const replacement = match[2].trim();
    const context = match[3]?.trim() || 'excepción';

    exceptions.push({
      id: `ex_${base}_${replacement}`,
      ruleDescription: `${base} → ${replacement}`,
      exceptionPattern: `${base} → ${replacement}`,
      context,
      example: `${base} → ${replacement}`,
    });
  }

  return { exceptions, warnings };
}

function parseStrategies(content: string): { strategies: DeclarativeStrategy[]; warnings: string[] } {
  const strategies: DeclarativeStrategy[] = [];
  const warnings: string[] = [];
  const addedMarkers = new Set<string>();

  // Patrón A: "Nombre: posición suffix, forma -Y" o "Nombre: posición prefix, forma Y-"
  const affixRulePattern = /(.+?):\s+posici[oó]n\s+(suffix|prefix|infix|circumfix)[,\s]+forma\s+(-[\w\*\[\]]+)/i;
  const affixMatches = content.matchAll(new RegExp(affixRulePattern.source, 'gi'));

  for (const match of affixMatches) {
    const name = match[1].trim();
    const position = resolveAffixPosition(match[2]);
    const form = match[3].trim();
    const type = resolveStrategyType(position === 'prefix' ? 'prefijación' : 'sufijación');
    strategies.push({
      id: `strat_${strategies.length}`,
      name,
      type: type as DeclarativeStrategy['type'],
      affixRule: { position, form },
    });
    addedMarkers.add(form);
  }

  // Patrón B: "Partículas X: marker Y (contexto) before/after Z"
  const particleRulePattern = /part[íi]culas?\s+(.+?):\s+(\S+)\s+\(([^)]+)\)\s+(before|after|before_verb|after_verb)/i;
  const particleMatches = content.matchAll(new RegExp(particleRulePattern.source, 'gi'));

  for (const match of particleMatches) {
    const name = match[1].trim();
    const marker = match[2].trim();
    const context = match[3].trim();
    const relativePosition = (match[4].trim() === 'before_verb' ? 'before' : match[4].trim() === 'after_verb' ? 'after' : match[4].trim()) as 'before' | 'after';
    if (addedMarkers.has(marker)) continue;
    strategies.push({
      id: `strat_${strategies.length}`,
      name: `Partícula ${name}`,
      type: 'particle',
      particleRule: { marker, relativePosition },
      appliesToCategories: [resolveCategory(context)],
    });
    addedMarkers.add(marker);
  }

  // Patrón C: "partícula 'X' para Y" (formato legacy)
  const legacyParticlePattern = /part[íi]cula\s+['"]([^'"]+)['"]\s+(?:para|for|para_el)\s+(\w+)/i;
  const legacyMatches = content.matchAll(new RegExp(legacyParticlePattern.source, 'gi'));

  for (const match of legacyMatches) {
    const marker = match[1].trim();
    if (addedMarkers.has(marker)) continue;
    const context = match[2].trim();
    strategies.push({
      id: `strat_${strategies.length}`,
      name: `Partícula ${marker}`,
      type: 'particle',
      particleRule: { marker, relativePosition: 'before' },
      appliesToCategories: [resolveCategory(context)],
    });
    addedMarkers.add(marker);
  }

  // Patrón D: "X: marker Y (contexto)" → partícula simple
  const simpleParticlePattern = /(\S+)\s*\(([^)]+)\):\s*(\S+)/i;
  const simpleMatches = content.matchAll(new RegExp(simpleParticlePattern.source, 'gi'));

  for (const match of simpleMatches) {
    const marker = match[3].trim();
    if (addedMarkers.has(marker)) continue;
    const context = match[2].trim();
    strategies.push({
      id: `strat_${strategies.length}`,
      name: `Partícula ${marker}`,
      type: 'particle',
      particleRule: { marker, relativePosition: 'before' },
      appliesToCategories: [resolveCategory(context)],
    });
    addedMarkers.add(marker);
  }

  // Patrón E: "X marker Y (contexto)" o "X: Y" genérico para partículas
  const genericParticlePattern = /([\w\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+)\s+(\S+)\s+\(([^)]+)\)/g;
  const genericMatches = content.matchAll(new RegExp(genericParticlePattern.source, 'gi'));

  for (const match of genericMatches) {
    const marker = match[2].trim();
    if (addedMarkers.has(marker)) continue;
    const context = match[3].trim();
    strategies.push({
      id: `strat_${strategies.length}`,
      name: `Partícula ${marker}`,
      type: 'particle',
      particleRule: { marker, relativePosition: 'before' },
      appliesToCategories: [resolveCategory(context)],
    });
    addedMarkers.add(marker);
  }

  if (strategies.length === 0 && content.trim().length > 0) {
    warnings.push('No se extrajeron estrategias de marcaje');
  }

  return { strategies, warnings };
}

function parseRoles(content: string): { roles: DeclarativeRole[]; warnings: string[] } {
  const roles: DeclarativeRole[] = [];
  const warnings: string[] = [];

  // Roles por defecto si no se especifican
  const defaultRoles: DeclarativeRole[] = [
    { id: 'subject', name: 'Sujeto', description: 'Participante que realiza la acción' },
    { id: 'object', name: 'Objeto', description: 'Participante que recibe la acción' },
    { id: 'verb', name: 'Verbo', description: 'Acción o estado' },
    { id: 'modifier', name: 'Modificador', description: 'Adjetivo, adverbio, etc.' },
    { id: 'particle', name: 'Partícula', description: 'Elemento gramatical independiente' },
  ];

  // Si el contenido menciona roles específicos, extraerlos
  const rolePattern = /\b(sujeto|subject|objeto|object|verbo|verb|modifier|modificador|partícula|particle|auxiliar|auxiliary)\b/gi;
  const foundRoles = new Set<string>();
  const roleMatches = content.matchAll(rolePattern);

  for (const match of roleMatches) {
    foundRoles.add(resolveRoleLocal(match[1].toLowerCase()));
  }

  if (foundRoles.size > 0) {
    for (const roleId of foundRoles) {
      const existing = defaultRoles.find(r => r.id === roleId);
      roles.push(existing || { id: roleId, name: roleId });
    }
  }

  if (roles.length === 0) {
    roles.push(...defaultRoles);
  }

  return { roles, warnings: [] };
}

// ---------------------------------------------------------------------------
// parseLocal — función principal
// ---------------------------------------------------------------------------

export function parseLocal(text: string): { manifest: DeclarativeManifest; report: ParseReport } {
  const warnings: string[] = [];
  const sectionsFound: string[] = [];
  const sectionsUnparsed: string[] = [];

  // Manifiesto base
  const manifest: DeclarativeManifest = {
    name: 'Imported',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: [], vowels: [], syllableStructures: ['CV'] },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
  };

  // Si el texto está vacío o es muy corto, devolver manifiesto vacío
  if (!text || text.trim().length < 3) {
    return {
      manifest,
      report: {
        sectionsFound: [],
        sectionsUnparsed: [],
        paradigmsExtracted: 0,
        exceptionsExtracted: 0,
        warnings: ['Texto vacío o muy corto'],
      },
    };
  }

  // Detectar secciones
  const rawSections = detectSections(text);

  for (const section of rawSections) {
    const category = classifySection(section.header);

    if (!category) {
      sectionsUnparsed.push(section.header);
      continue;
    }

    sectionsFound.push(category);

    switch (category) {
      case 'typology': {
        const { typology, warnings: w } = parseTypography(section.content);
        manifest.typology = typology;
        warnings.push(...w);
        break;
      }
      case 'phonology': {
        const { phonology, warnings: w } = parsePhonology(section.content);
        manifest.phonology = phonology;
        warnings.push(...w);
        break;
      }
      case 'nouns': {
        const { paradigms: p, warnings: w } = parseCategorySection(section.content, 'sustantivo');
        manifest.paradigms.push(...p);
        warnings.push(...w);
        break;
      }
      case 'verbs': {
        const { paradigms: p, warnings: w } = parseCategorySection(section.content, 'verbo');
        manifest.paradigms.push(...p);
        warnings.push(...w);
        break;
      }
      case 'adjectives': {
        const { paradigms: p, warnings: w } = parseCategorySection(section.content, 'adjetivo');
        manifest.paradigms.push(...p);
        warnings.push(...w);
        break;
      }
      case 'exceptions': {
        const { exceptions, warnings: w } = parseExceptions(section.content);
        manifest.exceptions.push(...exceptions);
        warnings.push(...w);
        break;
      }
      case 'strategies': {
        const { strategies, warnings: w } = parseStrategies(section.content);
        manifest.strategies.push(...strategies);
        warnings.push(...w);
        break;
      }
      case 'roles': {
        const { roles, warnings: w } = parseRoles(section.content);
        manifest.roles.push(...roles);
        warnings.push(...w);
        break;
      }
      default: {
        sectionsUnparsed.push(section.header);
      }
    }
  }

  // Deduplicar roles
  manifest.roles = manifest.roles.filter(
    (role, index, self) => index === self.findIndex(r => r.id === role.id)
  );

  // Deduplicar paradigmas por category
  const paradigmMap = new Map<string, DeclarativeParadigm>();
  for (const paradigm of manifest.paradigms) {
    if (paradigmMap.has(paradigm.category)) {
      const existing = paradigmMap.get(paradigm.category)!;
      existing.slots.push(...paradigm.slots);
    } else {
      paradigmMap.set(paradigm.category, { ...paradigm, slots: [...paradigm.slots] });
    }
  }
  manifest.paradigms = Array.from(paradigmMap.values());

  // Construir reporte
  const report: ParseReport = {
    sectionsFound,
    sectionsUnparsed,
    paradigmsExtracted: manifest.paradigms.reduce((acc, p) => acc + p.slots.length, 0),
    exceptionsExtracted: manifest.exceptions.length,
    warnings,
  };

  return { manifest, report };
}
