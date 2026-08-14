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
            const { valid, rejected } = splitRows(rawData);
            const rejectionMessage = buildRejectionMessage(rejected);
            if (rejectionMessage) {
                warnings.push(rejectionMessage);
            }
            const headers = Array.from(new Set([...valid, ...rejected].flatMap(row => Object.keys(row))));
            if (valid.length === 0) {
                return {
                    successfulData: [],
                    errorContent: fileContent,
                    error: "No se detectaron entradas de léxico válidas en el JSON. Revisá el formato o eliminá filas narrativas.",
                    headers,
                    warnings,
                };
            }
            return {
                successfulData: valid,
                errorContent: rejected.length ? JSON.stringify(rejected) : null,
                error: rejected.length ? "Se ignoraron filas narrativas o inválidas dentro del JSON." : null,
                headers,
                warnings,
            };
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
    const narrativeRows: any[] = [];

    bodyRows.forEach((rowArray, index) => {
        if (rowArray.length !== headers.length) {
             warnings.push(`Row ${index + 2}: Found ${rowArray.length} columns, expected ${headers.length}. This row needs correction.`);
             errorRows.push(rowArray.join(',')); // Keep original separator for easier editing
             return;
        }

        const obj: { [key: string]: string } = {};
        headers.forEach((header, i) => {
            obj[header] = rowArray[i];
        });

        if (!isLikelyLexiconRow(obj)) {
            narrativeRows.push({ ...obj, _rejectIndex: index + 2 });
            return;
        }

        successfulData.push(obj);
    });

    const rejectionMessage = buildRejectionMessage(narrativeRows);
    if (rejectionMessage) {
        warnings.push(rejectionMessage);
    }

    if (errorRows.length > 0 || narrativeRows.length > 0) {
        const combined = [...errorRows, ...narrativeRows.map(row => JSON.stringify(row))];
        return {
            successfulData,
            errorContent: combined.join('\n'),
            error: "Algunas filas fueron excluidas por formato inválido o por parecer texto narrativo. Corregilas abajo o importá solo las entradas válidas.",
            headers,
            warnings,
        };
    }

    return { successfulData, errorContent: null, error: null, headers, warnings };
}


const LEXICON_FIELD_KEYS = ['Léxema', 'Raíz', 'Categoría', 'Significado', 'externalID'];

const hasLexiconSignal = (row: any): boolean => {
    if (!row || typeof row !== 'object') return false;
    return LEXICON_FIELD_KEYS.some(key => {
        const value = row[key];
        return typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : false;
    });
};

const looksLikeNarrative = (row: any): boolean => {
    const rawMeaning = row?.Significado;
    if (typeof rawMeaning === 'string') {
        const meaning = rawMeaning.trim();
        if (meaning.length > 180) return true;
        if (meaning.includes('\n') || meaning.includes('\r')) return true;
        if (/[.!?]/.test(meaning) && meaning.split(/[.!?]/).length > 2) return true;
    }
    return false;
};

const isLikelyLexiconRow = (row: any): boolean => {
    if (!hasLexiconSignal(row)) return false;
    return !looksLikeNarrative(row);
};

const splitRows = (rows: any[]) => {
    const valid: any[] = [];
    const rejected: any[] = [];
    rows.forEach((row, index) => {
        if (isLikelyLexiconRow(row)) {
            valid.push(row);
        } else {
            rejected.push({ ...row, _rejectIndex: index + 2 });
        }
    });
    return { valid, rejected };
};

const buildRejectionMessage = (rejected: any[]): string | null => {
    if (!rejected.length) return null;
    const samples = rejected.slice(0, 5).map(row => {
        const meaning = typeof row.Significado === 'string' ? row.Significado.trim() : JSON.stringify(row.Significado ?? '');
        return `#${row._rejectIndex}: ${meaning}`;
    }).join('\n');
    return `Se ignoraron ${rejected.length} filas que parecen texto narrativo o fuera de formato. Ejemplo:\n${samples}`;
};

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