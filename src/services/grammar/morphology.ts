import type { GrammarManifest, LexiconEntry, MorphemeSegment, MutationRule } from '../../types';
import type { SurfaceForm } from './engineTypes';

const VOWELS = 'aeiouáéíóúüAEIOUÁÉÍÓÚÜ';

const isVowel = (c: string) => VOWELS.includes(c);

const stemOf = (lexeme: LexiconEntry): string => lexeme.Léxema?.[0] || lexeme.Raíz || '';

const matchFeatureKey = (key: string, features: Record<string, string>): boolean => {
  const clauses = key.split('&').map(s => s.trim());
  return clauses.every(c => {
    const [f, v] = c.split('=').map(s => s.trim());
    return features[f] === v;
  });
};

const evalWhen = (when: string, ctx: { preceding: string; isFirst: boolean }): boolean => {
  switch (when) {
    case 'always': return true;
    case 'prevVowel': return isVowel(ctx.preceding);
    case 'afterConsonant': return ctx.preceding.length > 0 && !isVowel(ctx.preceding);
    case 'wordInitial': return ctx.isFirst;
    default: return false;
  }
};

// CORRECTED: keep the affix's literal form (including its '-' notation) so output is e.g. 'tens-t-il'.
const applyAffix = (form: string, position: string, affix: string): string => {
  if (position === 'prefix') return affix + form;
  if (position === 'suffix') return form + affix;
  if (position === 'infix') {
    const mid = Math.max(1, Math.floor(form.length / 2));
    return form.slice(0, mid) + affix + form.slice(mid);
  }
  if (position === 'circumfix') {
    const [pre, sur] = affix.split('^');
    return (pre || '') + form + (sur || '');
  }
  return form;
};

const applyMutation = (form: string, ruleId: string, rules: MutationRule[]): string => {
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) return form;
  try { return form.replace(new RegExp(rule.pattern, 'g'), rule.replacement); }
  catch { return form; }
};

const chooseRealization = (slot: any, ctx: { preceding: string; isFirst: boolean }) => {
  const alts = slot.allomorphs || [];
  const hit = alts.find((a: any) => evalWhen(a.when, ctx));
  return hit ? hit.realization : slot.realization;
};

export const realizeLexeme = (
  lexeme: LexiconEntry,
  features: Record<string, string>,
  manifest: GrammarManifest,
): SurfaceForm => {
  const supp = lexeme.exceptions?.find(e => matchFeatureKey(e.featureKey, features));
  if (supp) return {
    form: supp.surfaceForm,
    source: 'suppletion',
    applied: [supp.featureKey],
    segments: [{ kind: 'stem', form: supp.surfaceForm, feature: supp.featureKey }],
  };

  let form = stemOf(lexeme);
  const segments: MorphemeSegment[] = [{ kind: 'stem', form }];
  const paradigm = (manifest.paradigms ?? []).find(p => p.category === lexeme.Categoría);
  const slots = (paradigm?.slots ?? [])
    .filter(s => features[s.feature] !== undefined)
    .sort((a, b) => a.order - b.order);

  const freeMorphemes: string[] = [];
  slots.forEach((slot, idx) => {
    const real = chooseRealization(slot, { preceding: form.slice(-1), isFirst: idx === 0 });
    switch (real.kind) {
      case 'affix':
        form = applyAffix(form, real.position, real.form);
        segments.push({ kind: 'affix', form: real.form, feature: slot.feature, position: real.position });
        break;
      case 'mutation':
        form = applyMutation(form, real.ruleId, manifest.mutationRules ?? []);
        segments.push({ kind: 'mutation', ruleId: real.ruleId, feature: slot.feature, form: real.ruleId });
        break;
      case 'tone':
        form = applyMutation(form, real.ruleId, manifest.mutationRules ?? []);
        segments.push({ kind: 'tone', ruleId: real.ruleId, feature: slot.feature, form: real.ruleId });
        break;
      case 'stem':
        form = real.replace;
        segments[0] = { kind: 'stem', form: real.replace, feature: slot.feature };
        break;
      case 'particle':
        freeMorphemes.push(real.form);
        segments.push({ kind: 'particle', form: real.form, feature: slot.feature });
        break;
    }
  });

  return {
    form,
    source: 'rule',
    applied: slots.map(s => s.feature),
    segments,
    ...(freeMorphemes.length ? { freeMorphemes } : {}),
  };
};
