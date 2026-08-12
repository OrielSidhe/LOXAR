/**
 * interlinearGlossService.ts
 * ----------------------------------------------------------------------------
 * Glosado interlineal básico estilo Leipzig.
 *
 * Entrada:
 *   - sentence: oración a glosar
 *   - lexicon: entradas para resolver raíces/léxemas
 *   - options: separadores y metadatos
 *
 * Salida:
 *   - GlossLine[] con forma original, glosa morfológica y traducción.
 * ----------------------------------------------------------------------------
 */
import type { LexiconEntry } from '../types';

export interface GlossOptions {
  morphemeSeparator?: string;
  glossSeparator?: string;
  unknownGloss?: string;
  fallbackCategory?: string;
}

const DEFAULT_OPTIONS: Required<GlossOptions> = {
  morphemeSeparator: '-',
  glossSeparator: '.',
  unknownGloss: '?',
  fallbackCategory: 'STEM',
};

export interface GlossLine {
  original: string;
  morphemes: string[];
  gloss: string[];
  notes: string[];
}

export interface InterlinearGloss {
  lines: GlossLine[];
  freeTranslation: string;
}

const STOP_WORDS = new Set([
  'el','la','los','las','un','una','unos','unas','y','o','pero','porque',
  'de','del','a','al','en','con','sin','sobre','entre','hacia','desde','hasta',
  'que','quien','cual','donde','cuando','como','cuanto','si','no','muy','mas',
  'me','te','se','le','lo','la','les','nos','os','mi','tu','su','sus','nuestro',
  'vuestro','este','esta','estos','estas','ese','esa','esos','esas','aquel',
  'aquella','aquellos','aquellas','ser','ir','tener','hacer','estar','haber','poder',
  'decir','dar','ver','querer','llegar','pasar','dejar','parecer','llevar','venir',
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can',
  'could','and','but','or','nor','for','yet','so','if','then','else','when',
  'where','why','how','all','each','every','both','few','more','most','other',
  'some','such','no','not','only','own','same','so','than','too','very','just',
  'because','as','until','while','of','at','by','for','with','about','against',
  'between','into','through','during','before','after','above','below','to',
  'from','up','down','in','out','on','off','over','under','again','further',
  'then','once','here','there','this','that','these','those','i','me','my',
  'myself','we','our','ours','you','your','yours','he','him','his','she','her',
  'hers','it','its','they','them','their','theirs','what','which','who','whom',
]);

function tokenize(input: string): string[] {
  const cleaned = input.replace(/[—–…«»“”]/g, ' ');
  const raw = cleaned.split(/[\s,.?!;:()[\]{}"]+/).filter(Boolean);
  return raw
    .map((w) => w.toLowerCase().replace(/[^\p{L}'-]/gu, ''))
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function bestEntryFor(word: string, lexicon: LexiconEntry[]): LexiconEntry | undefined {
  const lower = word.toLowerCase();
  const exact = lexicon.find((e) => Array.isArray(e.Léxema) && e.Léxema.some((l) => l.toLowerCase() === lower));
  if (exact) return exact;
  const root = lexicon.find((e) => e.Raíz.toLowerCase() === lower);
  if (root) return root;
  const contains = lexicon.find((e) => Array.isArray(e.Léxema) && e.Léxema.some((l) => lower.includes(l.toLowerCase()) || l.toLowerCase().includes(lower)));
  return contains;
}

function splitMorphemes(entry: LexiconEntry, word: string): string[] {
  const lowerWord = word.toLowerCase();
  const parts: string[] = [];

  const affixes = (entry.extraData?.affixes || []) as string[];
  const sorted = affixes
    .map((a) => a.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  let remaining = lowerWord;
  const used = new Set<string>();

  for (const affix of sorted) {
    if (!remaining.includes(affix.toLowerCase())) continue;
    const index = remaining.toLowerCase().indexOf(affix.toLowerCase());
    if (index < 0) continue;
    if (index > 0) {
      const prefix = remaining.slice(0, index);
      if (prefix && !used.has(prefix)) {
        parts.push(prefix);
        used.add(prefix);
      }
    }
    parts.push(affix);
    used.add(affix);
    remaining = remaining.slice(index + affix.length);
  }

  if (remaining && !used.has(remaining)) {
    parts.push(remaining);
  }

  return parts.length > 0 ? parts : [word];
}

export function glossSentence(
  sentence: string,
  lexicon: LexiconEntry[],
  options: GlossOptions = {}
): InterlinearGloss {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tokens = tokenize(sentence);
  const lines: GlossLine[] = [];

  for (const token of tokens) {
    const entry = bestEntryFor(token, lexicon);
    const morphemes = entry ? splitMorphemes(entry, token) : [token];
    const gloss = entry
      ? morphemes.map((m) => (m.toLowerCase() === entry.Raíz.toLowerCase() ? entry.Categoría.toUpperCase() : opts.unknownGloss))
      : morphemes.map(() => opts.fallbackCategory);

    lines.push({
      original: token,
      morphemes,
      gloss,
      notes: entry ? [entry.Significado?.[0] || ''] : [],
    });
  }

  const freeTranslation = lines.map((l) => (l.notes[0] ? `${l.notes[0]}` : l.original)).join(' ');

  return { lines, freeTranslation };
}

export function formatInterlinear(gloss: InterlinearGloss, options: GlossOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const morphemeLines: string[] = [];
  const glossLines: string[] = [];

  for (const line of gloss.lines) {
    morphemeLines.push(line.morphemes.join(opts.morphemeSeparator));
    glossLines.push(line.gloss.join(opts.glossSeparator));
  }

  return [morphemeLines.join(' '), glossLines.join(' '), gloss.freeTranslation].join('\n');
}
