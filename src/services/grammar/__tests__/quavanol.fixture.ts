/**
 * Quavanol Grammar Fixture
 *
 * Structured representation of the Quavanol conlang grammar extracted from
 * "QUAVANOL - clave.txt". This fixture is used for:
 * - Manual grammar entry in LOXAR's Grammar Manager
 * - Automated tests against the LOXAR grammar engine
 * - Reference data for AI-assisted grammar import validation
 *
 * All data is derived from the source document; no inventions.
 */

// ─── PHONOLOGY ─────────────────────────────────────────────────────────────

export const QUAVANOL_PHONOLOGY = {
  consonants: [
    // Tenrael base consonants (uppercase = Tenrael glyphs)
    'b','c','d','f','g','h','k','l','m','n','p','q','r','s','t','v','w','x','y','z',
    // Digraphs / clusters treated as single phonemes in this conlang
    'ch','th','ae','oe',
  ],
  vowels: ['a','e','i','o','u'],
  special: {
    // C = K (same glyph and sound /k/)
    // B = V (same glyph, bilabial/labiodental)
    // V has both values: /v/ and /b/
    // Q = "kw" / "kwu"
    // X initial = /sk/, medial/final = /ks/
    // X never = /ʃ/
    // S never = /ʃ/, always separate s+sh = s+jar
    // D never = /ð/ ("the")
    // G never = /x/ ("jente")
    // H never silent, combines with t for /θ/
  },
  diphthongs: ['ae','oe'],
} as const;

// ─── WRITING SYSTEM: TENRAEL ────────────────────────────────────────────────

export const TENRAEL_MAPPING = {
  // Consonants activated with SHIFT
  shiftConsonants: ['A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','Q','R','S','T','U','W','Z'],
  // Equivalences
  equivalence: { C: 'K', B: 'V' },
  // Ligatures / digliphos
  ligatures: {
    'Qila': '/kwila/',
    'Ila': '/ila/',
    'Lae': '/lae/',
    'Mae': '/mae/',
    'Qae': '/kwae/',
    'NKw': '/nkwe/',
    'Qa': '/kwa/',
    'TH': '/θ/',
    'ae': '/ae/',
    'ai': '/ai/',
    'ei': '/ei/',
    'Bl': '/bl/',
    'Gl': '/gl/',
    'GR': '/gr/',
    'ND': '/nd/',
    'NT': '/nt/',
    'Nv': '/nv/',
    'RT': '/rt/',
    'RD': '/rd/',
    'Rv': '/rv/',
  },
  // Reading order: left-to-right; for consonants with vowels:
  // 1. Sirto Superior (Cielo)
  // 2. Tenra (Tierra/Base)
  // 3. Sirto Inferior (Profundidad)
} as const;

// ─── EUPHONY / MORPHOLOGICAL UNION ─────────────────────────────────────────

export const EUPHONY_RULES = {
  // Root-final consonant + suffix-initial consonant:
  // 1) Direct union if fluid (l, n, r, m)
  // 2) Linking vowel insertion if cluster is complex/cacophonic
  // 3) Root-final vowel elision if junction is sonorous and simple
  linkingVowels: ['a','e','[v]'], // [v] = harmonic (copy last root vowel)
  elision: {
    // vowel elision examples:
    // more + -[a]la → morla
    // alor + -[a]re → alore
    // ovel + -[v]lyo → ovelyo
  },
  contractions: {
    // When a word ends with the same vowel the next word starts with,
    // they can join with apostrophe (') if no ambiguity:
    // "Agel alaras sœn veli" → "Agel alaras'œn veli"
  },
} as const;

// ─── GENDERS ───────────────────────────────────────────────────────────────

export const QUAVANOL_GENDERS = [
  { id: 'primordial',      name: 'Primordial',      suffixSingular: '-[a]ulen', example: 'Grianaulen (el sol primordial)' },
  { id: 'divine',          name: 'Divino',          suffixSingular: '-[o]rlæ',  example: 'Hiforlæla (Dativo: Para Hifor divino)' },
  { id: 'magic',           name: 'Mágico',          suffixSingular: '-[v]rwo',  example: 'colthorwova (Sin: mágica armadura)' },
  { id: 'immortal',        name: 'Inmortal',        suffixSingular: '-[v]vla',  example: 'faravlada (Alativo: hacia la inmortal noche)' },
  { id: 'real_noble',      name: 'Real/Noble',      prefix: 'ilu- / ilw-',     example: 'Ilufinde (la noble canción)' },
  { id: 'mortal',          name: 'Mortal',          suffixSingular: '-[v]smor/srom', example: 'Norgesmorla / Norgesromla (Dativo: el enano mortal)' },
  { id: 'animal',          name: 'Animal',          suffixSingular: '-[a]dno',  example: 'eseledni ( Nominativo: los fuegos animales/salvajes)' },
  { id: 'titanic',         name: 'Titánico',        suffixSingular: '-[a]nca/-[a]tca', example: 'gauriancanun/gauriatcanun (Instrumental: con las titánicas fuerzas)' },
  { id: 'malignant',       name: 'Maligno',         suffixSingular: '-[A]snor/-[A]sron', example: 'sarasnor/sarasron (la maligna isla)' },
] as const;

// ─── CASES ─────────────────────────────────────────────────────────────────

export interface CaseDefinition {
  id: string;
  name: string;
  /** Suffix template: [a] means conditional linking vowel */
  suffixTemplateSingular: string;
  suffixTemplatePlural: string;
  /** Actual suffices computed for a root ending in vowel (V) or consonant (C) */
  exampleSingular?: string;
  examplePlural?: string;
  exampleMeaning?: string;
  /** For cases where prefix is used instead of suffix */
  prefixTemplate?: string;
}

