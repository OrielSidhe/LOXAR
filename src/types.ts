
export interface LexiconEntry {
  ID: string; // Internal ID for UI and keying
  externalID?: string; // User-provided ID from import
  Raíz: string;
  Léxema: string[];
  Categoría: string;
  Significado: string[];
  extraData: { [key:string]: any };
  exceptions?: LexicalException[];
}

export type NewLexiconEntry = Omit<LexiconEntry, 'ID'>;

export type LexiconFormSubmitData = {
  Raíz: string;
  Léxema: string;
  Categoría: string;
  Significado: string;
  extraData: { [key:string]: any };
};

export type LexiconFilter = 'all' | 'complete' | 'incomplete' | 'ai-generated' | 'synonyms';

export interface LexiconMetadata {
    conlangName: string;
    mainLanguage: string;
}

export interface CorpusEntry {
  id: string;
  title: string;
  meaning: string;
  transcription: string;
  createdAt: string;
  updatedAt: string;
}

export interface LexiconData {
  entries: LexiconEntry[];
  profile: GenerativeProfile;
  neography: NeographyProfile;
  inflection: InflectionProfile;
  grammar: GrammarManifest;
  corpus: CorpusEntry[];
  metadata: LexiconMetadata;
  wordsAddedSinceSave: number;
  customFunctions: string[];
  schemaVersion: number;
}

export type MissingWord = {
    Significado: string;
    Categoría: string;
};

/** Un elemento de la "cola de trabajo" del workbench. Es una semilla de
 *  palabra (Significado/Categoría) que puede llevar ya Raíz/Léxema generados. */
export type WorkQueueItem = {
    key: string;
    Significado: string;
    Categoría: string;
    Raíz?: string;
    Léxema?: string[];
    pending?: boolean;
};

export interface ImportResult {
    success: boolean;
    error?: string;
}

export interface DerivationalAffix {
    affix: string;
    type: 'prefijo' | 'sufijo' | 'infijo' | 'desinencia';
    meaning: string;
}

export interface GenerativeProfile {
  consonants: string[];
  vowels: string[];
  syllableStructures: string[];
  consonantClusters: string[];
  vowelClusters: string[];
  sampleText: string;
  grammarNotes: string;
  derivationalAffixes: DerivationalAffix[];
}

export interface Glyph {
  id: string;
  name: string;
  unicode?: string;
  svgPathMain: string;
  svgPathUpper?: string;
  svgPathLower?: string;
  viewBox: { width: number; height: number };
  isCombining?: boolean;
  width?: number;
  lsb?: number;
  rsb?: number;
  anchors?: { [key: string]: { x: number; y: number } };
  blueprintImage?: string;
}

export interface NeographyProfile {
  glyphs: Glyph[];
  characterMap: { [char: string]: string }; // Maps keyboard char to glyph ID
  writingDirection?: 'ltr' | 'rtl' | 'ttb';
  guideLines?: {
    baseline: number;
    xHeight: number;
    ascender: number;
    descender: number;
    emSize?: number;
  };
  customCharacters?: string[];
  ligatures: { [sequence: string]: string }; // Maps sequence (e.g. "ae") to glyph ID
  fontFamily?: string;
  previewFont?: string;
}


export type GenerationMode = 'generative' | 'etymological' | 'derivational';

export type CategoryOperation =
  | { type: 'merge'; from: string[]; to: string }
  | { type: 'rename'; from: string; to: string }
  | { type: 'delete'; category: string };

export type FunctionOperation = CategoryOperation;

export type HyphenOperation = {
    type: 'add' | 'remove';
    categories: string[];
};

export type InflectionRule = {
  id: string;
  name: string;
} & (
    | {
      type: 'simple';
      template: string;
    }
    | {
      type: 'conditional';
      conditionType: 'endsWith' | 'startsWith' | 'contains';
      conditionValue: string;
      actionType: 'replaceEnding' | 'addSuffix' | 'addPrefix';
      actionValue: string;
    }
  );

export interface InflectionParadigm {
  id: string;
  name: string;
  appliesTo?: string[];
  rules: InflectionRule[];
  paradigms?: InflectionParadigm[];
}

export type PhonologicalRule = {
  id: string;
  name: string;
  matchPattern: string;
  replacement: string;
  isRegex: boolean;
};

export interface InflectionProfile {
  paradigms: InflectionParadigm[];
  phonologicalRules?: PhonologicalRule[];
}

export interface LanguageSampleWord {
  word: string;
  root: string;
  category: string;
  meaning: string;
  structure?: string;
}

export interface LanguageSample {
  text: string;
  translation: string;
  newWords: LanguageSampleWord[];
}

export interface SyntacticRole {
  id: string;
  name: string;
  description?: string;
}

export type StrategyType = 'position' | 'affix' | 'clitic' | 'tone' | 'mutation' | 'particle' | 'auxiliary';

