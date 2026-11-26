import { describe, it, expect } from 'vitest';
import {
  EXPORT_FORMATS,
  DEFAULT_EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  normalizeExportFormats,
  toSafeFileName,
  buildJsonContent,
  buildCsvContent,
  buildTxtContent,
  buildMdContent,
  buildLexiconExport,
  lexiconEntryKey,
  compareLexicons,
  mergeLexicons,
  type ExportFormat,
} from '../lexiconExport';
import type { LexiconEntry } from '../../types';

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: '1',
  Raíz: 'raiz',
  Léxema: ['lexema'],
  Categoría: 'sustantivo',
  Significado: ['meaning'],
  extraData: {},
  ...overrides,
});

describe('lexiconExport: formatos', () => {
  it('solo ofrece formatos con exportador real (xlsx/docx quedan fuera)', () => {
    expect(EXPORT_FORMATS).toEqual(['json', 'csv', 'md', 'txt']);
    expect(DEFAULT_EXPORT_FORMATS).toEqual(['json', 'csv', 'md']);
    for (const format of EXPORT_FORMATS) {
      expect(EXPORT_FORMAT_LABELS[format]).toBeTruthy();
    }
  });

  it('normaliza formatos persistidos descartando los inválidos', () => {
    expect(normalizeExportFormats(['md', 'txt', 'xlsx', 'docx'])).toEqual(['md', 'txt']);
    expect(normalizeExportFormats(['xlsx', 'docx'])).toEqual([...DEFAULT_EXPORT_FORMATS]);
    expect(normalizeExportFormats([])).toEqual([...DEFAULT_EXPORT_FORMATS]);
    expect(normalizeExportFormats(null)).toEqual([...DEFAULT_EXPORT_FORMATS]);
    expect(normalizeExportFormats(undefined)).toEqual([...DEFAULT_EXPORT_FORMATS]);
  });

  it('construye nombres de archivo seguros y estables', () => {
    expect(toSafeFileName('Mi Léxico: Ñandú!')).toBe('mi_léxico_ñandú');
    expect(toSafeFileName('***')).toBe('');
  });
});

describe('lexiconExport: contenido por formato', () => {
  const entries = [
    entry({ ID: '1', Raíz: 'kira', Léxema: ['kira', 'kira-n'], Categoría: 'sustantivo', Significado: ['fuego', 'luz'] }),
    entry({ ID: '2', Raíz: 'telo', Léxema: ['telo'], Categoría: 'verbo', Significado: ['ver'], externalID: 'E-2' }),
  ];

  it('JSON es un volcado re-importable', () => {
    const parsed = JSON.parse(buildJsonContent(entries)) as LexiconEntry[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].Léxema).toEqual(['kira', 'kira-n']);
  });

  it('CSV lleva BOM UTF-8, cabecera y escapa comillas', () => {
    const csv = buildCsvContent([entry({ Significado: ['con "comillas"'] })]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')[0]).toBe('ID,Raíz,Léxema,Categoría,Significado,externalID');
    expect(csv).toContain('"con ""comillas"""');
    expect(buildCsvContent(entries)).toContain('kira; kira-n');
  });

  it('TXT tiene cabecera con léxico/idioma/fecha y excluye campos vacíos', () => {
    const txt = buildTxtContent({
      lexiconName: 'Quavanol',
      metadata: { conlangName: 'Quavanol', mainLanguage: 'Español' },
      entries: [entry({ externalID: undefined })],
    });

    expect(txt).toContain('Léxico: Quavanol');
    expect(txt).toContain('Idioma principal: Español');
    expect(txt).toContain('Fecha de exportación: ');
    expect(txt).toContain('Entradas: 1');
    expect(txt).toContain('Raíz: raiz | Léxema: lexema | Categoría: sustantivo | Significado: meaning');
    expect(txt).not.toContain('externalID');
  });

  it('MD tiene cabecera, secciones por categoría, tabla y escapa tuberías', () => {
    const md = buildMdContent({
      lexiconName: 'Quavanol',
      metadata: { conlangName: 'Quavanol', mainLanguage: 'Español' },
      entries: [
        entry({ Significado: ['a|b'] }),
        entry({ ID: '2', Categoría: 'verbo', Léxema: ['telo'], Significado: ['ver'] }),
        entry({ ID: '3', Categoría: '', Léxema: ['sin-cat'] }),
      ],
    });

    expect(md).toContain('# Léxico: Quavanol');
    expect(md).toContain('**Fecha de exportación:** ');
    expect(md).toContain('**Entradas:** 3');
    expect(md).toContain('## sustantivo');
    expect(md).toContain('## verbo');
    expect(md).toContain('## Sin categoría');
    expect(md.indexOf('## sustantivo')).toBeLessThan(md.indexOf('## verbo'));
    expect(md).toContain('| # | Raíz | Léxema | Categoría | Significado | externalID |');
    expect(md).toContain('a\\|b');
  });

  it('buildLexiconExport devuelve el descriptor por formato y falla en formato desconocido', () => {
    const date = new Date('2026-11-20T12:00:00Z');
    const target = { lexiconName: 'Mi Léxico', metadata: null, entries };

    expect(buildLexiconExport('json', target, date).fileName).toBe('mi_léxico_2026-11-20.json');
    expect(buildLexiconExport('csv', target, date).fileName).toBe('mi_léxico_2026-11-20.csv');
    expect(buildLexiconExport('md', target, date).fileName).toBe('mi_léxico_2026-11-20.md');
    expect(buildLexiconExport('txt', target, date).fileName).toBe('mi_léxico_2026-11-20.txt');

    expect(() => buildLexiconExport('xlsx' as ExportFormat, target, date)).toThrow(/no soportado/);
  });
});