export const QUAVANOL_CASES: CaseDefinition[] = [
  // A. CASOS PRINCIPALES
  {
    id: 'nominative',
    name: 'Nominativo',
    suffixTemplateSingular: '(sin sufijo)',
    suffixTemplatePlural: '(cambio de vocal final: a→u, o→i, e→ye; si consonante: -u)',
    exampleSingular: 'vadria',
    examplePlural: 'vadriu',
    exampleMeaning: 'victoria / victorias',
  },
  {
    id: 'vocative',
    name: 'Vocativo',
    prefixTemplate: 'Hal[a]- (sg) / Haul[a]- (pl)',
    suffixTemplateSingular: '',
    suffixTemplatePlural: '',
    exampleSingular: 'Halalmoriel',
    examplePlural: 'Haulalvari',
    exampleMeaning: '¡Oh gran rey del bosque! / ¡Oh grandes guardianes!',
  },
  {
    id: 'accusative',
    name: 'Acusativo',
    suffixTemplateSingular: '-[a]r',
    suffixTemplatePlural: '-[a]ur',
    exampleSingular: 'Harar',
    examplePlural: 'Harur',
    exampleMeaning: 'al rey / a los reyes',
  },
  {
    id: 'genitive',
    name: 'Genitivo',
    suffixTemplateSingular: '-[a]de',
    suffixTemplatePlural: '-[a]dwe',
    exampleSingular: 'lafade',
    examplePlural: 'lafadwe',
    exampleMeaning: 'de la hoja / de las hojas',
  },
  {
    id: 'dative',
    name: 'Dativo',
    suffixTemplateSingular: '-[a]la',
    suffixTemplatePlural: '-[a]lu',
    exampleSingular: 'ivela',
    examplePlural: 'ivelu',
    exampleMeaning: 'para el ave / para las aves',
  },
  // B. CASOS DE RELACIÓN Y ASOCIACIÓN
  {
    id: 'instrumental',
    name: 'Instrumental',
    suffixTemplateSingular: '-[a]nen',
    suffixTemplatePlural: '-[a]nun',
    exampleSingular: 'ævinen',
    examplePlural: 'ævinun',
    exampleMeaning: 'con el amigo / con los amigos',
  },
  {
    id: 'comitative',
    name: 'Comitativo',
    suffixTemplateSingular: '-[a]lve',
    suffixTemplatePlural: '-[a]lwe',
    exampleSingular: 'ivelve',
    examplePlural: 'ivelwe',
    exampleMeaning: 'en compañía del ave / en compañía de las aves',
  },
  {
    id: 'abessive',
    name: 'Abesivo',
    suffixTemplateSingular: '-[a]va',
    suffixTemplatePlural: '-uva',
    exampleSingular: 'warva',
    examplePlural: 'waruva',
    exampleMeaning: 'sin cabello / sin cabellos',
  },
  {
    id: 'dedative',
    name: 'Dedativo',
    suffixTemplateSingular: '-[a]thral',
    suffixTemplatePlural: '-[a]thrul',
    exampleSingular: 'lafathral',
    examplePlural: 'lafathrul',
    exampleMeaning: 'acerca de la hoja / acerca de las hojas',
  },
  {
    id: 'exaltive',
    name: 'Exaltivo',
    suffixTemplateSingular: '-[a]lme',
    suffixTemplatePlural: '-[a]lmwe',
    exampleSingular: 'avalolme',
    examplePlural: 'avalolmwe',
    exampleMeaning: 'más que la manzana / más que las manzanas',
  },
  {
    id: 'decresive',
    name: 'Decresivo',
    suffixTemplateSingular: '-[a]sme',
    suffixTemplatePlural: '-[a]smwe',
    exampleSingular: 'ædolosme',
    examplePlural: 'ædolosmwe',
    exampleMeaning: 'menos que el llanto / menos que los llantos',
  },
  {
    id: 'concessive',
    name: 'Concesivo',
    suffixTemplateSingular: '-[a]lma',
    suffixTemplatePlural: '-[a]lmi',
    exampleSingular: 'ventalma',
    examplePlural: 'ventalmi',
    exampleMeaning: 'a pesar del viento / a pesar de los vientos',
  },
  {
    id: 'equative',
    name: 'Ecualivo',
    suffixTemplateSingular: '-[e]vi',
    suffixTemplatePlural: '-[e]vu',
    exampleSingular: 'lafevi',
    examplePlural: 'lafevu',
    exampleMeaning: 'como/cual/al igual que la hoja',
  },
  {
    id: 'similative',
    name: 'Similativo',
    suffixTemplateSingular: '-[a]tava',
    suffixTemplatePlural: '-[a]tavi',
    exampleSingular: 'aeltava',
    examplePlural: 'aeltavi',
    exampleMeaning: 'como el agua / como las aguas',
  },
  {
    id: 'conformative',
    name: 'Conformátivo',
    suffixTemplateSingular: '-[v]mvre',
    suffixTemplatePlural: '-[v]mvri',
    exampleSingular: 'lafamvre',
    examplePlural: 'lafamvri',
    exampleMeaning: 'según la hoja / según las hojas',
  },
  {
    id: 'essive',
    name: 'Esivo',
    suffixTemplateSingular: '-[ia]nd',
    suffixTemplatePlural: '-[wa]nd',
    exampleSingular: 'lemethiand',
    examplePlural: 'lemethwand',
    exampleMeaning: 'en calidad de frontera / en calidad de fronteras',
  },
  // C. CASOS LOCATIVOS, ESPACIALES Y DIRECCIONALES
  {
    id: 'adlative',
    name: 'Adlativo (encima de)',
    suffixTemplateSingular: '-[o]si',
    suffixTemplatePlural: '-[u]s',
    exampleSingular: 'tandenosi',
    examplePlural: 'tandenus',
    exampleMeaning: 'encima del orden / encima de los ordenes',
  },
  {
    id: 'adlative2',
    name: 'Adlativo 2 (sobre de)',
    suffixTemplateSingular: '-[a]si',
    suffixTemplatePlural: '-[a]sir',
    exampleSingular: 'daracsi',
    examplePlural: 'daracsir',
    exampleMeaning: 'sobre la piedra / sobre las piedras',
  },
  {
    id: 'allative',
    name: 'Alativo',
    suffixTemplateSingular: '-[a]da',
    suffixTemplatePlural: '-[a]du',
    exampleSingular: 'hairvada',
    examplePlural: 'odeldu',
    exampleMeaning: 'hacia la felicidad / hacia los guerreros',
  },
  {
    id: 'antelative',
    name: 'Antelativo',
    suffixTemplateSingular: '-[v]lte',
    suffixTemplatePlural: '-[v]lti',
    exampleSingular: 'lafalte',
    examplePlural: 'lafalti',
    exampleMeaning: 'delante de la hoja / delante de las hojas',
  },
  {
    id: 'lative',
    name: 'Lativo',
    suffixTemplateSingular: '-[v]sni',
    suffixTemplatePlural: '-[v]snu',
    exampleSingular: 'lafasni',
    examplePlural: 'lafasnu',
    exampleMeaning: 'cerca de la hoja / cerca de las hojas',
  },
  {
    id: 'lative2',
    name: 'Lativo 2 (junto a)',
    suffixTemplateSingular: '-[a]nt',
    suffixTemplatePlural: '-[i]nt',
    exampleSingular: 'fægant',
    examplePlural: 'fægint',
    exampleMeaning: 'junto al hongo / junto a los hongos',
  },
  {
    id: 'exessive',
    name: 'Exesivo',
    suffixTemplateSingular: '-[v]eda',
    suffixTemplatePlural: '-[v]edu',
    exampleSingular: 'lafæda',
    examplePlural: 'lafædu',
    exampleMeaning: 'fuera de la hoja / fuera de las hojas',
  },
  {
    id: 'intrative',
    name: 'Intrativo',
    suffixTemplateSingular: '-[i]nte',
    suffixTemplatePlural: '-[i]nti',
    exampleSingular: 'lafinte',
    examplePlural: 'lafinti',
    exampleMeaning: 'dentro de la hoja / dentro de las hojas',
  },
  {
    id: 'interessive',
    name: 'Intersivo',
    suffixTemplateSingular: '-[e]lti',
    suffixTemplatePlural: '-[e]ltu',
    exampleSingular: 'lafelti',
    examplePlural: 'lafeltu',
    exampleMeaning: 'entre las hojas / entre las hojas',
  },
  {
    id: 'locative',
    name: 'Locativo',
    suffixTemplateSingular: '-[a]re',
    suffixTemplatePlural: '-[a]ru',
    exampleSingular: 'ware',
    examplePlural: 'Emethenru',
    exampleMeaning: 'en el cabello / en los santuarios',
  },
  {
    id: 'perlative',
    name: 'Perlativo',
    suffixTemplateSingular: '-[e]vor',
    suffixTemplatePlural: '-[e]vur',
    exampleSingular: 'lafevor',
    examplePlural: 'lafevur',
    exampleMeaning: 'alrededor de la hoja / alrededor de las hojas',
  },
  {
    id: 'postessive',
    name: 'Postesivo',
    suffixTemplateSingular: '-[v]nva',
    suffixTemplatePlural: '-[v]nvu',
    exampleSingular: 'lafanva',
    examplePlural: 'lafanvu',
    exampleMeaning: 'detrás de la hoja / detrás de las hojas',
  },
  {
    id: 'prolative',
    name: 'Prolativo',
    suffixTemplateSingular: '-[v]vai',
    suffixTemplatePlural: '-[v]vau',
    exampleSingular: 'lafavai',
    examplePlural: 'lafavau',
    exampleMeaning: 'a través de la hoja / a través de las hojas',
  },
  {
    id: 'prosecutive',
    name: 'Prosecutivo',
    suffixTemplateSingular: '-[a]fre',
    suffixTemplatePlural: '-[i]fre',
    exampleSingular: 'alorafre',
    examplePlural: 'alorifre',
    exampleMeaning: 'a lo largo del bosque / a lo largo de los bosques',
  },
  {
    id: 'subessive',
    name: 'Subesivo',
    suffixTemplateSingular: '-[u]re',
    suffixTemplatePlural: '-[u]ri',
    exampleSingular: 'lafure',
    examplePlural: 'lafuri',
    exampleMeaning: 'bajo la hoja / bajo las hojas',
  },
  {
    id: 'subessive2',
    name: 'Subesivo 2 (debajo de)',
    suffixTemplateSingular: '-[a]wrel',
    suffixTemplatePlural: '-[a]wril',
    exampleSingular: 'oriawrel',
    examplePlural: 'oriawril',
    exampleMeaning: 'debajo del hielo / debajo de los hielos',
  },
  {
    id: 'superessive',
    name: 'Superesivo',
    suffixTemplateSingular: '-[v]dre',
    suffixTemplatePlural: '-[v]dri',
    exampleSingular: 'lafadre',
    examplePlural: 'lafadri',
    exampleMeaning: 'ante la hoja / ante las hojas',
  },
  {
    id: 'translative',
    name: 'Translaticio',
    suffixTemplateSingular: '-[o]rhe',
    suffixTemplatePlural: '-[o]rhi',
    exampleSingular: 'eradorhe',
    examplePlural: 'eradorhi',
    exampleMeaning: 'al otro lado de la montaña / al otro lado de las montañas',
  },
  {
    id: 'authoritative',
    name: 'Autoritativo',
    suffixTemplateSingular: '-[æ]lfe',
    suffixTemplatePlural: '-[æ]lfi',
    exampleSingular: 'lafælfe',
    examplePlural: 'lafælfi',
    exampleMeaning: 'bajo el poder de la hoja / bajo el poder de las hojas',
  },
  {
    id: 'adversative',
    name: 'Adversativo',
    suffixTemplateSingular: '-[v]di',
    suffixTemplatePlural: '-[v]dwi',
    exampleSingular: 'lafadi',
    examplePlural: 'lafadwi',
    exampleMeaning: 'contra la hoja / contra las hojas',
  },
  {
    id: 'ablative',
    name: 'Ablativo (lejos de)',
    suffixTemplateSingular: '-[a]ori',
    suffixTemplatePlural: '-[a]uri',
    exampleSingular: 'halvori',
    examplePlural: 'veluri',
    exampleMeaning: 'lejos del corazón / más allá de las estrellas',
  },
  {
    id: 'ablative2',
    name: 'Ablativo 2 (desde)',
    suffixTemplateSingular: '-[a]vo',
    suffixTemplatePlural: '-[a]ivu',
    exampleSingular: 'alorivo',
    examplePlural: 'duvosivu',
    exampleMeaning: 'desde el bosque / desde las sombras',
  },
  // D. CASOS TEMPORALES Y DE CAUSA
  {
    id: 'causal',
    name: 'Causal',
    suffixTemplateSingular: '-[v]vre',
    suffixTemplatePlural: '-[v]vri',
    exampleSingular: 'lafavre',
    examplePlural: 'lafavri',
    exampleMeaning: 'por la hoja / por las hojas',
  },
  {
    id: 'pretemporal',
    name: 'Pretemporal',
    suffixTemplateSingular: '-[v]ast',
    suffixTemplatePlural: '-[v]asti',
    exampleSingular: 'lafast',
    examplePlural: 'lafasti',
    exampleMeaning: 'antes de la hoja / antes de las hojas',
  },
  {
    id: 'postemporal',
    name: 'Post-temporal',
    suffixTemplateSingular: '-[v]lyo',
    suffixTemplatePlural: '-[v]lyu',
    exampleSingular: 'lafalyo',
    examplePlural: 'lafalyu',
    exampleMeaning: 'tras la hoja / tras las hojas',
  },
  {
    id: 'terminative',
    name: 'Terminativo (durante)',
    suffixTemplateSingular: '-[æ]r',
    suffixTemplatePlural: '-awre',
    exampleSingular: 'varwær',
    examplePlural: 'varwawre',
    exampleMeaning: 'durante la guerra / durante las guerras',
  },
  {
    id: 'terminative2',
    name: 'Terminativo 2 (hasta que)',
    suffixTemplateSingular: '-[a]lro',
    suffixTemplatePlural: '-[a]lri',
    exampleSingular: 'ceolaralro',
    examplePlural: 'ceolaralri',
    exampleMeaning: 'hasta el deseo / hasta los deseos',
  },
  {
    id: 'aversive',
    name: 'Aversivo',
    suffixTemplateSingular: '-[a]mpe',
    suffixTemplatePlural: '-[a]mpwe',
    exampleSingular: 'lafampe',
    examplePlural: 'ivempwe',
    exampleMeaning: 'evitar la hoja / evitar las aves',
  },
  {
    id: 'mutative',
    name: 'Caso Mutativo',
    suffixTemplateSingular: '-[a]vwa',
    suffixTemplatePlural: '-[a]vwar',
    exampleSingular: 'moravwa',
    examplePlural: 'moravwar',
    exampleMeaning: 'en árbol / en árboles',
  },
] as const;

