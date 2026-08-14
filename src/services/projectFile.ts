import { LexiconEntry, GenerativeProfile, NeographyProfile, InflectionProfile, LexiconData, GrammarManifest } from '../types';
import { CorpusEntry } from '../types';

export type LoxarProject = {
  version: string;
  conlangName: string;
  mainLanguage: string;
  updatedAt: string;
  lexicons: Record<string, LexiconData>;
  grammar?: GrammarManifest | null;
  generativeProfile?: GenerativeProfile | null;
  neographyProfile?: NeographyProfile | null;
  inflectionProfile?: InflectionProfile | null;
  corpus?: CorpusEntry[];
  customFunctions?: string[];
  settings?: {
    themeId?: string;
    soundsEnabled?: boolean;
    autoBackupEnabled?: boolean;
    autoBackupMinutes?: number;
  };
  session?: {
    activeTab?: string;
    activeProfile?: string | null;
    tourCompleted?: boolean;
  };
};

export const LOXAR_PROJECT_VERSION = '0.1.0';

export const createEmptyProject = (conlangName = 'Léxico sin nombre', mainLanguage = 'Español'): LoxarProject => ({
  version: LOXAR_PROJECT_VERSION,
  conlangName,
  mainLanguage,
  updatedAt: new Date().toISOString(),
  lexicons: {},
  grammar: null,
  generativeProfile: null,
  neographyProfile: null,
  inflectionProfile: null,
  corpus: [],
  customFunctions: [],
  settings: {},
  session: {},
});

export const projectToJson = (project: LoxarProject): string => JSON.stringify(project, null, 2);
export const projectFromJson = (raw: string): LoxarProject | null => {
  try {
    return JSON.parse(raw) as LoxarProject;
  } catch {
    return null;
  }
};