describe('lexiconExport: comparación y merge', () => {
  it('la clave normaliza NFC, diacríticos, mayúsculas y espacios', () => {
    expect(lexiconEntryKey(entry({ Léxema: ['  Áng '], Raíz: 'x' }))).toBe('ang');
    expect(lexiconEntryKey(entry({ Léxema: ['a\u0301'], Raíz: 'x' }))).toBe(
      lexiconEntryKey(entry({ Léxema: ['á'], Raíz: 'x' })),
    );
    expect(lexiconEntryKey(entry({ Léxema: [], Raíz: 'Raíz' }))).toBe('raiz');
  });

  it('compara léxicos por léxema e informa campo a campo', () => {
    const base = [
      entry({ ID: '1', Léxema: ['kira'], Significado: ['fuego'] }),
      entry({ ID: '2', Léxema: ['telo'], Significado: ['ver'] }),
    ];
    const other = [
      entry({ ID: '1', Léxema: ['KIRA'], Significado: ['luz'] }),
      entry({ ID: '3', Léxema: ['nova'], Significado: ['nuevo'] }),
    ];

    const result = compareLexicons(base, other);

    expect(result.missingInOther.map(e => e.ID)).toEqual(['2']);
    expect(result.missingInBase.map(e => e.ID)).toEqual(['3']);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].diffs).toEqual([
      { field: 'Léxema', base: 'kira', other: 'KIRA' },
      { field: 'Significado', base: 'fuego', other: 'luz' },
    ]);
  });

  it('merge añade ausentes, sobrescribe cambios y no muta las entradas', () => {
    const base = [entry({ ID: '1', Léxema: ['kira'], Significado: ['fuego'] })];
    const other = [
      entry({ ID: '1', Léxema: ['kira'], Significado: ['luz'] }),
      entry({ ID: '3', Léxema: ['nova'], Significado: ['nuevo'] }),
    ];

    const merged = mergeLexicons(base, other);

    expect(merged).toHaveLength(2);
    expect(merged.find(e => e.ID === '1')?.Significado).toEqual(['luz']);
    expect(merged.find(e => e.ID === '3')).toBeDefined();
    expect(base[0].Significado).toEqual(['fuego']);
    expect(other[1].Significado).toEqual(['nuevo']);
  });

  it('las claves vacías se ignoran (no colisionan ni se fusionan)', () => {
    const base = [entry({ ID: '1', Léxema: [], Raíz: '' })];
    const other = [entry({ ID: '2', Léxema: [], Raíz: '' })];

    const result = compareLexicons(base, other);

    expect(result).toEqual({ missingInOther: [], missingInBase: [], changed: [] });
  });
});