// ─── PRONOUNS ──────────────────────────────────────────────────────────────

export interface PronounSet {
  person: string;
  number: string;
  gender?: string;
  forms: Record<string, string>; // caseId → form
}

export const QUAVANOL_PRONOUNS: PronounSet[] = [
  // A) Casos Gramaticales Principales
  { person: '1st', number: 'sg', forms: { vocative: 'Haulen!', nominative: 'en', accusative: 'ren', genitive: 'den', dative: 'len' } },
  { person: '2nd', number: 'sg', forms: { vocative: 'Haulve!', nominative: 'ev', accusative: 'ver', genitive: 'dev', dative: 'lev' } },
  { person: '3rd', number: 'sg', gender: 'm', forms: { vocative: 'Haulre!', nominative: 'er', accusative: 'rer', genitive: 'der', dative: 'ler' } },
  { person: '3rd', number: 'sg', gender: 'f', forms: { vocative: 'Haulis!', nominative: 'is', accusative: 'ser', genitive: 'des', dative: 'les' } },
  { person: '1st', number: 'pl', forms: { vocative: 'Haulane!', nominative: 'nen', accusative: 'rene', genitive: 'dene', dative: 'lene' } },
  { person: '2nd', number: 'pl', forms: { vocative: 'Haulven!', nominative: 'ven', accusative: 'ever', genitive: 'deve', dative: 'leve' } },
  { person: '3rd', number: 'pl', forms: { vocative: 'Haulren!', nominative: 'ren', accusative: 'erer', genitive: 'dere', dative: 'lere' } },
  // B) Casos de Relación (Instrumental, Comitativo, Abesivo, Dedativo)
  { person: '1st', number: 'sg', forms: { instrumental: 'nen', comitative: 'elve', abessive: 'ven', dedative: 'thrin' } },
  { person: '2nd', number: 'sg', forms: { instrumental: 'nev', comitative: 'velve', abessive: 'vev', dedative: 'thriv' } },
  { person: '3rd', number: 'sg', gender: 'm', forms: { instrumental: 'ner', comitative: 'relve', abessive: 'ver', dedative: 'thrir' } },
  { person: '3rd', number: 'sg', gender: 'f', forms: { instrumental: 'nes', comitative: 'selve', abessive: 'ves', dedative: 'thris' } },
  { person: '1st', number: 'pl', forms: { instrumental: 'enen', comitative: 'sulve', abessive: 'vene', dedative: 'thrine' } },
  { person: '2nd', number: 'pl', forms: { instrumental: 'enev', comitative: 'vulve', abessive: 'veve', dedative: 'thrive' } },
  { person: '3rd', number: 'pl', forms: { instrumental: 'ener', comitative: 'rulve', abessive: 'vere', dedative: 'thrire' } },
  // C) Casos Locativos
  { person: '1st', number: 'sg', forms: { adlative: 'nosi', adlative2: 'nesi', allative: 'dan', antelative: 'nelte', lative: 'nesni', exessive: 'eneda', intrative: 'ente', locative: 'ren', perlative: 'nevor', postessive: 'nenva', prolative: 'nevai', prosecutive: 'efre', subessive: 'eure', subessive2: 'ewrel', superessive: 'edre', translative: 'erhe', authoritative: 'elfe', adversative: 'edi', ablative: 'eori', ablative2: 'evo', causal: 'evre', pretemporal: 'enast', postemporal: 'enlyo', terminative: 'eær', terminative2: 'elro', aversive: 'empe' } },
  { person: '2nd', number: 'sg', forms: { adlative: 'vosi', adlative2: 'vesi', allative: 'dav', antelative: 'velte', lative: 'vesni', exessive: 'veneda', intrative: 'vente', locative: 'rev', perlative: 'vevor', postessive: 'venva', prolative: 'vevai', prosecutive: 'vefre', subessive: 'veure', subessive2: 'vewrel', superessive: 'vedre', translative: 'verhe', authoritative: 'velfe', adversative: 'vedi', ablative: 'vori', ablative2: 'vevo', causal: 'vevre', pretemporal: 'venast', postemporal: 'venlyo', terminative: 'vær', terminative2: 'velro', aversive: 'vempe' } },
  { person: '3rd', number: 'sg', gender: 'm', forms: { adlative: 'rosi', adlative2: 'resi', allative: 'dar', antelative: 'relte', lative: 'resni', exessive: 'reneda', intrative: 'sinte', locative: 'ere', perlative: 'revor', postessive: 'renva', prolative: 'revai', prosecutive: 'refre', subessive: 'reure', subessive2: 'rewrel', superessive: 'redre', translative: 'rerhe', authoritative: 'relfe', adversative: 'redi', ablative: 'rori', ablative2: 'revo', causal: 'revre', pretemporal: 'renast', postemporal: 'renlyo', terminative: 'rær', terminative2: 'relro', aversive: 'rempe' } },
  { person: '3rd', number: 'sg', gender: 'f', forms: { adlative: 'sosi', adlative2: 'sesi', allative: 'das', antelative: 'selte', lative: 'sesni', exessive: 'sineda', intrative: 'rente', locative: 'res', perlative: 'sivor', postessive: 'sinva', prolative: 'sivai', prosecutive: 'sifre', subessive: 'siure', subessive2: 'siwrel', superessive: 'sidre', translative: 'sirhe', authoritative: 'silfe', adversative: 'sidi', ablative: 'sori', ablative2: 'sivo', causal: 'sevre', pretemporal: 'sinast', postemporal: 'sinlyo', terminative: 'sær', terminative2: 'selro', aversive: 'sempe' } },
  { person: '1st', number: 'pl', forms: { adlative: 'nus', adlative2: 'nesir', allative: 'dane', antelative: 'nelti', lative: 'nesnu', exessive: 'enedu', intrative: 'enti', locative: 'rene', perlative: 'nevur', postessive: 'nenvu', prolative: 'nevau', prosecutive: 'nifre', subessive: 'euri', subessive2: 'vewril', superessive: 'edri', translative: 'erhi', authoritative: 'elfi', adversative: 'edwi', ablative: 'euri', ablative2: 'eivu', causal: 'evri', pretemporal: 'enasti', postemporal: 'enlyu', terminative: 'eawre', terminative2: 'elri', aversive: 'empwe' } },
  { person: '2nd', number: 'pl', forms: { adlative: 'vus', adlative2: 'vesir', allative: 'dave', antelative: 'velti', lative: 'vesnu', exessive: 'venedu', intrative: 'venti', locative: 'reve', perlative: 'vevur', postessive: 'venvu', prolative: 'vevau', prosecutive: 'vifre', subessive: 'veuri', subessive2: 'vewril', superessive: 'vedri', translative: 'verhi', authoritative: 'velfi', adversative: 'vedwi', ablative: 'vuri', ablative2: 'veivu', causal: 'vevri', pretemporal: 'venasti', postemporal: 'venlyu', terminative: 'vawre', terminative2: 'velri', aversive: 'vempwe' } },
  { person: '3rd', number: 'pl', forms: { adlative: 'rus', adlative2: 'resir', allative: 'dare', antelative: 'relti', lative: 'resnu', exessive: 'renedu', intrative: 'renti', locative: 'rere', perlative: 'revur', postessive: 'renvu', prolative: 'revau', prosecutive: 'rifre', subessive: 'reuri', subessive2: 'rewril', superessive: 'redri', translative: 'erhi', authoritative: 'relfi', adversative: 'redwi', ablative: 'ruri', ablative2: 'reivu', causal: 'revri', pretemporal: 'renasti', postemporal: 'renlyu', terminative: 'rawre', terminative2: 'relri', aversive: 'rempwe' } },
] as const;

