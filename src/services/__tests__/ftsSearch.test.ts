import { afterEach, describe, expect, it } from 'vitest';
import type { LexiconData } from '../../types';
import { normalizeLexiconData } from '../normalize';
import { searchLexicon } from '../ftsSearch';

const buildData = (): LexiconData =>
  normalizeLexiconData(
    {
      entries: [
        {
          Raíz: 'kal',
          Léxema: ['kala'],
          Categoría: 'sustantivo',
          Significado: ['casa'],
          extraData: { notes: ['hogar'] },
        },
        {
          Raíz: 'kam',
          Léxema: ['kami'],
          Categoría: 'verbo',
          Significado: ['correr'],
          extraData: {},
        },
      ],
    },
    'Prueba',
    'Español',
  );

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe('searchLexicon — ruta de búsqueda en memoria', () => {
  it('devuelve [] para una consulta vacía', async () => {
    expect(await searchLexicon(buildData(), '   ')).toEqual([]);
  });

  it('puntúa por términos coincidentes y descarta las entradas sin coincidencia', async () => {
    const results = await searchLexicon(buildData(), 'kal casa', 'Prueba');
    expect(results).toHaveLength(1);
    expect(results[0]?.entry.Raíz).toBe('kal');
    expect(results[0]?.matches).toEqual(['kal', 'casa']);
    expect(results[0]?.score).toBe(1);
  });

  it('busca también en las notas de extraData', async () => {
    const results = await searchLexicon(buildData(), 'hogar');
    expect(results.map((result) => result.entry.Raíz)).toEqual(['kal']);
  });

  it('sin nombre de léxico no consulta el plugin aunque exista el bridge de Tauri', async () => {
    (globalThis as unknown as { window: unknown }).window = { __TAURI_INTERNALS__: {} };
    const results = await searchLexicon(buildData(), 'kala');
    expect(results.map((result) => result.entry.Raíz)).toEqual(['kal']);
  });
});
