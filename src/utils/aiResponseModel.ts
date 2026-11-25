/** Pure helpers for reading loosely shaped JSON returned by AI providers. */

/** Runtime guard for provider JSON objects with string keys and untyped values. */
const isStringKeyedRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Normalize accents and case so 'Léxema' and 'lexema' resolve to the same key. */
export const normalizeResponseKey = (key: string): string =>
    key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Find the first key matching any of the requested names (accent/case insensitive).
 * Arrays are flattened with ', '; other values keep the legacy `String(val || '')`
 * behavior so falsy values still yield an empty string.
 */
export const getNormalizedProp = (obj: unknown, keys: string[]): string => {
    if (!isStringKeyedRecord(obj)) return '';
    for (const key of keys) {
        const normalizedKey = normalizeResponseKey(key);
        for (const objKey of Object.keys(obj)) {
            if (normalizedKey !== normalizeResponseKey(objKey)) continue;
            const val = obj[objKey];
            if (Array.isArray(val)) return val.join(', ');
            return String(val || '');
        }
    }
    return '';
};