// ─── VERBS ─────────────────────────────────────────────────────────────────

export interface VerbParadigm {
  tense: string;
  mood: string;
  aspect?: string;
  conjugation: 'simple' | 'compound'; // simple = subject explicit, compound = subject in suffix
  singularForms?: Record<string, string>; // person → form
  pluralForms?: Record<string, string>;   // person → form
  notes?: string;
}

export const QUAVANOL_VERBS: VerbParadigm[] = [
  // A) INDICATIVO SIMPLE
  {
    tense: 'present', mood: 'indicative', conjugation: 'simple',
    singularForms: { '1': '-é', '2': '-é', '3': '-é' },
    pluralForms: { '1': '-we', '2': '-we', '3': '-we' },
    notes: 'Raíz + sufijo. Ej: Ive vilé (el ave canta)',
  },
  {
    tense: 'past', mood: 'indicative', conjugation: 'simple',
    singularForms: { '1': '-as', '2': '-as', '3': '-as' },
    pluralForms: { '1': '-was', '2': '-was', '3': '-was' },
    notes: 'Ej: Ive vilas (el ave cantó)',
  },
  {
    tense: 'future', mood: 'indicative', conjugation: 'simple',
    singularForms: { '1': '-ila', '2': '-ila', '3': '-ila' },
    pluralForms: { '1': '-ilwa', '2': '-ilwa', '3': '-ilwa' },
    notes: 'Ej: Ive vilila (el ave cantará)',
  },
  // B) INDICATIVO COMPUESTO (subject implicit in suffix)
  {
    tense: 'present', mood: 'indicative', conjugation: 'compound',
    singularForms: { '1': '-en', '2': '-ev', '3m': '-er', '3f': '-is' },
    pluralForms: { '1': '-wen', '2': '-wev', '3': '-wer' },
    notes: 'Ej: Tieten (yo ato), Vlentev (tú mandas), Dwer (él oye)',
  },
  {
    tense: 'past', mood: 'indicative', conjugation: 'compound',
    singularForms: { '1': '-an', '2': '-av', '3': '-ar' },
    pluralForms: { '1': '-aen', '2': '-aev', '3': '-aer' },
    notes: 'Ej: Tietan (yo até), Vlentav (tú mandaste), Dwar (él oyó)',
  },
  {
    tense: 'future', mood: 'indicative', conjugation: 'compound',
    singularForms: { '1': '-ilan', '2': '-ilav', '3': '-ilar' },
    pluralForms: { '1': '-ilaen', '2': '-ilaev', '3': '-ilaer' },
    notes: 'Ej: Tietilán (yo ataré), Vlentilá (tú mandarás), Dwila (él oirá)',
  },
  // C) MODO NEGATIVO
  {
    tense: 'present', mood: 'negative', conjugation: 'simple',
    singularForms: { '3': '(ó + indicativo sg)' },
    pluralForms: {},
    notes: 'Prefijo ó + [h] si verbo inicia en vocal. Ej: Ive ó vilila (el ave no cantará)',
  },
  // D) MODO PERFECTO
  {
    tense: 'present', mood: 'perfect', conjugation: 'simple',
    singularForms: { '1': 'Vo + indicativo sg' },
    notes: 'Partícula vo- (afirmativo) / vœ- (negativo) + verbo indicativo singular. Ej: Vo tiete (he atado)',
  },
  {
    tense: 'past', mood: 'perfect', conjugation: 'simple',
    singularForms: { '2': 'Vo vlentav' },
    notes: 'Ej: Vo vlentav (hubo mandado)',
  },
  // E) MODO IMPERATIVO
  {
    tense: 'present', mood: 'imperative', conjugation: 'simple',
    singularForms: { '1': '-yán', '2': '-yáv', '3m': '-yár' },
    pluralForms: { '1': '-yaén', '2': '-yaév', '3': '-yaér' },
    notes: 'Sufijo -[y,i]á (sg) / -[y,i]ái (pl). Ej: Ive vilyá (¡Canta ave!)',
  },
  {
    tense: 'present', mood: 'imperative-negative', conjugation: 'simple',
    singularForms: { '1': '-yón', '2': '-yóv', '3m': '-yór' },
    pluralForms: { '1': '-yoén', '2': '-yoév', '3': '-yoér' },
    notes: 'Sufijo -[y,i]ó (sg) / -[y,i]ói (pl). Ej: Ive vilyó (¡Ave no cantes!)',
  },
  // F) MODO SUBJUNTIVO
  {
    tense: 'present', mood: 'subjunctive', conjugation: 'simple',
    singularForms: { '1': 'mæ + indicativo sg' },
    notes: 'Partícula mæ- (positivo) / væ- (negativo) + verbo indicativo. Ej: Mae tietén (yo ate / que yo ate)',
  },
  {
    tense: 'past', mood: 'subjunctive', conjugation: 'simple',
    singularForms: { '1': 'Tietan (yo atase)' },
    notes: 'Los ejemplos usan las mismas formas del indicativo pasado pero con partícula mæ-',
  },
  // G) CONDICIONAL
  {
    tense: 'present', mood: 'conditional', conjugation: 'simple',
    singularForms: { '1': '-í', '3': '-í' },
    pluralForms: { '1': '-wí', '3': '-wí' },
    notes: 'Sufijo -í (sg) / -wí (pl). Negativo: -ó / -wó. Ej: Ive vilí (el ave cantaría)',
  },
  {
    tense: 'present', mood: 'conditional', conjugation: 'compound',
    singularForms: { '1': '-ín', '2': '-ív', '3': '-ír' },
    pluralForms: { '1': '-wín', '2': '-wív', '3': '-wír' },
    notes: 'Negativo: -ón/-óv/-ór / -wón/-wóv/-wór. Ej: Tietín (yo ataría)',
  },
] as const;

