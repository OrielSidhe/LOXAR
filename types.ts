

export interface LexiconEntry {
  ID: string; // Internal ID for UI and keying
  externalID?: string; // User-provided ID from import
  Raíz: string;
  Léxema: string[];
  Categoría: string;
  Significado: string[];
  extraData: { [key:string]: any };
}

export type NewLexiconEntry = Omit<LexiconEntry, 'ID'>;

export type LexiconFormSubmitData = {
  Raíz: string;
  Léxema: string;
  Categoría: string;
  Significado: string;
  extraData: { [key:string]: any };
};

export type LexiconFilter = 'all' | 'complete' | 'incomplete' | 'ai-generated';

export interface LexiconMetadata {
    conlangName: string;
    mainLanguage: string;
}

export type MissingWord = {
    Significado: string;
    Categoría: string;
};

export interface ImportResult {
    success: boolean;
    error?: string;
}

export interface DerivationalAffix {
    affix: string;
    type: 'prefijo' | 'sufijo' | 'infijo';
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
  svgPathMain: string;
  svgPathUpper?: string;
  svgPathLower?: string;
  viewBox: { width: number; height: number };
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
  };
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

export interface ElectronAPI {
    // Gemini services
    completeEntry: (data: { partialEntry: any, lexiconSample: LexiconEntry[], profile: GenerativeProfile }) => Promise<any>;
    generateRootAndLexeme: (data: { significado: string, categoria: string, lexiconSample: LexiconEntry[], profile: GenerativeProfile, modes: GenerationMode[], fullLexicon: LexiconEntry[] }) => Promise<{ raiz: string; lexema: string }>;
    categorizeWords: (words: string[]) => Promise<MissingWord[]>;
    generateBatchWords: (data: { words: MissingWord[], lexiconSample: LexiconEntry[], profile: GenerativeProfile }) => Promise<Omit<NewLexiconEntry, 'extraData' | 'externalID'>[]>;
    batchDetermineCategory: (entries: {id: string, significado: string}[]) => Promise<{id: string, categoria: string}[]>;
    correctSignificado: (significado: string) => Promise<string>;
    cleanseJson: (text: string) => Promise<string>;
    
    // Non-gemini services
    analyzePhonemes: (lexicon: LexiconEntry[]) => Promise<{ vowels: string[], consonants: string[], syllableStructures: string[], consonantClusters: string[], vowelClusters: string[] }>;

    // File system and app control
    getDirectoryPath: () => Promise<string | null>;
    exportFile: (options: { filePath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
    saveBackup: (options: { backupPath: string; content: string }) => Promise<{ success: boolean; error?: string }>;
    listBackups: (backupDir: string) => Promise<string[]>;
    readBackupFile: (filePath: string) => Promise<string>;
    quitApp: () => void;
}

export interface GrammarManifest {
    meta: {
        author: string;
        version: string;
        sourceFormat: 'pdf' | 'txt' | 'md' | 'json' | 'other';
        lastUpdated: string;
    };
    typology: {
        wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS' | 'Free';
        alignment: 'Nominative-Accusative' | 'Ergative-Absolutive' | 'Split' | 'Austronesian' | 'Other';
        morphology: 'Isolating' | 'Agglutinative' | 'Fusional' | 'Polysynthetic' | 'Templatic';
        headDirection: 'Head-Initial' | 'Head-Final';
    };
    strategies: MorphosyntacticStrategy[];
    roles: SyntacticRole[];
    notes: string[]; // Unstructured notes for context
}

export interface SyntacticRole {
    id: string; // e.g., "subject", "direct_object", "possessor"
    name: string;
    description?: string;
}

export type StrategyType = 'position' | 'affix' | 'clitic' | 'tone' | 'mutation' | 'particle' | 'auxiliary';

export interface MorphosyntacticStrategy {
    id: string;
    name: string; // e.g., "Nominative Case Suffix", "Pre-verbal Subject Position"
    appliesTo: string[]; // Role IDs this strategy marks (e.g., ["subject"])
    type: StrategyType;

    // For Position
    positionRule?: {
        anchor: 'verb' | 'noun' | 'sentence_start' | 'sentence_end';
        relation: 'before' | 'after';
        distance: number; // 1 = immediately
    };

    // For Affixes/Clitics
    affixRule?: {
        position: 'prefix' | 'suffix' | 'infix' | 'circumfix';
        form: string; // e.g., "-o", "na-"
        allomorphs?: { condition: string; form: string }[];
    };

    // For Mutation/Tone
    transformationRule?: {
        pattern: string; // Regex or description
        replacement: string;
    };
}
