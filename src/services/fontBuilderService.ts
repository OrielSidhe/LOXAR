import svg2ttf from 'svg2ttf';
import { NeographyProfile, Glyph } from '../types';

export const buildTtfFont = (profile: NeographyProfile): Uint8Array => {
    const unitsPerEm = 1000;
    const ascent = profile.guideLines?.ascender || 800;
    const descent = profile.guideLines?.descender ? -profile.guideLines.descender : -200;
    const fontFamily = profile.fontFamily || 'ConlangFont';
    const fontId = fontFamily.replace(/\\s+/g, '');

    let svgFont = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >
<svg xmlns="http://www.w3.org/2000/svg">
<defs>
  <font id="${fontId}" horiz-adv-x="${unitsPerEm}">
    <font-face font-family="${fontFamily}" units-per-em="${unitsPerEm}" ascent="${ascent}" descent="${descent}" />
    <missing-glyph horiz-adv-x="500" d="M0,0 h500 v500 h-500 z" />
`;

    profile.glyphs.forEach((g: Glyph) => {
        let path = g.svgPathMain || '';
        if (g.unicode && path) {
             const hex = g.unicode.charCodeAt(0).toString(16).toUpperCase();
             const escapedUnicode = "&#x" + hex + ";";
             svgFont += "    <glyph unicode=\"" + escapedUnicode + "\" glyph-name=\"" + g.name + "\" horiz-adv-x=\"" + (g.width || unitsPerEm) + "\" d=\"" + path + "\" />\n";
        }
    });

    svgFont += `  </font>
</defs>
</svg>`;

    const ttf = svg2ttf(svgFont, {});
    return new Uint8Array(ttf.buffer);
};
