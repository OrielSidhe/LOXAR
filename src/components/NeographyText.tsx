/**
 * NeographyText.tsx
 * ----------------------------------------------------------------------------
 * Renderizador mínimo de texto usando:
 *   - Mapa de caracteres (`characterMap`) para transliteración -> glifo.
 *   - Ligaduras (`ligatures`) para reemplazo de secuencias.
 *   - Dirección de escritura (`writingDirection`).
 *   - Fuente personalizada cargada en el host.
 *
 * No modifica el perfil; es presentacional puro.
 * ----------------------------------------------------------------------------
 */
import React, { useMemo } from 'react';
import type { NeographyProfile } from '../types';

export interface NeographyTextProps {
  profile: NeographyProfile;
  text: string;
  className?: string;
}

const fallbackProfile: NeographyProfile = {
  glyphs: [],
  characterMap: {},
  ligatures: {},
};

const applyLigatures = (raw: string, ligatures: Record<string, string>): string => {
  const entries = Object.entries(ligatures)
    .filter(([k]) => k.trim().length > 0)
    .sort((a, b) => b[0].length - a[0].length);

  if (!entries.length) return raw;
  let out = raw;
  for (const [key, glyphId] of entries) {
    out = out.split(key).join(glyphId);
  }
  return out;
};

const mapToGlyphIds = (text: string, characterMap: Record<string, string>): string => {
  const ordered = Object.keys(characterMap).sort((a, b) => b.length - a.length);
  let out = text;
  for (const key of ordered) {
    if (!key) continue;
    out = out.split(key).join(characterMap[key]);
  }
  return out;
};

const NeographyText: React.FC<NeographyTextProps> = ({ profile = fallbackProfile, text, className }) => {
  const mapped = useMemo(() => applyLigatures(text, profile.ligatures || {}), [text, profile.ligatures]);
  const glyphIds = useMemo(() => mapToGlyphIds(mapped, profile.characterMap || {}), [mapped, profile.characterMap]);
  const writingDirection = profile.writingDirection || 'ltr';

  const chars = useMemo(() => {
    const parts = glyphIds.split('');
    return parts.map((glyphId: string, idx: number) => {
      const glyph = profile.glyphs?.find((g) => g.id === glyphId);
      const render = glyph?.unicode || glyphId;
      return <span key={`${idx}-${glyphId}`}>{render}</span>;
    });
  }, [glyphIds, profile.glyphs]);

  return (
    <span
      className={className}
      style={{ direction: writingDirection as any, unicodeBidi: 'plaintext' }}
    >
      {chars.length ? chars : <span className="opacity-40">{text}</span>}
    </span>
  );
};

export default NeographyText;
