/**
 * lexiconCompareFile.ts
 * ────────────────────
 * FASE CMP del gauntlet v3.14: carga el "otro léxico" de comparación desde un
 * archivo suelto (JSON de backup, JSON de filas o CSV) sin pasar por el flujo
 * de importación con mapeo manual.
 *
 * El mapeo es automático por nombres de columna conocidos (español e inglés);
 * las columnas no reconocidas viajan a `extraData` vía `processMappedData`.
 */
import { parseFileContent, processMappedData } from '../services/parser';
import type { LexiconRow } from '../services/parser';
import type { LexiconEntry, NewLexiconEntry } from '../types';

type Mapping = { [header: string]: keyof NewLexiconEntry | 'extra' | '' };

/** Quita diacríticos y pasa a minúsculas para comparar nombres de columna. */
export const normalizeHeader = (header: string): string =>
  header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const HEADER_ALIASES: Record<string, keyof NewLexiconEntry> = {
  raiz: 'Raíz',
  root: 'Raíz',
  lexema: 'Léxema',
  lexeme: 'Léxema',
  lemma: 'Léxema',
  word: 'Léxema',
  forma: 'Léxema',
  categoria: 'Categoría',
  category: 'Categoría',
  pos: 'Categoría',
  significado: 'Significado',
  meaning: 'Significado',
  gloss: 'Significado',
  traduccion: 'Significado',
  translation: 'Significado',
  definicion: 'Significado',
  definition: 'Significado',
  externalid: 'externalID',
  external_id: 'externalID',
  external: 'externalID',
  id: 'externalID',
};

/** Construye el mapeo automático columna → campo del léxico. */
export const buildAutoMapping = (headers: string[]): Mapping => {
  const mapping: Mapping = {};
  for (const header of headers) {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field && !(header in mapping)) mapping[header] = field;
  }
  return mapping;
};

/** Convierte filas ya parseadas (objetos con keys = headers) en entradas. */
export const entriesFromRows = (rows: LexiconRow[], headers: string[]): LexiconEntry[] => {
  const mapping = buildAutoMapping(headers);
  return processMappedData(rows, mapping).map((entry, index) => ({
    ...entry,
    ID: entry.externalID || `cmp-${index + 1}`,
  }));
};

/**
 * Lee un archivo de comparación y devuelve sus entradas.
 * Acepta el backup completo de LOXAR (`{ entries, metadata }`), un array/objetos
 * JSON o un CSV con cabecera.
 */
export const parseLexiconCompareFile = async (content: string): Promise<LexiconEntry[]> => {
  const result = await parseFileContent(content);

  if (result.isLexiconBackup && result.backupData) {
    const entries = Array.isArray(result.backupData.entries) ? result.backupData.entries : [];
    return entries.map((entry: Partial<LexiconEntry>, index: number) => ({
      Raíz: '',
      Léxema: [],
      Categoría: '',
      Significado: [],
      extraData: {},
      ...entry,
      ID: entry.ID || `cmp-${index + 1}`,
    }));
  }

  if (result.successfulData.length === 0) {
    throw new Error(result.error || 'No se encontraron entradas de léxico en el archivo.');
  }

  return entriesFromRows(result.successfulData, result.headers);
};