// ─── PARTICLES / MODAL PARTICLES ───────────────────────────────────────────

export const QUAVANOL_PARTICLES = {
  // Verb modifiers (pre-verbal particles)
  negative:      'ó',      // Pre-verb negative (ó + [h] + verb)
  perfect:       'vo',     // Perfect aspect (vo + verb)
  perfectNeg:    'vœ',     // Perfect negative (vœ + verb)
  subjunctive:   'mæ',     // Subjunctive particle
  subjunctiveNeg:'væ',     // Subjunctive negative
  interrogative: 'kwa',    // Interrogative (kwa + h + verb)
  interrogativeNeg: 'kwo', // Interrogative negative
  // Reflexive markers
  reflexive:     'læ',     // Singular reflexive
  reflexiveNeg:  'lœ',     // Singular negative reflexive
  reflexivePl:   'law',    // Plural reflexive
  reflexivePlNeg:'low',    // Plural negative reflexive
  // Intransitive
  intransitive:  'fai',    // Intransitive particle (after conjugated verb)
  // Vaérica voice
  vaerica:       'i-',     // Vaérica prefix (i- + first consonant(s) of root + -wal- + rest of root)
  // Determiners
  definite:      'teh',    // Definido (el, la)
  indefinite:    'hu',     // Indefinido (un, una)
  // Demonstratives
  proximal:      'sin',    // Cercanía (este, esta)
  medial:        'sen',    // Distancia media (ese, esa)
  distal:        'san',    // Lejanía (aquel, aquella)
  extreme:       'sœn',    // Lejanía extrema
  // Quantifiers
  some:          'awen',   // Alguno, alguien
  much:          'mai',    // Mucho
  few:           'fai',    // Poco
  all:           'horo',   // Todo
  nothing:       'woro',   // Nada
  none:          'owen',   // Ninguno
  // Quality particles
  certain:       'vethe',  // Cierto
  uncertain:     'owthe',  // Incierto
  necessary:     'nathe',  // Necesario
  unnecessary:   'nothe',  // Innecesario
  desired:       'gio',    // Deseado
  undesired:     'ogwi',   // Indeseado
  same:          'gwe',    // El mismo
  other:         'ogwe',   // El otro
  // Temporal particles
  past:          'hil',    // Anterior, pasado
  present:       'hel',    // Actual, corriente
  future:        'hail',   // Siguiente, futuro
  eternal:       'hovre',  // Eterno
  // Interrogative particles
  who:           'win',
  what:          'pew',
  when:          'wiv',
  where:         'vao',
  how:           'aeve',
  which:         'irve',
  that:          'go',
  // Negative prefix
  negPrefix:     'o-',     // Se añade a otras partículas para negarlas
  // Relative particles
  relative:      'go',     // El/lo/aquel que
  relativeFormal:'irve',   // El cual (formal/poético)
  possessiveRel: 'dwo',    // Cuyo
} as const;

