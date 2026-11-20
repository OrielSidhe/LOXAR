import { describe, it, expect } from 'vitest';
import {
  buildAutoMapping,
  entriesFromRows,
  normalizeHeader,
  parseLexiconCompareFile,
} from '../lexiconCompareFile';

describe('lexiconCompareFile: mapeo automático', () => {
  it('normaliza nombres de columna (diacríticos y mayúsculas)', () => {
    expect(normalizeHeader('Léxema')).toBe('lexema');
    expect(normalizeHeader(' externalID ')).toBe('externalid');
    expect(normalizeHeader('Categoría')).toBe('categoria');
  });

  it('mapea columnas en español e inglés', () => {
    const mapping = buildAutoMapping(['Raíz', 'Léxema', 'Categoría', 'Significado', 'externalID']);
    expect(mapping).toEqual({
      Raíz: 'Raíz',
      Léxema: 'Léxema',
      Categoría: 'Categoría',
      Significado: 'Significado',
      externalID: 'externalID',
    });
  });

  it('las columnas desconocidas no se mapean (van a extraData)', () => {
    const mapping = buildAutoMapping(['Palabra', 'Glossa', 'Notas']);
    expect(mapping).toEqual({});
  });

  it('convierte filas en entradas con ID estable', () => {
    const rows = [
      { Raíz: 'kira', Léxema: 'kira; kira-n', Categoría: 'sustantivo', Significado: 'fuego, luz' },
      { Raíz: 'telo', Léxema: 'telo', Categoría: 'verbo', Significado: 'ver', externalID: 'E-2' },
    ];
    const entries = entriesFromRows(rows, ['Raíz', 'Léxema', 'Categoría', 'Significado', 'externalID']);
    expect(entries).toHaveLength(2);
    expect(entries[0].Léxema).toEqual(['kira', 'kira-n']);
    expect(entries[0].Significado).toEqual(['fuego', 'luz']);
    expect(entries[0].ID).toBe('cmp-1');
    expect(entries[1].ID).toBe('E-2');
  });
});

describe('lexiconCompareFile: parseo de archivo', () => {
  it('lee un backup completo de LOXAR', async () => {
    const backup = JSON.stringify({
      metadata: { conlangName: 'Quavanol', mainLanguage: 'Español' },
      entries: [
        { ID: '1', Raíz: 'kira', Léxema: ['kira'], Categoría: 'sustantivo', Significado: ['fuego'], extraData: {} },
      ],
    });
    const entries = await parseLexiconCompareFile(backup);
    expect(entries).toHaveLength(1);
    expect(entries[0].Léxema).toEqual(['kira']);
  });

  it('lee un CSV con cabecera', async () => {
    const csv = 'Raíz,Léxema,Categoría,Significado\nkira,kira,sustantivo,fuego\ntelo,telo,verbo,ver\n';
    const entries = await parseLexiconCompareFile(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ Raíz: 'kira', Léxema: ['kira'], Categoría: 'sustantivo', Significado: ['fuego'] });
  });

  it('lanza error en un archivo vacío', async () => {
    await expect(parseLexiconCompareFile('')).rejects.toThrow(/No se encontraron entradas/);
  });
});
