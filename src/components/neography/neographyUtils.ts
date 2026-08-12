
import { Glyph, NeographyProfile } from '../../types';

export const PUA_START = 0xE000; // Start of Private Use Area in Unicode
export const PUA_END = 0xF8FF;

/**
 * Finds the next available PUA unicode point in the profile.
 * Returns a hex string (e.g., "E005").
 */
export const getNextAvailablePUA = (glyphs: Glyph[]): string => {
    const usedCodes = new Set<number>();

    glyphs.forEach(g => {
        if (g.unicode) {
            const code = parseInt(g.unicode, 16);
            if (!isNaN(code) && code >= PUA_START && code <= PUA_END) {
                usedCodes.add(code);
            }
        }
    });

    let current = PUA_START;
    while (usedCodes.has(current) && current <= PUA_END) {
        current++;
    }

    if (current > PUA_END) {
        console.warn("PUA Limit Reached! Cannot assign new private unicode.");
        return "";
    }

    return current.toString(16).toUpperCase();
};

/**
 * Ensures all glyphs in a profile have a valid Unicode assignment.
 * Useful for migrating old profiles.
 */
export const ensureUnicodeAssignments = (profile: NeographyProfile): NeographyProfile => {
    let modified = false;
    const newGlyphs = [...profile.glyphs];

    // First pass: collect used
    const usedCodes = new Set<number>();
    newGlyphs.forEach(g => {
        if (g.unicode) {
            const code = parseInt(g.unicode, 16);
            if (!isNaN(code)) usedCodes.add(code);
        }
    });

    let nextCode = PUA_START;

    // Second pass: assign empty
    newGlyphs.forEach((g, index) => {
        if (!g.unicode) {
            // Find next free
            while (usedCodes.has(nextCode)) {
                nextCode++;
            }
            if (nextCode <= PUA_END) {
                newGlyphs[index] = { ...g, unicode: nextCode.toString(16).toUpperCase() };
                usedCodes.add(nextCode);
                modified = true;
            }
        }
    });

    if (!modified) return profile;
    return { ...profile, glyphs: newGlyphs };
};

/**
 * Transforms an SVG path string by applying a function to each coordinate pair.
 */
export const transformPath = (pathData: string, transform: (x: number, y: number) => [number, number]): string => {
    if (!pathData) return "";

    // Regex to find numbers in SVG path (handles decimals and negatives)
    return pathData.replace(/(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)|(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (match, x1, y1, x2, y2) => {
        const x = parseFloat(x1 || x2);
        const y = parseFloat(y1 || y2);
        if (isNaN(x) || isNaN(y)) return match;
        const [nx, ny] = transform(x, y);
        // Preserve original separators (comma or space)
        return x1 ? `${nx.toFixed(2)},${ny.toFixed(2)}` : `${nx.toFixed(2)} ${ny.toFixed(2)}`;
    });
};

export const flipPathHorizontal = (pathData: string, width = 250): string => 
    transformPath(pathData, (x, y) => [width - x, y]);

export const flipPathVertical = (pathData: string, height = 250): string => 
    transformPath(pathData, (x, y) => [x, height - y]);

export const rotatePath90 = (pathData: string, centerX = 125, centerY = 125): string => 
    transformPath(pathData, (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        return [-dy + centerX, dx + centerY]; // 90 deg CW
    });