// ─── CONJUNCTIONS ──────────────────────────────────────────────────────────

export const QUAVANOL_CONJUNCTIONS = {
  conditional: { if: 'í', as_if: 'peg', only_if: 'impro', while: 'yevle' },
  final: { so_that: 'la', so_as_to: 'imae' },
  comparative: { as: 've' },
  temporal: { after: 'ahela', while: 'Salo' },
  concessive: { although: 'ænte', even_though: 'ehæv' },
  copulative: { and: 'or', neither: 'eor' },
  disjunctive: { or: 'un' },
  adversative: { but: 'oro', however: 'othwa' },
} as const;

// ─── NUMERALS ──────────────────────────────────────────────────────────────

export const QUAVANOL_NUMERALS = {
  // Cardinales básicos
  cardinals: {
    '1': 'ie', '2': 'eve', '3': 'ere', '4': 'aefe', '5': 'ekwe',
    '6': 'ese', '7': 'eme', '8': 'ete', '9': 'ehe', '10': 'aen',
  },
  // Decenas
  tens: {
    '10': 'aen', '20': 'vaen', '30': 'raen', '40': 'faen', '50': 'kwaen',
    '60': 'saen', '70': 'maen', '80': 'taen', '90': 'haen',
  },
  // Centenas
  hundreds: {
    '100': 'caen', '200': 'vecaen', '300': 'recaen', '400': 'fecaen',
    '500': 'kwecaen', '600': 'secaen', '700': 'mecaen', '800': 'tecaen', '900': 'hecaen',
  },
  thousands: {
    '1000': 'yaen', '2000': 'veyaen', '3000': 'reyaen',
  },
  ordinalPrefixes: {
    '1': 'Ye-', '2': 'Ve-', '3': 'Re-', '4': 'Fe-', '5': 'Ke-',
    '6': 'Se-', '7': 'Me-', '8': 'Te-', '9': 'He-', '10': 'Ne-', 'last': 'De-',
  },
  multiplicative: { once: 'eai', twice: 'veai', thrice: 'erai' },
} as const;

