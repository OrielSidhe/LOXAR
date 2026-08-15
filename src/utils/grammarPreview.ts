import type { LexiconEntry, GrammarManifest } from '../types';

export const normalizeCategory = (category: string = '') =>
  category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const getEntryLabel = (entry?: LexiconEntry, fallback = '[sin entrada]') => {
  if (!entry) return fallback;
  const lexeme = entry.Léxema?.[0] || entry.Raíz || fallback;
  const meaning = entry.Significado?.[0] ? ` - ${entry.Significado[0]}` : '';
  return `${lexeme}${meaning}`;
};

export const getEntryForm = (entry?: LexiconEntry, fallback = '...') =>
  entry?.Léxema?.[0]?.replace(/^-|-$/g, '') || entry?.Raíz || fallback;

export const getDefaultPreviewEntries = (
  lexicon: LexiconEntry[],
  preview?: GrammarManifest['preview']
) => {
  const byId = (id?: string) => (id ? lexicon.find(entry => entry.ID === id) : undefined);
  const findByCategory = (...terms: string[]) =>
    lexicon.find(entry => {
      const category = normalizeCategory(entry.Categoría);
      return terms.some(term => category.includes(term));
    });

  return {
    subject: byId(preview?.subjectEntryId) || findByCategory('sustantivo', 'pronombre') || lexicon[0],
    verb: byId(preview?.verbEntryId) || findByCategory('verbo') || lexicon[1] || lexicon[0],
    object:
      byId(preview?.objectEntryId) ||
      lexicon.find(entry => entry.ID !== (byId(preview?.subjectEntryId)?.ID) && normalizeCategory(entry.Categoría).includes('sustantivo')) ||
      lexicon[2] ||
      lexicon[0],
  };
};

export const buildPreviewSentence = (manifest: GrammarManifest, lexicon: LexiconEntry[]) => {
  const entries = getDefaultPreviewEntries(lexicon, manifest.preview);
  const affixes = (manifest.affixInventory || []).filter(affix => affix.enabled);

  const applyAffixes = (word: string, category: string) =>
    affixes.reduce((current, affix) => {
      const applies =
        affix.appliesTo.length === 0 ||
        affix.appliesTo.some(target => normalizeCategory(category).includes(normalizeCategory(target)));
      if (!applies) return current;
      if (affix.type === 'prefix') return `${affix.form.replace(/-$/g, '')}${current}`;
      if (affix.type === 'suffix') return `${current}${affix.form.replace(/^-+/g, '')}`;
      const midpoint = Math.max(1, Math.floor(current.length / 2));
      return `${current.slice(0, midpoint)}${affix.form.replace(/^-|-$/g, '')}${current.slice(midpoint)}`;
    }, word);

  const parts = {
    S: applyAffixes(getEntryForm(entries.subject, 'sujeto'), entries.subject?.Categoría || 'sustantivo'),
    V: applyAffixes(getEntryForm(entries.verb, 'verbo'), entries.verb?.Categoría || 'verbo'),
    O: applyAffixes(getEntryForm(entries.object, 'objeto'), entries.object?.Categoría || 'sustantivo'),
  };

  const order = (manifest.typology.wordOrder || 'SVO').toUpperCase().replace('LIBRE', 'SVO').replace('FREE', 'SVO');
  const tokens = (order.match(/[SVO]/g) || ['S', 'V', 'O']).map(key => parts[key as keyof typeof parts]);

  return {
    sentence: tokens.join(' '),
    gloss: (order.match(/[SVO]/g) || ['S', 'V', 'O']).join('-'),
    entries,
  };
};

export const DEFAULT_TYPOLOGY = {
  wordOrder: 'SVO' as const,
  alignment: 'Nominative-Accusative',
  morphology: 'Isolating',
  headDirection: 'Head-Initial',
};

export const isMeaningfulTypology = (t?: GrammarManifest['typology']): boolean =>
  !!t &&
  (t.wordOrder !== DEFAULT_TYPOLOGY.wordOrder ||
    t.alignment !== DEFAULT_TYPOLOGY.alignment ||
    t.morphology !== DEFAULT_TYPOLOGY.morphology ||
    t.headDirection !== DEFAULT_TYPOLOGY.headDirection);
