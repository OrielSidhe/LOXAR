import Papa from 'papaparse';
import { NewLexiconEntry } from '../types';
import { cleanseJson } from './geminiService';

export interface ParseResult {
    successfulData: any[];
    errorContent: string | null;
    error: string | null;
    headers: string[];
    warnings: string[];
    isLexiconBackup?: boolean;
    backupData?: any;
}

export async function parseFileContent(fileContent: string): Promise<ParseResult> {
    const trimmed = fileContent.trim().replace(/^\uFEFF/, '');
    if (!trimmed) {
        return { successfulData: [], errorContent: null, error: null, headers: [], warnings: [] };
    }

    // Check if it's a full backup
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.entries && parsed.metadata) {
            return { successfulData: [], errorContent: null, error: null, headers: [], warnings: [], isLexiconBackup: true, backupData: parsed };
        }
    } catch (e) { /* not a JSON backup */ }

    const warnings: string[] = [];
    const isLikelyJson = trimmed.startsWith('{') || trimmed.startsWith('[');

    // --- JSON Parsing Path ---
    if (isLikelyJson) {
        try {
            const parsed = JSON.parse(trimmed);
            const rawData = Array.isArray(parsed) ? parsed : [parsed];
            const headers = Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
            return { successfulData: rawData, errorContent: null, error: null, headers, warnings };
        } catch (jsonError) {
            warnings.push("Initial JSON parsing failed. Attempting to repair with AI...");
            try {
                const cleanedJsonString = await cleanseJson(trimmed);
                const parsed = JSON.parse(cleanedJsonString);
                const rawData = Array.isArray(parsed) ? parsed : [parsed];
                const headers = Array.from(new Set(rawData.flatMap(row => Object.keys(row))));
                warnings.push("AI successfully repaired the JSON structure.");
                return { successfulData: rawData, errorContent: null, error: null, headers, warnings };
            } catch (cleanseError) {
                return {
                    successfulData: [],
                    errorContent: fileContent,
                    error: "The file appears to be broken JSON, and the AI could not repair it. Please fix the syntax errors below.",
                    headers: [],
                    warnings
                };
            }
        }
    }

    // --- CSV Parsing Path ---
    const result = Papa.parse<string[]>(trimmed, { skipEmptyLines: true });

    if (result.errors.length > 0 && result.data.length === 0) {
        return {
            successfulData: [],
            errorContent: fileContent,
            error: `Could not parse CSV file. Papaparse reported: ${result.errors[0].message}`,
            headers: [],
            warnings,
        };
    }

    if (result.data.length < 2) { // Header-only or empty file
        return { successfulData: [], errorContent: null, error: null, headers: result.data[0] || [], warnings };
    }

    const headers = result.data[0].map(h => h.trim());
    const bodyRows = result.data.slice(1);

    const successfulData: any[] = [];
    const errorRows: string[] = [];

    bodyRows.forEach((rowArray, index) => {
        if (rowArray.length !== headers.length) {
             warnings.push(`Row ${index + 2}: Found ${rowArray.length} columns, expected ${headers.length}. This row needs correction.`);
             errorRows.push(rowArray.join(',')); // Keep original separator for easier editing
        } else {
            const obj: { [key: string]: string } = {};
            headers.forEach((header, i) => {
                obj[header] = rowArray[i];
            });
            successfulData.push(obj);
        }
    });

    if (errorRows.length > 0) {
        return {
            successfulData,
            errorContent: errorRows.join('\n'),
            error: "Some rows in your CSV have an incorrect number of columns. Please fix them below or import only the valid entries.",
            headers,
            warnings,
        };
    }

    return { successfulData, errorContent: null, error: null, headers, warnings };
}


export function inferRootFromLexeme(lex: string | null | undefined): string {
    if (typeof lex === 'string' && lex) {
        // Infer from lexeme: take first 4 chars, remove non-letters, or return empty
        return (lex.substring(0, 4).replace(/[^a-zA-Z]/g, '') || '').toUpperCase();
    }
    // Return empty string if no lexeme is provided
    return '';
}

export function processMappedData(rawData: any[], mapping: { [key: string]: keyof NewLexiconEntry | 'extra' | '' }): NewLexiconEntry[] {
    return rawData.map(row => {
        const newEntry: NewLexiconEntry = {
            Raíz: '',
            Léxema: [],
            Categoría: '', // Start empty, will default later
            Significado: [],
            extraData: {},
            externalID: undefined,
        };

        const mappedHeaders = new Set<string>();

        // Process mapped core fields
        for (const header in mapping) {
            const field = mapping[header];
            if (field && field !== 'extra' && row[header] !== undefined && row[header] !== null) {
                 mappedHeaders.add(header);
                 const value = String(row[header]).trim();

                 if (value) { // Only process non-empty values
                     if (field === 'Léxema' || field === 'Significado') {
                         newEntry[field] = value.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
                     } else if (field === 'Raíz' || field === 'Categoría' || field === 'externalID') {
                         newEntry[field] = value;
                     }
                 }
            }
        }

        // Process extra data for unmapped columns
        for (const header in row) {
             if (!mappedHeaders.has(header)) {
                 const extraValue = row[header];
                 // Add to extraData only if it's not null/undefined or an empty string
                 if (extraValue !== undefined && extraValue !== null && String(extraValue).trim() !== '') {
                    newEntry.extraData[header] = extraValue;
                 }
             }
        }

        // Post-processing and validation based on specifications

        // 1. If 'Categoría' is still empty, set to 'desconocida'
        if (!newEntry.Categoría) {
            newEntry.Categoría = 'desconocida';
        }

        // 2. If 'Raíz' is empty, infer it ONLY from the Léxema
        if (!newEntry.Raíz) {
            newEntry.Raíz = inferRootFromLexeme(newEntry.Léxema[0]);
        }

        return newEntry;
    }).filter(e => e.Significado.length > 0 && e.Significado[0].trim() !== ''); // 3. Ensure 'Significado' is present
}