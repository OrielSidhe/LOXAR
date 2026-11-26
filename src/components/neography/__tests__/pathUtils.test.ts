import { describe, expect, it } from 'vitest';
import {
  getFreehandPath,
  getPointsFromPath,
  getSvgPathFromStroke,
  smoothPath,
} from '../pathUtils';

describe('pathUtils', () => {
  it('getSvgPathFromStroke devuelve vacío para un contorno sin puntos', () => {
    expect(getSvgPathFromStroke([])).toBe('');
  });

  it('getSvgPathFromStroke cierra el contorno con puntos medios y Z', () => {
    expect(getSvgPathFromStroke([[0, 0], [10, 10]])).toBe('M 0 0 Q 0 0 5 5 10 10 5 5 Z');
  });

  it('getFreehandPath exige al menos dos puntos', () => {
    expect(getFreehandPath([{ x: 0, y: 0 }])).toBe('');
  });

  it('getFreehandPath genera un path cerrado con opciones por defecto y personalizadas', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 12, pressure: 0.8 }, { x: 20, y: 4 }];
    const defaultPath = getFreehandPath(points);
    const customPath = getFreehandPath(points, { size: 4, thinning: 0, smoothing: 0 });

    for (const path of [defaultPath, customPath]) {
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
      expect(path).not.toContain('NaN');
    }
    expect(customPath).not.toBe(defaultPath);
  });

  it('getPointsFromPath interpreta centre lines M/L e ignora comandos malformados', () => {
    expect(getPointsFromPath('M 1 2 L 3 4 L 5 6')).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]);
    expect(getPointsFromPath('M x y L 3 4')).toEqual([{ x: 3, y: 4 }]);
    expect(getPointsFromPath('')).toEqual([]);
  });

  it('smoothPath devuelve vacío sin segmentos y un path por cada segmento', () => {
    expect(smoothPath('')).toBe('');
    const result = smoothPath('M 0 0 L 10 0');
    expect(result.startsWith('M ')).toBe(true);
    expect(result.endsWith(' Z')).toBe(true);
    expect(result).not.toContain('NaN');
  });
});
