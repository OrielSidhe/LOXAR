import { describe, it, expect } from 'vitest';
import { normalizeLexiconData } from '../normalize';

describe('normalizeLexiconData — variantes legacy de campo de entrada', () => {
  it('normaliza raiz/lexema/categoria/significado en minúsculas', () => {
    const result = normalizeLexiconData(
      {
        entries: [
          {
            raiz: 'RAÍZ-1',
            lexema: 'LexemaUno',
            categoria: 'sustantivo',
            significado: 'significado uno',
          },
        ],
      },
      'Prueba',
      'Español',
    );

    const entry = result.entries[0];
    expect(entry.ID).toBe('1');
    expect(entry.Raíz).toBe('RAÍZ-1');
    expect(entry.Léxema).toEqual(['LexemaUno']);
    expect(entry.Significado).toEqual(['significado uno']);
    expect(entry.Categoría).toBeTruthy();
  });

  it('conserva arreglos canónicos, usa la variante lowercase como fallback y deja vacíos los campos ausentes', () => {
    const result = normalizeLexiconData(
      {
        entries: [
          { Léxema: ['A', 'B'], Significado: ['x', 'y'], Raíz: 'R1' },
          { Léxema: '', lexema: ['C'], Significado: '', significado: 'z' },
          {},
        ],
      },
      'Prueba',
      'Español',
    );

    expect(result.entries[0].Léxema).toEqual(['A', 'B']);
    expect(result.entries[0].Significado).toEqual(['x', 'y']);
    expect(result.entries[1].Léxema).toEqual(['C']);
    expect(result.entries[1].Significado).toEqual(['z']);
    expect(result.entries[2].Léxema).toEqual([]);
    expect(result.entries[2].Significado).toEqual([]);
    expect(result.entries[2].Raíz).toBe('');
    expect(result.entries.map((e) => e.ID)).toEqual(['1', '2', '3']);
  });
});