// ─── SER / ESTAR ───────────────────────────────────────────────────────────

export const QUAVANOL_SER_ESTAR = {
  root: 'eo-',
  infinitives: { positive: 'vae', negative: 'voe' },
  gerund: 'endo',
  participle: 'edo',
  // Indicativo presente
  present: { affirmative: 'e', negative: 'o e', interrogative: 'kwe', interrogativeNeg: 'kwo e' },
  // Pasado
  past: { affirmative: 'as', negative: 'o as', interrogative: 'kwas', interrogativeNeg: 'kwo as' },
  // Futuro
  future: { affirmative: 'ila', negative: 'o ila', interrogative: 'kwila', interrogativeNeg: 'kwo ila' },
  // Perfecto
  perfect: {
    infinitive: 'vo vae',
    present: { affirmative: 've', negative: 'ove', interrogative: 'kwave', interrogativeNeg: 'kwove' },
    past: { affirmative: 'vas', negative: 'ovas', interrogative: 'kwavas', interrogativeNeg: 'kwovas' },
    future: { affirmative: 'vila', negative: 'ovila', interrogative: 'kwavila', interrogativeNeg: 'kwovila' },
  },
} as const;

// ─── VERB CHAINS ───────────────────────────────────────────────────────────

export const QUAVANOL_VERB_CHAINS = {
  rule: 'Only the last verb in the chain is conjugated. All previous verbs remain in root form.',
  harmony: 'Insert linking vowel -i- between roots if the consonant junction is cacophonic.',
  examples: [
    { chain: 'harn-carv vilen', meaning: '(querer-poder) canto / Quiero cantar', depth: 2 },
    { chain: 'Ceol carv vaugæva', meaning: '(desear-querer-comer) / Sin desear poder comer', depth: 3 },
    { chain: 'vore ceol var carv evæthral', meaning: '(soñar-desear-querer-ver) para / Sobre soñar desear querer ver', depth: 4 },
  ],
} as const;

// ─── ADJECTIVES / ADVERBS ──────────────────────────────────────────────────

export const QUAVANOL_ADJECTIVES = {
  adjectiveSuffix: { singular: '-e', plural: '-ie' },
  adverbSuffix: { singular: '-ai', plural: '-wai' },
  superlativePrefixAdj: 'An-',      // Para adjetivos: An- + raíz
  superlativePrefixNoun: 'Ava-',    // Para sustantivos: Ava- + raíz
  abyssalPrefixAdj: 'Smu-',         // Para adjetivos: Smu- + raíz
  abyssalPrefixNoun: 'Spu-',        // Para sustantivos: Spu- + raíz
} as const;

// ─── TYPOLOGY ──────────────────────────────────────────────────────────────

export const QUAVANOL_TYPOLOGY = {
  wordOrder: 'flexible',
  defaultWordOrder: 'SVO',
  morphology: 'fusional-agglutinative',
  headDirection: 'head-initial',
  alignment: 'nominative-accusative',
  // Notes:
  // - Flexible due to extensive case marking
  // - SVO most common in prose; SOV tendency in subordinate clauses
  // - Adjectives flexible position (after noun = neutral, before = emphatic)
  // - Determiners always precede nouns
  // - Modifier phrases generally follow the modified noun
} as const;

// ─── STRATEGIES ────────────────────────────────────────────────────────────

export const QUAVANOL_STRATEGIES = [
  {
    id: 'case_suffixes',
    name: 'Sufijos de Caso',
    type: 'suffix' as const,
    appliesTo: ['noun'],
    appliesToCategories: ['sustantivo', 'pronombre'],
    affixRule: { position: 'suffix', form: '-(r|t|s|re|...) depende del caso' },
    notes: 'Cada caso tiene su propio sufijo. El género se marca antes del sufijo de caso.',
  },
  {
    id: 'gender_prefixes',
    name: 'Prefijos/Géneros',
    type: 'prefix' as const,
    appliesTo: ['noun'],
    appliesToCategories: ['sustantivo'],
    affixRule: { position: 'prefix', form: 'ilu-/[A]snor-/-[a]ulen/etc.' },
    notes: '9 géneros con prefijos o sufijos específicos. Van antes del sufijo de caso.',
  },
  {
    id: 'verbal_suffixes',
    name: 'Sufijos de Conjugación Verbal',
    type: 'suffix' as const,
    appliesTo: ['verb'],
    appliesToCategories: ['verbo'],
    affixRule: { position: 'suffix', form: '-é/-as/-ila/-en/-an/...' },
    notes: 'Depende de tiempo, modo, número, persona. Modo compuesto: sufijo incluye persona.',
  },
  {
    id: 'preverbal_particles',
    name: 'Partículas Pre-verbales',
    type: 'particle' as const,
    appliesTo: ['verb'],
    appliesToCategories: ['verbo'],
    particleRule: { marker: 'ó/mæ/vo/kwa', relativePosition: 'before' },
    notes: 'Negativo (ó), Subjuntivo (mæ), Perfecto (vo), Interrogativo (kwa). Van antes del verbo.',
  },
  {
    id: 'adjective_suffix',
    name: 'Sufijo de Adjetivo',
    type: 'suffix' as const,
    appliesTo: ['modifier'],
    appliesToCategories: ['adjetivo'],
    affixRule: { position: 'suffix', form: '-e (sg) / -ie (pl)' },
    notes: 'Se añade a raíz nominal. Adverbios: -ai / -wai.',
  },
  {
    id: 'superlative_prefix',
    name: 'Prefijos de Superlativo/Abisal',
    type: 'prefix' as const,
    appliesTo: ['modifier'],
    appliesToCategories: ['adjetivo', 'sustantivo'],
    affixRule: { position: 'prefix', form: 'An- (adj) / Ava- (noun) / Smu- / Spu-' },
    notes: 'An- para virtud, Smu- para anti-virtud (adjetivos). Ava-/Spu- para sustantivos.',
  },
  {
    id: 'verb_chains',
    name: 'Cadenas Verbales',
    type: 'particle' as const,
    appliesTo: ['verb'],
    appliesToCategories: ['verbo'],
    particleRule: { marker: '(root1 root2 ...)', relativePosition: 'before' },
    notes: 'Solo el último verbo se conjuga. Los anteriores van en raíz pura. Vocal de enlace -i- si cacofónico.',
  },
  {
    id: 'word_order',
    name: 'Orden de Palabras Flexible',
    type: 'position' as const,
    appliesTo: ['sentence'],
    appliesToCategories: [],
    positionRule: { anchor: 'sentence_start', relation: 'before', distance: 0 },
    notes: 'SVO neutro en prosa. SOV en subordinadas. Determinantes siempre antes del sustantivo.',
  },
] as const;

