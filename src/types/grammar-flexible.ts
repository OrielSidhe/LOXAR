import { GrammarManifest } from '../types';

export interface FlexibleInflectionRule {
    name: string;
    pattern: string;
    replacement: string;
    conditions?: string[];
}

export interface FlexibleWordOrderRule {
    name: string;
    order: string;
    description?: string;
}

export interface FlexibleGrammar {
    id: string;
    name: string;
    storageMode: 'raw' | 'structured' | 'hybrid';
    rawText: string;
    structured?: {
        manifest: GrammarManifest;
        confidence: number;
        uninterpretedSections: string[];
    };
    computationalRules: {
        inflection: FlexibleInflectionRule[];
        wordOrder: FlexibleWordOrderRule[];
    };
    lastModified: number;
}
