/**
 * inflectionModuleModel — logica pura del modulo de morfologia (flexion).
 *
 * La app ya persiste `InflectionProfile` por lexico (`useLexicon.activeInflectionProfile`
 * + `updateInflectionProfile`) y ya aplica las reglas (`services/inflectionService`),
 * pero no existia un editor de paradigmas: `InflectionModal`/`InflectionView` estaban
 * escritos y nunca montados. Este modelo concentra las operaciones de arbol de
 * paradigmas (agregar/renombrar/eliminar grupos y reglas, presets fonologicos y
 * previsualizacion) para que el componente sea solo estado UI + render.
 *
 * Reglas del dominio preservadas de `InflectionModal.tsx`:
 *  - los ids se generan con `Date.now()` + sufijo (`group_`, `rule_`, `phono_`);
 *  - un grupo nuevo nace con `rules: []`, `paradigms: []` y `appliesTo: []`;
 *  - `mapParadigmsRecursively` aplica el callback y luego baja por los hijos;
 *  - `deleteGroupRecursively` filtra el id y limpia `paradigms` vacios.
 */

import type { InflectionParadigm, InflectionProfile, InflectionRule, PhonologicalRule } from '../types';

/** Estado del formulario de regla simple/condicional (el editor lo resetea despues de anadir). */
export interface NewRuleDraft {
  name: string;
  type: 'simple' | 'conditional';
  template: string;
  conditionType: 'endsWith' | 'startsWith' | 'contains';
  conditionValue: string;
  actionType: 'replaceEnding' | 'addSuffix' | 'addPrefix';
  actionValue: string;
}

export const EMPTY_RULE_DRAFT: NewRuleDraft = {
  name: '',
  type: 'simple',
  template: '[RAÍZ]',
  conditionType: 'endsWith',
  conditionValue: '',
  actionType: 'replaceEnding',
  actionValue: '',
};

export interface NewPhonologicalRuleDraft {
  name: string;
  matchPattern: string;
  replacement: string;
  isRegex: boolean;
}

export const EMPTY_PHONOLOGICAL_DRAFT: NewPhonologicalRuleDraft = {
  name: '',
  matchPattern: '',
  replacement: '',
  isRegex: false,
};

/** Presets fonologicos ofrecidos por el editor (mismos valores que el modal original). */
export const PHONOLOGICAL_PRESETS: NewPhonologicalRuleDraft[] = [
  { name: 'Nasales (np->mp)', matchPattern: 'np', replacement: 'mp', isRegex: false },
  { name: 'Debasalamiento (s->h)', matchPattern: 's', replacement: 'h', isRegex: false },
  { name: 'Vocal Final', matchPattern: '[aeiou]$', replacement: '', isRegex: true },
  { name: 'Dobles a Simples', matchPattern: '(.)\\1', replacement: '$1', isRegex: true },
];

let idCounter = 0;

/** Id unico dentro del perfil; `Date.now()` conserva el contrato original. */
const makeId = (prefix: string): string => `${prefix}_${Date.now()}_${(idCounter++).toString(36)}`;

/** Busca un grupo por id en el arbol (incluye sub-paradigmas). */
export const findParadigmGroup = (
  paradigms: InflectionParadigm[],
  groupId: string,
): InflectionParadigm | null => {
  for (const paradigm of paradigms) {
    if (paradigm.id === groupId) return paradigm;
    if (paradigm.paradigms) {
      const found = findParadigmGroup(paradigm.paradigms, groupId);
      if (found) return found;
    }
  }
  return null;
};

/** Aplica `callback` a cada nodo del arbol, de arriba hacia abajo. */
export const mapParadigmTree = (
  paradigms: InflectionParadigm[],
  callback: (paradigm: InflectionParadigm) => InflectionParadigm,
): InflectionParadigm[] =>
  paradigms.map(paradigm => {
    const next = callback(paradigm);
    if (next.paradigms) next.paradigms = mapParadigmTree(next.paradigms, callback);
    return next;
  });

/** Elimina el grupo con `groupId` en cualquier nivel y limpia `paradigms` vacios. */
export const deleteParadigmGroup = (
  paradigms: InflectionParadigm[],
  groupId: string,
): InflectionParadigm[] =>
  paradigms
    .filter(paradigm => paradigm.id !== groupId)
    .map(paradigm => ({
      ...paradigm,
      paradigms: paradigm.paradigms ? deleteParadigmGroup(paradigm.paradigms, groupId) : undefined,
    }));

/** Actualiza un grupo por id con un patch parcial. */
export const updateParadigmGroup = (
  paradigms: InflectionParadigm[],
  groupId: string,
  updates: Partial<InflectionParadigm>,
): InflectionParadigm[] =>
  mapParadigmTree(paradigms, paradigm =>
    paradigm.id === groupId ? { ...paradigm, ...updates } : paradigm,
  );

