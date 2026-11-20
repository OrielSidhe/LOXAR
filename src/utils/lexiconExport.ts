/**
 * lexiconExport.ts
 * ────────────────
 * Núcleo puro de la exportación del léxico (FASE EX del gauntlet v3.14).
 *
 * Antes `useProjectOperations.handleFileExport` construía el contenido inline y
 * solo sabía `json`/`csv`; el TXT existía pero sin cabecera y el dropdown de
 * `FileControls` estaba hardcodeado a CSV/JSON. Aquí vive toda la generación de
 * contenido, sin React ni bridge, para poder testearla de punta a punta.
 *
 * Reglas del gauntlet:
 *  - D1: `xlsx`/`docx` se ELIMINAN de los toggles de Settings (no tienen
 *    exportador; promesa incumplida).
 *  - D2: `md` se implementa de verdad (antes tampoco tenía exportador).
 *  - D3: TXT con cabecera (nombre del léxico + fecha), una entrada por línea,
 *    campos claros y vacíos excluidos.
 *  - D5: el modo de comparación usa léxema normalizado `NFC + casefold + trim`.
 */

import type { LexiconEntry, LexiconMetadata } from '../types';

/** Formatos con exportador real. `xlsx`/`docx` quedan fuera a propósito. */
export const EXPORT_FORMATS = ['json', 'csv', 'md', 'txt'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const DEFAULT_EXPORT_FORMATS: ExportFormat[] = ['json', 'csv', 'md'];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: 'JSON',
  csv: 'CSV',
  md: 'MD',
  txt: 'TXT',
};

export const EXPORT_FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  json: 'Backup/Re-importar',
  csv: 'Hoja de cálculo',
  md: 'Markdown',
  txt: 'Texto plano',
};

export interface LexiconExportTarget {
  /** Nombre del léxico (se usa en la cabecera de TXT/MD y en el nombre de archivo). */
  lexiconName: string;
  /** Metadatos del léxico (opcionales: se muestran en la cabecera). */
  metadata?: LexiconMetadata | null;
  entries: LexiconEntry[];
}

export interface ExportFileDescriptor {
  /** Nombre de archivo sugerido (sin ruta). */
  fileName: string;
  /** Contenido completo del archivo, listo para escribir. */
  content: string;
}

/** Quita caracteres no seguros para un nombre de archivo. */
export const toSafeFileName = (name: string): string =>
  name.replace(/[^a-z0-9áéíóúüñ]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

/** Fecha `YYYY-MM-DD` en UTC (estable para cabeceras y nombres de archivo). */
export const exportDateStamp = (date: Date = new Date()): string =>
  date.toISOString().split('T')[0];

const joinList = (values: string[] | undefined): string =>
  (values ?? []).filter(v => v !== undefined && v !== null && String(v).trim() !== '').join(', ');

const single = (values: string[] | undefined): string => (values?.[0] ?? '').trim();

/**
 * Filtra una lista de formatos persistida a los que tienen exportador real.
 * Si no queda ninguno válido (o la lista venía vacía), cae al default.
 */
export const normalizeExportFormats = (
  values: readonly string[] | null | undefined,
): ExportFormat[] => {
  if (!values || values.length === 0) return [...DEFAULT_EXPORT_FORMATS];
  const valid = values.filter((value): value is ExportFormat =>
    (EXPORT_FORMATS as readonly string[]).includes(value),
  );
  return valid.length > 0 ? valid : [...DEFAULT_EXPORT_FORMATS];
};

/**
 * CSV: una fila por entrada con BOM UTF-8 para que Excel respete los acentos.
 * Las listas se unen con `;` (no con `,`) para no romper el delimitador.
 */
export const buildCsvContent = (entries: LexiconEntry[]): string => {
  const header = ['ID', 'Raíz', 'Léxema', 'Categoría', 'Significado', 'externalID'];
  const escape = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const rows = entries.map(entry =>
    [
      entry.ID,
      single([entry.Raíz]),
      joinList(entry.Léxema).replace(/,/g, ';'),
      entry.Categoría,
      joinList(entry.Significado).replace(/,/g, ';'),
      entry.externalID ?? '',
    ].map(escape).join(','),
  );

  return '\uFEFF' + [header.join(','), ...rows].join('\r\n');
};

/**
 * TXT: cabecera con nombre del léxico, idioma principal y fecha; una entrada
 * por línea con los campos no vacíos.
 */
export const buildTxtContent = ({ lexiconName, metadata, entries }: LexiconExportTarget): string => {
  const header = [
    `Léxico: ${lexiconName}`,
    metadata?.mainLanguage ? `Idioma principal: ${metadata.mainLanguage}` : '',
    `Fecha de exportación: ${exportDateStamp()}`,
    `Entradas: ${entries.length}`,
  ].filter(Boolean);

  const body = entries.map(entry => {
    const fields = [
      entry.Raíz ? `Raíz: ${entry.Raíz}` : '',
      entry.Léxema?.length ? `Léxema: ${joinList(entry.Léxema)}` : '',
      entry.Categoría ? `Categoría: ${entry.Categoría}` : '',
      entry.Significado?.length ? `Significado: ${joinList(entry.Significado)}` : '',
      entry.externalID ? `externalID: ${entry.externalID}` : '',
    ].filter(Boolean);
    return fields.join(' | ');
  });

  return [...header, '', ...body].join('\n');
};

/**
 * MD: el mismo contenido que TXT con una cabecera en markdown y una tabla
 * por entrada (una fila por lexema, que es la forma legible de leer un léxico).
 */
export const buildMdContent = ({ lexiconName, metadata, entries }: LexiconExportTarget): string => {
  const lines: string[] = [
    `# Léxico: ${lexiconName}`,
    '',
  ];
  if (metadata?.mainLanguage) lines.push(`**Idioma principal:** ${metadata.mainLanguage}`);
  lines.push(`**Fecha de exportación:** ${exportDateStamp()}`);
  lines.push(`**Entradas:** ${entries.length}`);
  lines.push('');
  lines.push('| # | Raíz | Léxema | Categoría | Significado | externalID |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  entries.forEach((entry, index) => {
    const cell = (value: string): string => value.replace(/\|/g, '\\|');
    lines.push(
      [
        String(index + 1),
        cell(single([entry.Raíz])),
        cell(joinList(entry.Léxema).replace(/,/g, '; ')),
        cell(entry.Categoría ?? ''),
        cell(joinList(entry.Significado).replace(/,/g, '; ')),
        cell(entry.externalID ?? ''),
      ].join(' | '),
    );
  });

  return lines.join('\n');
};