/**
 * Marking strategies — the controlled catalog from the Universal Typological
 * Matrix (marking_strategy_legend). Superset of the engine's `StrategyType`.
 * Values beyond the 7 engine types are preserved as descriptive notes and not
 * consumed by the realization engine.
 */
export type MarkingStrategy =
  | 'positional' | 'prefix' | 'suffix' | 'infix' | 'circumfix'
  | 'transfix_templatic' | 'clitic' | 'particle' | 'auxiliary_periphrastic'
  | 'tone_change' | 'stress_shift' | 'root_internal_mutation_apophony'
  | 'reduplication' | 'suppletion' | 'zero_unmarked';

export interface MorphosyntacticStrategy {
  id: string;
  name: string;
  type: StrategyType;
  appliesTo: string[];
  appliesToCategories?: string[];
  positionRule?: { anchor: 'verb' | 'noun' | 'sentence_start' | 'sentence_end'; relation: 'before' | 'after'; distance: number };
  affixRule?: { position: 'prefix' | 'suffix' | 'infix' | 'circumfix'; form: string; allomorphs?: { condition: string; form: string }[] };
  particleRule?: { marker: string; relativePosition: 'before' | 'after'; distance?: number };
  cliticRule?: { form: string; hostPosition: 'proclitic' | 'enclitic' | 'mesoclitic' };
  auxiliaryRule?: { auxiliaryForm: string; order: 'aux_before' | 'aux_after'; mainVerbForm: string };
  toneRule?: { description: string; pattern?: string };
  transformationRule?: { pattern: string; replacement: string };
  notes?: string;
}

/**
 * TypologicalProfile — the extraction target derived from the Universal
 * Typological Matrix. It is the GUIDE for what `parseGrammarAdvanced` should
 * pull out of ANY user document (txt/md/doc). Inventories are OPEN string[]
 * so languages with unusual inventories (e.g. Quavanol's 20+ cases) are kept
 * verbatim rather than forced into a fixed enum. This is the "núcleo + escritura"
 * scope: phonology, morphology, syntax, nominal, verbal, modifiers, writing.
 * Pragmatics and lexicon are intentionally excluded from the saved profile.
 */
export interface TypologicalProfile {
  meta?: {
    modality?: string[];
    naturalness?: string;
    vitality_status?: string;
  };
  morphology?: {
    synthesis_level?: string;
    fusion_degree?: string;
    vowel_harmony?: boolean;
    consonant_mutation?: boolean;
  };
  syntax?: {
    basic_word_order?: string;
    flexibility?: string;
    morphosyntactic_alignment?: string;
    head_directionality?: string;
    pro_drop_behavior?: string;
  };
  nominal?: {
    noun_classes?: { active: boolean; inventory: string[] };
    number_system?: { active: boolean; inventory: string[] };
    case_system?: { active: boolean; inventory: string[] };
    definiteness?: { marking_strategy: string[] };
  };
  verbal?: {
    tense_system?: { active: boolean; inventory: string[] };
    aspect_system?: { active: boolean; inventory: string[] };
    mood_system?: { inventory: string[] };
    valency?: { inventory: string[] };
  };
  modifiers?: {
    adjective_typology?: string;
    adverb_formation?: string;
    adpositions?: string;
  };
  writing?: {
    exists?: boolean;
    script_type?: string;
    directionality?: string;
    case_distinction?: boolean;
  };
  /** Syntactic roles: typical catalog + any language-specific open roles. */
  syntacticRoles?: { catalog: string[]; custom: string[] };
  /** Marking strategies declared in the document (from the legend vocabulary). */
  markingStrategies?: MarkingStrategy[];
}

export interface GrammarAffix {
  id: string;
  form: string;
  type: 'prefix' | 'suffix' | 'infix' | 'circumfix';
  meaning: string;
  appliesTo: string[];
  source: 'manual' | 'lexicon';
  enabled: boolean;
}

export interface GrammarPreviewConfig {
  useLexiconAffixes: boolean;
  subjectEntryId?: string;
  verbEntryId?: string;
  objectEntryId?: string;
}

// ── Engine: inflection by feature slots ──────────────────────────────────────
export type SlotRealization =
  | { kind: 'affix'; position: 'prefix' | 'suffix' | 'infix' | 'circumfix'; form: string }
  | { kind: 'mutation'; ruleId: string }
  | { kind: 'stem'; replace: string }
  | { kind: 'particle'; form: string }
  | { kind: 'tone'; ruleId: string };

export interface AllomorphCondition {
  when: string; // 'prevVowel' | 'afterConsonant' | 'wordInitial' | 'always'
  realization: SlotRealization;
}

export type MorphemeSegment = {
  kind: 'stem' | 'affix' | 'mutation' | 'tone' | 'particle';
  form: string;
  feature?: string;
  position?: 'prefix' | 'suffix' | 'infix' | 'circumfix';
  ruleId?: string;
};

export interface InflectionSlot {
  feature: string; // 'tense' | 'number' | 'person' | 'case' | 'gender' | 'aspect' | ...
  label?: string;
  order: number;
  realization: SlotRealization;
  allomorphs?: AllomorphCondition[];
}

