// Centralized, typed prompt builders for all AI generation tasks.
// Replaces the scattered hardcoded prompts in geminiService.ts so they are
// maintainable and so generation modes produce *distinct* instructions
// (previously multiple modes were only joined as text: `${modes.join(', ')}`).

import { GenerativeProfile, GenerationMode, LexiconEntry, MissingWord, NewLexiconEntry } from '../types';

/** Distinct instruction block per generation mode. This is what makes
 *  combining modes meaningful instead of cosmetic. */
export const buildModeInstructions = (modes: GenerationMode[], profile: GenerativeProfile, fullLexicon: LexiconEntry[] = []): string => {
    if (modes.length === 0) {
        return 'Aplica el MODO GENERATIVO por defecto (crea una palabra nueva desde cero siguiendo el Perfil Generativo).';
    }
    const parts = modes.map((m): string => {
        switch (m) {
            case 'generative':
                return 'MODO GENERATIVO: crea una palabra nueva desde cero siguiendo estrictamente las reglas de fonología y estructura silábica del Perfil Generativo (consonantes, vocales y estructuras silábicas).';
            case 'etymological': {
                if (fullLexicon.length > 0) {
                    const sample = fullLexicon
                        .slice(0, 40)
                        .map(l => `${l.Significado.join('/')}=${l.Raíz}`)
                        .join(', ');
                    return `MODO ETIMOLÓGICO: inspírate en raíces ya presentes en el léxico del usuario para mantener coherencia etimológica. Muestra del léxico: ${sample}.`;
                }
                return 'MODO ETIMOLÓGICO: inspírate en raíces de palabras relacionadas (del léxico del usuario si las hay, o de idiomas naturales plausibles) para mantener coherencia etimológica.';
            }
            case 'derivational': {
                const affixes = (profile.derivationalAffixes || [])
                    .map(a => `${a.type} "${a.affix}" = ${a.meaning}`)
                    .join('; ');
                const affixHint = affixes
                    ? `Aplica los afijos definidos en el Perfil Generativo: ${affixes}.`
                    : 'No hay afijos definidos; usa derivación morfológica plausible (prefijos/sufijos) coherente con la fonología.';
                return `MODO DERIVACIONAL: construye la palabra aplicando derivación morfológica. ${affixHint}`;
            }
            default:
                return '';
        }
    });
    return `Aplica los siguientes modos (combínalos según aplique): ${parts.join(' ')}`;
};

export const buildRootLexemePrompt = (
    significado: string,
    categoria: string,
    profile: GenerativeProfile,
    modes: GenerationMode[],
    fullLexicon: LexiconEntry[] = []
): string => {
    const modeInstructions = buildModeInstructions(modes, profile, fullLexicon);
    return `Genera una raíz y léxema para "${significado}" (${categoria}). ${modeInstructions} Toma en cuenta la fonología: ${JSON.stringify(profile)}. Responde SOLO JSON con el siguiente esquema estricto: {"raiz": "...", "lexema": "..."}.`;
};

export const buildCompleteEntryPrompt = (partialEntry: any, profile: GenerativeProfile): string =>
    `Completa esta entrada de léxico: ${JSON.stringify(partialEntry)}. Basado en este perfil: ${JSON.stringify(profile)}. Devuelve un JSON válido.`;

export const buildConlangAgentPrompt = (message: string): string =>
    `Eres un experto lingüista y asistente de creación de idiomas (conlangs). Mensaje del usuario: "${message}". Responde en JSON válido con el formato {"reply": "..."}.`;

export const buildBatchDetermineCategoryPrompt = (chunk: { id: string; significado: string }[]): string =>
    `Determina la categoría gramatical general (sustantivo, verbo, adjetivo, pronombre, etc) para las siguientes palabras: ${JSON.stringify(chunk)}. Devuelve un array JSON de la forma [{"id": "...", "categoria": "..."}].`;

export const buildCategorizeWordsPrompt = (words: string[]): string =>
    `Categoriza estas palabras en español: ${JSON.stringify(words)}. Devuelve un array JSON de la forma [{"Significado": "...", "Categoría": "..."}].`;

export const buildGenerateBatchWordsPrompt = (chunk: MissingWord[], profile: GenerativeProfile): string =>
    `Actúa como creador del idioma. Genera una lista de palabras para: ${JSON.stringify(chunk)}. Basado en la fonología: ${JSON.stringify(profile)}. Devuelve un array JSON completo de la forma [{"Raíz": "...", "Léxema": ["..."], "Categoría": "...", "Significado": ["..."]}].`;

export const buildCorrectSignificadoPrompt = (significado: string): string =>
    `Corrige la ortografía y redacción en español para esta entrada de diccionario: "${significado}". Devuelve JSON con la forma {"corrected_significado": "..."}.`;

export const buildDetermineSingleCategoryPrompt = (significado: string): string =>
    `Determina la categoría gramatical en español (sustantivo, verbo, adjetivo, adverbio, pronombre, preposición, conjunción, afijo, sufijo, prefijo) para el siguiente significado: "${significado}". Responde SOLO con un string JSON de la forma {"categoria": "..."} con la categoría en minúscula. Si no estás seguro, pon "sustantivo" o "desconocida".`;

export const buildAnalyzePhonemesPrompt = (sample: LexiconEntry[]): string =>
    `Analiza los patrones fonémicos del siguiente idioma imaginario: ${JSON.stringify(sample)}. Devuelve un JSON con: {"vowels": [], "consonants": [], "syllableStructures": [], "consonantClusters": [], "vowelClusters": []}`;

export const buildGenerateLanguageSamplePrompt = (profile: GenerativeProfile, sample: { r: string; s: string }[]): string =>
    `Actúa como nativo de este idioma ("${JSON.stringify(profile)}"). Usando el léxico base proporcionado: ${JSON.stringify(sample)}, escribe un breve párrafo en el idioma original, seguido de su traducción al pie (solo texto y traducción). Devuelve un JSON con el campo "report".`;
