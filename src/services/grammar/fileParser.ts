/**
 * fileParser.ts — Universal file format reader for the Grammar Importer.
 *
 * Format audit (Gauntlet E5):
 *  - .txt, .md → plain text via FileReader (UTF-8)
 *  - .docx → mammoth (text extraction, preserves paragraph structure)
 *  - .csv → papaparse (flattened to plain text, one field per line for grammar context)
 *  - .xlsx → xlsx (concatenates all sheets' cells into plain text)
 *  - .doc → REJECTED with clear error message (legacy binary format not supported)
 *  - Any other → clear unsupported-format error
 */

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export type ParseResult =
  | { ok: true; text: string; sourceFormat: string }
  | { ok: false; error: string };

/**
 * Read a File as text, dispatching by extension.
 * Returns plain text suitable for inductFromText, or an error object.
 */
export async function parseGrammarFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'txt':
    case 'md':
      return await readAsText(file);

    case 'docx': {
      // mammoth extracts text from .docx, preserving paragraphs.
      // We convert to string to keep it compatible with FileReader path.
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        if (!text || text.trim().length === 0) {
          return { ok: false, error: 'El archivo .docx no contiene texto extraíble.' };
        }
        return { ok: true, text, sourceFormat: 'docx' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Error al leer .docx: ${msg}` };
      }
    }

    case 'doc':
      // Legacy .doc (binary) is NOT supported. Clear error.
      return {
        ok: false,
        error: 'El formato .doc (Word 97-2003) no es soportado. Usa .docx o copia el texto a un archivo .txt/.md.',
      };

    case 'csv': {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const csvText = reader.result as string;
          const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
          });
          if (parsed.errors && parsed.errors.length > 0) {
            resolve({
              ok: false,
              error: `Error al parsear CSV: ${parsed.errors.map(e => e.message).join(', ')}`,
            });
            return;
          }
          // Flatten CSV rows into plain text — header row + each cell on its own line
          const rows = parsed.data as Record<string, string>[];
          const lines: string[] = [];
          lines.push(`[CSV importado: ${file.name}]`);
          for (const row of rows) {
            for (const [key, val] of Object.entries(row)) {
              if (val && val.trim()) {
                lines.push(`${key}: ${val.trim()}`);
              }
            }
            lines.push(''); // blank line between rows
          }
          resolve({ ok: true, text: lines.join('\n'), sourceFormat: 'csv' });
        };
        reader.onerror = () => {
          resolve({ ok: false, error: 'Error al leer el archivo CSV.' });
        };
        reader.readAsText(file);
      });
    }

    case 'xlsx': {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const arrayBuffer = reader.result as ArrayBuffer;
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const lines: string[] = [];
            lines.push(`[XLSX importado: ${file.name}]`);
            for (const sheetName of workbook.SheetNames) {
              const sheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
              lines.push(`=== Hoja: ${sheetName} ===`);
              for (const row of json as unknown[][]) {
                lines.push(row.map(cell => String(cell || '')).filter(c => c).join('\t'));
              }
              lines.push('');
            }
            resolve({ ok: true, text: lines.join('\n'), sourceFormat: 'xlsx' });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            resolve({ ok: false, error: `Error al leer XLSX: ${msg}` });
          }
        };
        reader.onerror = () => {
          resolve({ ok: false, error: 'Error al leer el archivo XLSX.' });
        };
        reader.readAsArrayBuffer(file);
      });
    }

    default:
      return {
        ok: false,
        error: `Formato no soportado: .${ext || 'desconocido'}. Formatos soportados: .txt, .md, .docx, .csv, .xlsx. Nota: .doc no es soportado (usa .docx).`,
      };
  }
}

async function readAsText(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      resolve({ ok: true, text, sourceFormat: file.name.split('.').pop()?.toLowerCase() || 'txt' });
    };
    reader.onerror = () => {
      resolve({ ok: false, error: 'Error al leer el archivo.' });
    };
    reader.readAsText(file);
  });
}