/** JSON: volcado completo de las entradas (backup re-importable). */
export const buildJsonContent = (entries: LexiconEntry[]): string =>
  JSON.stringify(entries, null, 2);

/** Construye el descriptor de archivo para un formato dado. */
export const buildLexiconExport = (
  format: ExportFormat,
  { lexiconName, metadata, entries }: LexiconExportTarget,
  date: Date = new Date(),
): ExportFileDescriptor => {
  const stamp = exportDateStamp(date);
  const base = toSafeFileName(lexiconName) || 'lexico';

  switch (format) {
    case 'json':
      return { fileName: `${base}_${stamp}.json`, content: buildJsonContent(entries) };
    case 'csv':
      return { fileName: `${base}_${stamp}.csv`, content: buildCsvContent(entries) };
    case 'txt':
      return { fileName: `${base}_${stamp}.txt`, content: buildTxtContent({ lexiconName, metadata, entries }) };
    case 'md':
      return { fileName: `${base}_${stamp}.md`, content: buildMdContent({ lexiconName, metadata, entries }) };
    default: {
      // Cierre exhaustivo: si aparece un formato nuevo sin rama, falla en
      // lugar de exportar silenciosamente en formato equivocado.
      const never: never = format;
      throw new Error(`Formato de exportación no soportado: ${String(never)}`);
    }
  }
};

// ── D5: clave de comparación de léxicos (léxema normalizado NFC + casefold + trim) ──

export type LexiconCompareKey = string;

/** Clave de identidad práctica de una entrada: primer léxema normalizado. */
export const lexiconEntryKey = (entry: LexiconEntry): LexiconCompareKey =>
  (entry.Léxema?.[0] ?? entry.Raíz ?? '')
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .trim();

export interface LexiconFieldDiff {
  field: 'Raíz' | 'Léxema' | 'Categoría' | 'Significado' | 'externalID';
  base: string;
  other: string;
}

export interface LexiconComparison {
  /** Entradas presentes solo en la base. */
  missingInOther: LexiconEntry[];
  /** Entradas presentes solo en el otro léxico. */
  missingInBase: LexiconEntry[];
  /** Entradas en ambos con al menos un campo distinto. */
  changed: { entry: LexiconEntry; other: LexiconEntry; diffs: LexiconFieldDiff[] }[];
}

const FIELD_GETTERS: Record<LexiconFieldDiff['field'], (entry: LexiconEntry) => string> = {
  Raíz: entry => single([entry.Raíz]),
  Léxema: entry => joinList(entry.Léxema),
  Categoría: entry => entry.Categoría ?? '',
  Significado: entry => joinList(entry.Significado),
  externalID: entry => entry.externalID ?? '',
};

/** Compara dos léxicos por clave de léxema normalizada e informa campo a campo. */
export const compareLexicons = (
  base: LexiconEntry[],
  other: LexiconEntry[],
): LexiconComparison => {
  const otherByKey = new Map<LexiconCompareKey, LexiconEntry>();
  for (const entry of other) {
    const key = lexiconEntryKey(entry);
    if (key && !otherByKey.has(key)) otherByKey.set(key, entry);
  }

  const baseByKey = new Map<LexiconCompareKey, LexiconEntry>();
  for (const entry of base) {
    const key = lexiconEntryKey(entry);
    if (key && !baseByKey.has(key)) baseByKey.set(key, entry);
  }

  const missingInOther: LexiconEntry[] = [];
  const missingInBase: LexiconEntry[] = [];
  const changed: LexiconComparison['changed'] = [];

  for (const [key, entry] of baseByKey) {
    const counterpart = otherByKey.get(key);
    if (!counterpart) {
      missingInOther.push(entry);
      continue;
    }
    const diffs = (Object.keys(FIELD_GETTERS) as LexiconFieldDiff['field'][])
      .map(field => ({ field, base: FIELD_GETTERS[field](entry), other: FIELD_GETTERS[field](counterpart) }))
      .filter(diff => diff.base !== diff.other);
    if (diffs.length > 0) changed.push({ entry, other: counterpart, diffs });
  }

  for (const [key, entry] of otherByKey) {
    if (!baseByKey.has(key)) missingInBase.push(entry);
  }

  return { missingInOther, missingInBase, changed };
};

/**
 * Fusiona `other` en `base` sin duplicar: añade las entradas ausentes y
 * sobrescribe los campos que difieren. Devuelve una lista nueva (no muta).
 */
export const mergeLexicons = (
  base: LexiconEntry[],
  other: LexiconEntry[],
): LexiconEntry[] => {
  const { missingInBase, changed } = compareLexicons(base, other);
  const changedById = new Map(changed.map(item => [item.entry.ID, item.other]));

  const merged = base.map(entry => changedById.get(entry.ID) ?? entry);
  return [...merged, ...missingInBase];
};
