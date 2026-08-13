import { LexiconEntry, GrammarManifest } from '../types';
import { realizeLexeme } from './grammar';

type DictEntry = {
  entry: LexiconEntry;
  spanish: string[];
  conlang: string[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildDictionary(lexicon: LexiconEntry[]): DictEntry[] {
  return lexicon.map((entry) => ({
    entry,
    spanish: [entry.Significado, ...(entry.Significado || [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase()),
    conlang: [entry.Raíz, ...(entry.Léxema || [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase()),
  }));
}

function findMatches(input: string, dictionary: DictEntry[]): { spanish: string; entry: LexiconEntry }[] {
  const tokens = tokenize(input);
  if (!tokens.length) return [];

  const matched = new Map<string, { spanish: string; entry: LexiconEntry }>();

  for (const token of tokens) {
    for (const item of dictionary) {
      for (const s of item.spanish) {
        if (s && token === s) {
          matched.set(s, { spanish: item.entry.Significado?.[0] || s, entry: item.entry });
          break;
        }
      }
    }
  }

  return Array.from(matched.values());
}

function wordOrderParts(order: string): { subject: string[]; verb: string[]; object: string[] } {
  const normalized = order.trim().toUpperCase();
  const orderList = normalized ? normalized.split('') : ['S', 'V', 'O'];
  const valid = orderList.filter((part) => ['S', 'V', 'O'].includes(part));
  if (!valid.length) return { subject: ['S'], verb: ['V'], object: ['O'] };

  return {
    subject: valid.filter((p) => p === 'S'),
    verb: valid.filter((p) => p === 'V'),
    object: valid.filter((p) => p === 'O'),
  };
}

export function translateWithLocalEngine(input: string, lexicon: LexiconEntry[], grammar: GrammarManifest): string {
  if (!input.trim()) return '';

  const dictionary = buildDictionary(lexicon);
  const matches = findMatches(input, dictionary);
  if (!matches.length) {
    return buildOfflineFallback(input, lexicon);
  }

  const parts = wordOrderParts(grammar.typology.wordOrder);
  const chunks = matches.map(({ entry }) => {
    try {
      const realized = realizeLexeme(entry, {}, grammar);
      return {
        spanish: entry.Significado?.[0] || entry.Raíz,
        conlang: realized?.form || entry.Léxema?.[0] || entry.Raíz,
        category: entry.Categoría,
      };
    } catch {
      return {
        spanish: entry.Significado?.[0] || entry.Raíz,
        conlang: entry.Léxema?.[0] || entry.Raíz,
        category: entry.Categoría,
      };
    }
  });

  const byCategory = (category: string) =>
    chunks.filter((c) => c.category === category || (category === 'subject' && ['sustantivo', 'pronombre'].includes(c.category)));

  const ordered = [
    ...parts.subject.flatMap(() => byCategory('sustantivo').slice(0, parts.subject.length)),
    ...parts.verb.flatMap(() => byCategory('verbo').slice(0, parts.verb.length)),
    ...parts.object.flatMap(() => byCategory('sustantivo').slice(0, parts.object.length)),
  ];

  const unique = ordered.filter((item, index) => ordered.findIndex((x) => x.conlang === item.conlang) === index);
  const translation = unique.map((item) => item.conlang).join(' ');
  const gloss = chunks.map((item) => `${item.spanish} → ${item.conlang}`).join('\n');

  const unknown = tokenize(input).filter((token) => !chunks.some((c) => c.spanish.toLowerCase() === token));
  const unknownNote = unknown.length ? `\n[No reconocido: ${unknown.join(', ')}]` : '';

  return `Traducción local (reglas + motor)\n${translation}\n\nGloss:\n${gloss}${unknownNote}`;
}

function buildOfflineFallback(input: string, lexicon: LexiconEntry[]): string {
  const exactMatches = lexicon
    .filter((entry) => [entry.Raíz, ...(entry.Léxema || [])].some((form) => input.toLowerCase() === String(form).toLowerCase()))
    .map((entry) => {
      const form = entry.Léxema?.[0] || entry.Raíz;
      const spanish = entry.Significado?.[0] || entry.Raíz;
      return `${spanish} → ${form}`;
    });

  const partialMatches = lexicon
    .filter((entry) => [entry.Raíz, ...(entry.Léxema || []), ...(entry.Significado || [])].some((candidate) => input.toLowerCase().includes(String(candidate).toLowerCase())))
    .slice(0, 8)
    .map((entry) => {
      const form = entry.Léxema?.[0] || entry.Raíz;
      const spanish = entry.Significado?.[0] || entry.Raíz;
      return `${spanish} → ${form}`;
    });

  const header = exactMatches.length ? 'Coincidencias exactas en el léxico:' : 'Modo offline: no se pudo generar una traducción completa.';
  const body = [...exactMatches, ...partialMatches].join('\n');
  const fallback = body ? `${header}\n${body}` : `${header}\n(Agrega la palabra al léxico o activá IA para traducirla.)`;

  return `${fallback}\n\nFrase original: ${input}`;
}
