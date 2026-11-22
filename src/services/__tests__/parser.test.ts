import { describe, it, expect } from 'vitest';
import {
  inferRootFromLexeme,
  parseFileContent,
  processMappedData,
  type LexiconRow,
} from '../parser';

describe('parseFileContent: CSV', () => {
  it('parsea filas con cabecera y expone los headers', async () => {
    const csv = 'Léxema,Raíz,Categoría,Significado\nboskel,bask,SUSTANTIVO,"casa, hogar"\n';
    const result = await parseFileContent(csv);

    expect(result.error).toBeNull();
    expect(result.errorContent).toBeNull();
    expect(result.headers).toEqual(['Léxema', 'Raíz', 'Categoría', 'Significado']);
    expect(result.successfulData).toEqual([
      { Léxema: 'boskel', Raíz: 'bask', Categoría: 'SUSTANTIVO', Significado: 'casa, hogar' },
    ]);
  });

  it('marca la fila con cantidad de columnas distinta como contenido a corregir', async () => {
    const csv = 'Léxema,Significado\nboskel\n';
    const result = await parseFileContent(csv);

    expect(result.successfulData).toEqual([]);
    expect(result.error).toContain('excluidas');
    expect(result.errorContent).toContain('boskel');
    expect(result.warnings[0]).toContain('Row 2');
  });

  it('rechaza filas narrativas y conserva el número de fila original', async () => {
    const csv = 'Léxema,Significado\nboskel,"El significado es una oración. Tiene dos partes. Y tres."\n';
    const result = await parseFileContent(csv);

    expect(result.successfulData).toEqual([]);
    expect(result.error).toContain('excluidas');
    expect(result.warnings.join('\n')).toContain('#2:');
  });

  it('devuelve headers vacíos para un archivo vacío', async () => {
    const result = await parseFileContent('   \n');

    expect(result.successfulData).toEqual([]);
    expect(result.headers).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('parseFileContent: JSON', () => {
  it('parsea un array de objetos como filas de léxico', async () => {
    const json = JSON.stringify([
      { Léxema: 'boskel', Raíz: 'bask', Categoría: 'SUSTANTIVO', Significado: 'casa' },
    ]);
    const result = await parseFileContent(json);

    expect(result.error).toBeNull();
    expect(result.isLexiconBackup).toBeUndefined();
    expect(result.headers).toEqual(['Léxema', 'Raíz', 'Categoría', 'Significado']);
    expect(result.successfulData).toEqual([
      { Léxema: 'boskel', Raíz: 'bask', Categoría: 'SUSTANTIVO', Significado: 'casa' },
    ]);
  });

  it('rechaza objetos sin señales de léxico sin invocar la reparación con IA', async () => {
    const json = JSON.stringify([{ foo: 'bar' }]);
    const result = await parseFileContent(json);

    expect(result.successfulData).toEqual([]);
    expect(result.error).toContain('No se detectaron entradas de léxico válidas');
  });

  it('detecta el backup completo de LOXAR y expone sus metadatos', async () => {
    const backup = {
      entries: [
        {
          ID: '1',
          Raíz: 'bask',
          Léxema: ['boskel'],
          Categoría: 'SUSTANTIVO',
          Significado: ['casa'],
          extraData: {},
        },
      ],
      metadata: { conlangName: 'Ilmuria', mainLanguage: 'Español' },
    };
    const result = await parseFileContent(JSON.stringify(backup));

    expect(result.isLexiconBackup).toBe(true);
    expect(result.successfulData).toEqual([]);
    expect(result.backupData?.metadata?.conlangName).toBe('Ilmuria');
    expect(result.backupData?.entries).toHaveLength(1);
  });
});

describe('processMappedData', () => {
  const mapping: { [key: string]: 'Léxema' | 'Significado' | 'Raíz' | 'Categoría' | 'externalID' | 'extra' | '' } = {
    Léxema: 'Léxema',
    Significado: 'Significado',
    Raíz: 'Raíz',
    Categoría: 'Categoría',
    Notas: 'extra',
  };

  it('divide Léxema y Significado por separadores y manda columnas extra a extraData', () => {
    const rows: LexiconRow[] = [
      { Léxema: 'boskel, boskela', Raíz: 'bask', Categoría: 'SUSTANTIVO', Significado: 'casa|hogar', Notas: 'urales' },
    ];

    const [entry] = processMappedData(rows, mapping);

    expect(entry.Léxema).toEqual(['boskel', 'boskela']);
    expect(entry.Significado).toEqual(['casa', 'hogar']);
    expect(entry.Raíz).toBe('bask');
    expect(entry.Categoría).toBe('SUSTANTIVO');
    expect(entry.extraData).toEqual({ Notas: 'urales' });
  });

  it('infiera la raíz del primer lexema y defaulta la categoría a "desconocida"', () => {
    const rows: LexiconRow[] = [{ Léxema: 'boskel', Significado: 'casa' }];

    const [entry] = processMappedData(rows, mapping);

    expect(entry.Raíz).toBe('BOSK');
    expect(entry.Categoría).toBe('desconocida');
  });

  it('descarta la fila cuando el significado queda vacío', () => {
    const rows: LexiconRow[] = [{ Léxema: 'boskel', Significado: '   ' }];

    expect(processMappedData(rows, mapping)).toEqual([]);
  });
});

describe('inferRootFromLexeme', () => {
  it('devuelve vacío si no hay lexema', () => {
    expect(inferRootFromLexeme(null)).toBe('');
    expect(inferRootFromLexeme(undefined)).toBe('');
    expect(inferRootFromLexeme('')).toBe('');
  });

  it('toma los cuatro primeros caracteres y conserva solo letras', () => {
    expect(inferRootFromLexeme('boskel')).toBe('BOSK');
    expect(inferRootFromLexeme('12bask')).toBe('BA');
    expect(inferRootFromLexeme('!!!')).toBe('');
  });
});