export interface CategoryParadigm {
  category: string; // 'verbo' | 'sustantivo' | 'adjetivo' | ...
  slots: InflectionSlot[];
}

export interface MutationRule {
  id: string;
  name: string;
  pattern: string; // e.g. "b" or regex
  replacement: string; // e.g. "v"
  scope: 'consonant' | 'vowel' | 'tone';
}

export interface LexicalException {
  id: string;
  featureKey: string; // e.g. "tense=past" or "tense=past&number=sg"
  surfaceForm: string; // suppletive form, e.g. "fui"
  note?: string;
}

export interface PhonologyConfig {
    inventory: { consonants: string[]; vowels: string[] };
    phonotactics: {
        syllableStructures: string[]; // ['CVC','CV','CCV']
        maxConsonantClusters: number;
        consonantClusters?: string[];
        vowelClusters?: string[];
    };
}

// ── AST Types (from the grammar engine) ───────────────────────────────────────
import type { ClauseAST } from './services/grammar/engineTypes';

// ── Syntax Canvas Types ──────────────────────────────────────────────────────

export type MorphemeCategory =
    | 'article' | 'determiner' | 'prefix' | 'suffix'
    | 'case' | 'tense' | 'number' | 'gender' | 'mode' | 'custom';

export type NodeType = 'clause' | 'phrase' | 'word' | 'morpheme';

export interface SyntaxNode {
    id: string;
    type: NodeType;
    role: string;             // e.g., 'subject', 'verb', 'object', 'prefix', 'root'
    label: string;            // Visible label, e.g., "Sujeto", "-van"
    
    // Free Canvas Geometry
    x: number;
    y: number;
    
    // Nesting (Dimensions)
    children: SyntaxNode[];
    
    // Lexical Mapping
    lexiconCategory?: string; // "sustantivo", "verbo"
    literalForm?: string;     // If it's a fixed morpheme, e.g., "ka"
    color: string;

    // Engine linkage (morphology breakdown)
    lexeme?: LexiconEntry;
    features?: Record<string, string>;
    morphemes?: MorphemeSegment[];
}

export interface SyntaxConnection {
    id: string;
    fromId: string;
    toId: string;
    connectionType: 'dependency' | 'agreement' | 'movement';
    label?: string;
}

/** A grammar exception registered by the user */
export interface GrammarException {
    id: string;
    ruleDescription: string;   // e.g. "Adj + Sust"
    exceptionPattern: string;  // e.g. "Sust + Adj"
    context: string;           // e.g. "énfasis poético"
    example?: string;
    createdAt: string;
}

/** The full state of the visual syntax canvas */
export interface SyntaxCanvas {
    level: 0 | 1;              // 0 = onboarding, 1 = working canvas
    typologySelected: boolean;
    nodes: SyntaxNode[];
    connections: SyntaxConnection[];
    exceptions: GrammarException[];
    lastPreviewResult?: string;
}

// ── Grammar Manifest ─────────────────────────────────────────────────────────

export interface GrammarManifest {
    meta: { author: string; version: string; sourceFormat: 'json' | 'markdown'; lastUpdated: string };
    phonology?: PhonologyConfig;
    typology: { wordOrder: string; alignment: string; morphology: string; headDirection: string };
    roles: SyntacticRole[];
    strategies: MorphosyntacticStrategy[];
    paradigms: CategoryParadigm[];
    mutationRules: MutationRule[];
    affixInventory?: GrammarAffix[];
    exceptions: GrammarException[];
    clauseTree?: ClauseAST;
    syntaxCanvas?: SyntaxCanvas;
    preview?: GrammarPreviewConfig;
    notes: string[];
    ui?: { showTone: boolean };
    typologicalProfile?: TypologicalProfile;
    /** Capa Pragmática — motor de sintaxis basado en intención de oración */
    pragmaticEngine?: PragmaticEngineState;
}

import type { PragmaticBlockId, PragmaticSlotState } from './services/grammar/pragmaticTypes';

/** Estado del motor pragmático guardado en el manifiesto */
export interface PragmaticEngineState {
    /** Tipología activa del idioma */
    typology: 'flexive' | 'agglutinative' | 'isolating';
    /** Tipo de oración seleccionado en el constructor */
    activeClauseType: string | null;
    /** Slots llenados del constructor */
    slots: PragmaticSlotState[];
}

// ── Loxar Bridge ─────────────────────────────────────────────────────────────

export interface LoxarBridge {
    // File system and app control
    getAppVersion: () => Promise<string>;
    getDirectoryPath: () => Promise<string | null>;
    exportFile: (options: { filePath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
    saveBackup: (options: { backupPath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
    listBackups: (backupDir: string) => Promise<string[]>;
    readBackupFile: (filePath: string) => Promise<string>;
    compileFont: (options: { profile: NeographyProfile, outputPath: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
    quitApp: () => void;
    openWidget: () => void;
    send: (channel: string, data: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => (() => void);
}