// ─── MORPHOLOGICAL RULES (EUPHONY) ─────────────────────────────────────────

export const QUAVANOL_MORPHOLOGY = {
  // Order of affixes in a word:
  // Prefix + Root + Gender Suffix + Case Suffix
  affixOrder: ['prefix', 'root', 'gender', 'case'] as const,
  // Plural rules in nominative
  nominativePlural: {
    vowel_a: 'a → u',
    vowel_o: 'o → i',
    vowel_e: 'e → ye',
    consonant: '+ -u',
  },
  // Gender suffixes (before case suffix)
  genderSuffixes: {
    'primordial': '-[a]ulen',
    'divine': '-[o]rlæ',
    'magic': '-[v]rwo',
    'immortal': '-[v]vla',
    'real_noble': 'ilu- / ilw-',
    'mortal': '-[v]smor / srom',
    'animal': '-[a]dno',
    'titanic': '-[a]nca / -[a]tca',
    'malignant': '-[A]snor / -[A]sron',
  },
  // Special plural forms for certain nominative-only groups:
  specialPlurals: {
    gentilicio: '-ath',       // Moriath, Velenmorath
    etnia: '-[a]vi',          // Thanku Navalavi
    especie: '-ri',           // Hivelri, Vadriari
  },
} as const;

// ─── ARTICLES / DETERMINERS ────────────────────────────────────────────────

export const QUAVANOL_DETERMINERS = {
  definite: 'teh',
  indefinite: 'hu',
  demonstrative: {
    proximal: 'sin',
    medial: 'sen',
    distal: 'san',
    extreme: 'sœn',
  },
  quantifiers: {
    some: 'awen',
    much: 'mai',
    few: 'fai',
    abundant: 'wela',
    scarce: 'wœla',
    tooMuch: 'vere',
    insufficient: 'vore',
    excessive: 'Hafe',
    insufficientAlt: 'Hafo',
    enough: 'vul',
    several: 'meda',
    each: 'cave',
    all: 'horo',
    nothing: 'woro',
    none: 'owen',
  },
  posessive: 'dwo / dwœ',
} as const;

// ─── DEFAULT GRAMMAR MANIFEST FOR QUAVANOL ──────────────────────────────────

export const QUAVANOL_DEFAULT_MANIFEST = {
  meta: {
    author: 'Quavanol (canon original)',
    version: '1.0',
    sourceFormat: 'manual' as const,
    lastUpdated: new Date().toISOString(),
  },
  typology: {
    wordOrder: 'SVO',
    alignment: 'nominative-accusative',
    morphology: 'fusional-agglutinative',
    headDirection: 'head-initial',
  },
  roles: [
    { id: 'subject', name: 'Sujeto' },
    { id: 'object', name: 'Objeto' },
    { id: 'indirect_object', name: 'Objeto Indirecto' },
    { id: 'modifier', name: 'Modificador' },
    { id: 'particle', name: 'Partícula' },
    { id: 'auxiliary_verb', name: 'Verbo Auxiliar' },
  ],
  strategies: QUAVANOL_STRATEGIES as any,
  paradigms: [], // Empty — user fills in specific verb/noun paradigms
  mutationRules: [],
  exceptions: [],
  notes: [
    'Gramática basada en el documento "QUAVANOL - clave.txt" (Ilmuria).',
    'El Quavanol es flexivo y aglutinante con sistema de casos extenso (30+ casos).',
    'Los géneros (9) funcionan como prefijos/sufijos antes del sufijo de caso.',
    'Los pronombres son formas fusionadas — no se flexionan con sufijos de caso.',
    'Los verboides (infinitivos, participios, gerundios) se declinan como sustantivos.',
    'Cadenas verbales: solo el último verbo se conjuga; los demás van en raíz pura.',
    'Eufonía: vocal de enlace [a], [e], o [v] (armónica) según necesidad.',
  ],
} as const;

// ─── KEY FACTS FOR TESTS ────────────────────────────────────────────────────

/**
 * Quick assertions suitable for smoke tests:
 *
 * - QUAVANOL_CASES.length > 20  → extensive case system
 * - QUAVANOL_PRONOUNS.length > 5 → pronoun fusion (not suffix-based)
 * - QUAVANOL_STRATEGIES covers: case_suffixes (affix), preverbal_particles (particle),
 *   verb_chains (particle), superlative_prefix (prefix), word_order (position)
 * - Typology: SVO, fusional-agglutinative, head-initial, nominative-accusative
 * - No verb auxiliaries — verb chains use root concatenation
 * - Genders (9) marked before case suffix
 */
export const QUAVANOL_KEY_FACTS = {
  caseCount: QUAVANOL_CASES.length,
  pronounCount: QUAVANOL_PRONOUNS.length,
  strategyCount: QUAVANOL_STRATEGIES.length,
  genderCount: QUAVANOL_GENDERS.length,
  verbParadigmCount: QUAVANOL_VERBS.length,
  wordOrder: QUAVANOL_TYPOLOGY.defaultWordOrder,
  morphologyType: QUAVANOL_TYPOLOGY.morphology,
  headDirection: QUAVANOL_TYPOLOGY.headDirection,
  alignment: QUAVANOL_TYPOLOGY.alignment,
  hasVerbChains: true,
  hasEuphonyLinking: true,
  hasVaericaVoice: true,
  hasPenates: true,
  hasParticlesForMood: true,
} as const;
