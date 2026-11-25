import { describe, expect, it } from 'vitest';

import type { GenerativeProfile, LexiconEntry } from '../../types';
import type { EntryEditorFormPayload } from '../../utils/entryEditorModel';
import {
    buildCompleteEntryPrompt,
    buildModeInstructions,
    buildRootLexemePrompt,
} from '../prompts';

const profile: GenerativeProfile = {
    consonants: ['k', 'l', 'm'],
    vowels: ['a', 'i'],
    syllableStructures: ['CV'],
    consonantClusters: [],
    vowelClusters: [],
    sampleText: '',
    grammarNotes: '',
    derivationalAffixes: [{ type: 'sufijo', affix: '-en', meaning: 'plural' }],
};

const partialEntry: EntryEditorFormPayload = {
    Raíz: 'kal',
    Léxema: 'kala',
    Categoría: 'sustantivo',
    Significado: 'casa / hogar',
};

const lexicon: LexiconEntry[] = [
    {
        ID: '1',
        Raíz: 'lum',
        Léxema: ['luma'],
        Categoría: 'sustantivo',
        Significado: ['luz'],
        extraData: {},
    },
];

describe('buildCompleteEntryPrompt', () => {
    it('serializa el payload tipado y el perfil en la instrucción', () => {
        const prompt = buildCompleteEntryPrompt(partialEntry, profile);

        expect(prompt).toContain(JSON.stringify(partialEntry));
        expect(prompt).toContain('"Significado":"casa / hogar"');
        expect(prompt).toContain(JSON.stringify(profile));
        expect(prompt).toContain('Devuelve un JSON válido.');
    });
});

describe('buildModeInstructions', () => {
    it('usa el modo generativo por defecto cuando no hay modos', () => {
        expect(buildModeInstructions([], profile)).toContain('MODO GENERATIVO por defecto');
    });

    it('inyecta los afijos del perfil en el modo derivacional', () => {
        const text = buildModeInstructions(['derivational'], profile);

        expect(text).toContain('MODO DERIVACIONAL');
        expect(text).toContain('sufijo "-en" = plural');
    });

    it('usa el léxico como muestra en el modo etimológico', () => {
        const text = buildModeInstructions(['etymological'], profile, lexicon);

        expect(text).toContain('MODO ETIMOLÓGICO');
        expect(text).toContain('luz=lum');
    });

    it('combina dos modos en una sola instrucción', () => {
        const text = buildModeInstructions(['generative', 'derivational'], profile);

        expect(text).toContain('MODO GENERATIVO:');
        expect(text).toContain('MODO DERIVACIONAL:');
    });
});

describe('buildRootLexemePrompt', () => {
    it('incluye significado, categoría, modos y el esquema de respuesta', () => {
        const prompt = buildRootLexemePrompt('casa', 'sustantivo', profile, ['generative']);

        expect(prompt).toContain('casa');
        expect(prompt).toContain('sustantivo');
        expect(prompt).toContain('MODO GENERATIVO:');
        expect(prompt).toContain('{"raiz": "...", "lexema": "..."}');
    });
});