/** Anade un grupo nuevo en la raiz o dentro de `parentId` (si existe). */
export const addParadigmGroup = (
  profile: InflectionProfile,
  name: string,
  parentId: string | null,
): InflectionProfile => {
  const trimmed = name.trim();
  if (!trimmed) return profile;
  const group: InflectionParadigm = {
    id: makeId('group'),
    name: trimmed,
    rules: [],
    paradigms: [],
    appliesTo: [],
  };
  if (parentId === null) {
    return { ...profile, paradigms: [...profile.paradigms, group] };
  }
  const parent = findParadigmGroup(profile.paradigms, parentId);
  if (!parent) return profile;
  return {
    ...profile,
    paradigms: updateParadigmGroup(profile.paradigms, parentId, {
      paradigms: [...(parent.paradigms || []), group],
    }),
  };
};

/** Construye la regla a partir del borrador; `null` si el borrador es invalido. */
export const buildRuleFromDraft = (draft: NewRuleDraft): InflectionRule | null => {
  const name = draft.name.trim();
  if (!name) return null;
  if (draft.type === 'simple') {
    const template = draft.template.trim();
    if (!template) return null;
    return { id: makeId('rule'), name, type: 'simple', template };
  }
  const conditionValue = draft.conditionValue.trim();
  if (!conditionValue) return null;
  return {
    id: makeId('rule'),
    name,
    type: 'conditional',
    conditionType: draft.conditionType,
    conditionValue,
    actionType: draft.actionType,
    actionValue: draft.actionValue.trim(),
  };
};

/** Anade la regla construida desde el borrador al grupo seleccionado. */
export const addRuleToGroup = (
  profile: InflectionProfile,
  groupId: string,
  draft: NewRuleDraft,
): InflectionProfile => {
  const rule = buildRuleFromDraft(draft);
  if (!rule) return profile;
  const group = findParadigmGroup(profile.paradigms, groupId);
  if (!group) return profile;
  return {
    ...profile,
    paradigms: updateParadigmGroup(profile.paradigms, groupId, {
      rules: [...group.rules, rule],
    }),
  };
};

/** Elimina la regla `ruleId` del grupo `groupId`. */
export const deleteRuleFromGroup = (
  profile: InflectionProfile,
  groupId: string,
  ruleId: string,
): InflectionProfile => {
  const group = findParadigmGroup(profile.paradigms, groupId);
  if (!group) return profile;
  return {
    ...profile,
    paradigms: updateParadigmGroup(profile.paradigms, groupId, {
      rules: group.rules.filter(rule => rule.id !== ruleId),
    }),
  };
};

/** Reemplaza la regla editada dentro del grupo. */
export const replaceRuleInGroup = (
  profile: InflectionProfile,
  groupId: string,
  rule: InflectionRule,
): InflectionProfile => {
  const group = findParadigmGroup(profile.paradigms, groupId);
  if (!group) return profile;
  return {
    ...profile,
    paradigms: updateParadigmGroup(profile.paradigms, groupId, {
      rules: group.rules.map(current => (current.id === rule.id ? rule : current)),
    }),
  };
};

/** Renombra un grupo por id. */
export const renameParadigmGroup = (
  profile: InflectionProfile,
  groupId: string,
  name: string,
): InflectionProfile => {
  const trimmed = name.trim();
  if (!trimmed) return profile;
  return { ...profile, paradigms: updateParadigmGroup(profile.paradigms, groupId, { name: trimmed }) };
};

/** Anade una regla fonologica nueva (o el preset elegido) al perfil. */
export const addPhonologicalRule = (
  profile: InflectionProfile,
  draft: NewPhonologicalRuleDraft,
): InflectionProfile => {
  if (!draft.name || !draft.matchPattern) return profile;
  const rule: PhonologicalRule = { ...draft, id: makeId('phono') };
  return { ...profile, phonologicalRules: [...(profile.phonologicalRules || []), rule] };
};

/** Elimina la regla fonologica `id`. */
export const deletePhonologicalRule = (profile: InflectionProfile, id: string): InflectionProfile => ({
  ...profile,
  phonologicalRules: (profile.phonologicalRules || []).filter(rule => rule.id !== id),
});

/**
 * Previsualiza la aplicacion encadenada de las reglas fonologicas sobre `input`.
 * Una regex invalida se ignora (mismo contrato que el modal original: `catch` vacio).
 */
export const previewPhonologicalRules = (
  rules: PhonologicalRule[],
  input: string,
): string => {
  let result = input;
  for (const rule of rules) {
    try {
      if (rule.isRegex) {
        result = result.replace(new RegExp(rule.matchPattern, 'g'), rule.replacement);
      } else {
        result = result.split(rule.matchPattern).join(rule.replacement);
      }
    } catch {
      // Regex invalida: se ignora y se continua con la siguiente regla.
    }
  }
  return result;
};

/** Normaliza el perfil para el editor: `paradigms` siempre es un array. */
export const normalizeInflectionProfile = (
  profile: InflectionProfile | null | undefined,
): InflectionProfile => ({
  paradigms: profile?.paradigms ?? [],
  ...(profile?.phonologicalRules ? { phonologicalRules: profile.phonologicalRules } : {}),
});
