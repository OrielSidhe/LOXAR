/**
 * inflectionModuleModel.test.ts — logica pura del editor de morfologia.
 *
 * Cubre el arbol de paradigmas (busqueda, mapeo, actualizacion, borrado),
 * la construccion de reglas desde el borrador y la previsualizacion de reglas
 * fonologicas. El preset "Dobles a Simples" ademas fija el escape correcto de
 * la reference inversa (un backslash adicional rompia el preset y disparaba
 * `npm run check:esc`).
 */
import { describe, it, expect } from 'vitest';
import {
  EMPTY_PHONOLOGICAL_DRAFT,
  EMPTY_RULE_DRAFT,
  PHONOLOGICAL_PRESETS,
  addParadigmGroup,
  addPhonologicalRule,
  addRuleToGroup,
  buildRuleFromDraft,
  deletePhonologicalRule,
  deleteParadigmGroup,
  deleteRuleFromGroup,
  findParadigmGroup,
  mapParadigmTree,
  normalizeInflectionProfile,
  previewPhonologicalRules,
  renameParadigmGroup,
  replaceRuleInGroup,
  updateParadigmGroup,
  type NewRuleDraft,
} from '../inflectionModuleModel';
import type { InflectionParadigm, InflectionProfile, InflectionRule, PhonologicalRule } from '../../types';

const simpleRule = (id: string, name: string, template: string): InflectionRule => ({
  id,
  name,
  type: 'simple',
  template,
});

const conditionalRule = (id: string, name: string): InflectionRule => ({
  id,
  name,
  type: 'conditional',
  conditionType: 'endsWith',
  conditionValue: 'a',
  actionType: 'addSuffix',
  actionValue: 's',
});

const group = (id: string, name: string, rules: InflectionRule[] = [], paradigms: InflectionParadigm[] = []): InflectionParadigm => ({
  id,
  name,
  rules,
  paradigms,
});

const emptyProfile = (): InflectionProfile => ({ paradigms: [] });

describe('findParadigmGroup', () => {
  const tree = [
    group('g1', 'Raíz', [simpleRule('r1', 'Uno', '[RAÍZ]o')]),
    group('g2', 'Sub', [], [group('g2a', 'Nieta', [simpleRule('r2', 'Dos', '[RAÍZ]a')])]),
  ];

  it('encuentra el grupo en la raiz y en niveles anidados', () => {
    expect(findParadigmGroup(tree, 'g1')?.name).toBe('Raíz');
    expect(findParadigmGroup(tree, 'g2a')?.name).toBe('Nieta');
  });

  it('devuelve null para un id inexistente', () => {
    expect(findParadigmGroup(tree, 'nope')).toBeNull();
  });
});

describe('mapParadigmTree', () => {
  it('aplica el callback a todos los niveles', () => {
    const tree = [group('g1', 'A', [], [group('g1a', 'B')])];
    const mapped = mapParadigmTree(tree, paradigm => ({ ...paradigm, name: `${paradigm.name}!` }));
    expect(mapped[0].name).toBe('A!');
    expect(mapped[0].paradigms?.[0].name).toBe('B!');
  });

  it('no muta el arbol original', () => {
    const tree = [group('g1', 'A', [], [group('g1a', 'B')])];
    mapParadigmTree(tree, paradigm => ({ ...paradigm, name: 'X' }));
    expect(tree[0].name).toBe('A');
    expect(tree[0].paradigms?.[0].name).toBe('B');
  });
});

describe('deleteParadigmGroup', () => {
  it('elimina un grupo de la raiz y deja intactos los hermanos', () => {
    const tree = [group('g1', 'A'), group('g2', 'B'), group('g3', 'C')];
    const next = deleteParadigmGroup(tree, 'g2');
    expect(next.map(p => p.id)).toEqual(['g1', 'g3']);
  });

  it('elimina un grupo anidado', () => {
    const tree = [group('g1', 'A', [], [group('g1a', 'B'), group('g1b', 'C')])];
    const next = deleteParadigmGroup(tree, 'g1a');
    expect(next).toHaveLength(1);
    expect(next[0].paradigms?.map(p => p.id)).toEqual(['g1b']);
  });

  it('devuelve un arbol equivalente si el id no existe', () => {
    const tree = [group('g1', 'A')];
    expect(deleteParadigmGroup(tree, 'nope')).toEqual(tree);
  });
});

describe('updateParadigmGroup', () => {
  it('parchea el grupo por id, tambien anidado', () => {
    const tree = [group('g1', 'A', [], [group('g1a', 'B')])];
    const next = updateParadigmGroup(tree, 'g1a', { name: 'B2' });
    expect(next[0].paradigms?.[0].name).toBe('B2');
    expect(next[0].name).toBe('A');
  });
});

describe('addParadigmGroup', () => {
  it('anade en la raiz con rules/paradigms/appliesTo vacios y nombre recortado', () => {
    const next = addParadigmGroup(emptyProfile(), '  1ª conjugación  ', null);
    expect(next.paradigms).toHaveLength(1);
    expect(next.paradigms[0]).toMatchObject({
      name: '1ª conjugación',
      rules: [],
      paradigms: [],
      appliesTo: [],
    });
    expect(next.paradigms[0].id).toMatch(/^group_/);
  });

  it('anade dentro del padre indicado', () => {
    const profile: InflectionProfile = { paradigms: [group('g1', 'A')] };
    const next = addParadigmGroup(profile, 'B', 'g1');
    expect(next.paradigms).toHaveLength(1);
    expect(next.paradigms[0].paradigms?.map(p => p.name)).toEqual(['B']);
  });

  it('ignora nombre en blanco o padre inexistente', () => {
    const profile: InflectionProfile = { paradigms: [group('g1', 'A')] };
    expect(addParadigmGroup(profile, '   ', null)).toBe(profile);
    expect(addParadigmGroup(profile, 'B', 'nope')).toBe(profile);
  });
});

describe('buildRuleFromDraft', () => {
  it('construye una regla simple con plantilla', () => {
    const draft: NewRuleDraft = { ...EMPTY_RULE_DRAFT, name: 'Plural', template: '[RAÍZ]s' };
    expect(buildRuleFromDraft(draft)).toMatchObject({
      name: 'Plural',
      type: 'simple',
      template: '[RAÍZ]s',
    });
  });

  it('construye una regla condicional con sus cuatro campos', () => {
    const draft: NewRuleDraft = {
      ...EMPTY_RULE_DRAFT,
      name: 'Vocálica',
      type: 'conditional',
      conditionType: 'endsWith',
      conditionValue: 'a',
      actionType: 'addSuffix',
      actionValue: 's',
    };
    expect(buildRuleFromDraft(draft)).toMatchObject({
      name: 'Vocálica',
      type: 'conditional',
      conditionType: 'endsWith',
      conditionValue: 'a',
      actionType: 'addSuffix',
      actionValue: 's',
    });
  });

  it('rechaza borradores incompletos', () => {
    expect(buildRuleFromDraft({ ...EMPTY_RULE_DRAFT, name: '  ' })).toBeNull();
    expect(buildRuleFromDraft({ ...EMPTY_RULE_DRAFT, name: 'X', template: '  ' })).toBeNull();
    expect(
      buildRuleFromDraft({ ...EMPTY_RULE_DRAFT, name: 'X', type: 'conditional', conditionValue: ' ' }),
    ).toBeNull();
  });
});

describe('reglas dentro del grupo', () => {
  const profile: InflectionProfile = {
    paradigms: [group('g1', 'A', [simpleRule('r1', 'Uno', '[RAÍZ]o')])],
  };

  it('anade la regla construida desde el borrador', () => {
    const next = addRuleToGroup(profile, 'g1', {
      ...EMPTY_RULE_DRAFT,
      name: 'Dos',
      template: '[RAÍZ]a',
    });
    expect(next.paradigms[0].rules.map(r => r.name)).toEqual(['Uno', 'Dos']);
  });

  it('no anade si el borrador es invalido o el grupo no existe', () => {
    expect(addRuleToGroup(profile, 'g1', EMPTY_RULE_DRAFT)).toBe(profile);
    expect(addRuleToGroup(profile, 'nope', { ...EMPTY_RULE_DRAFT, name: 'Dos' })).toBe(profile);
  });

  it('elimina la regla por id', () => {
    const next = deleteRuleFromGroup(profile, 'g1', 'r1');
    expect(next.paradigms[0].rules).toHaveLength(0);
    expect(deleteRuleFromGroup(profile, 'g1', 'nope').paradigms[0].rules).toHaveLength(1);
  });

  it('reemplaza la regla editada conservando su id', () => {
    const edited: InflectionRule = { id: 'r1', name: 'Uno editada', type: 'simple', template: '[RAÍZ]os' };
    const next = replaceRuleInGroup(profile, 'g1', edited);
    expect(next.paradigms[0].rules).toHaveLength(1);
    expect(next.paradigms[0].rules[0]).toMatchObject({ id: 'r1', name: 'Uno editada' });
  });
});

describe('renameParadigmGroup', () => {
  it('renombra con el texto recortado', () => {
    const profile: InflectionProfile = { paradigms: [group('g1', 'A')] };
    expect(renameParadigmGroup(profile, 'g1', '  B  ').paradigms[0].name).toBe('B');
  });

  it('ignora un nombre en blanco', () => {
    const profile: InflectionProfile = { paradigms: [group('g1', 'A')] };
    expect(renameParadigmGroup(profile, 'g1', '   ')).toBe(profile);
  });
});

describe('reglas fonologicas', () => {
  it('anade con id y requiere nombre y patron', () => {
    const draft = { ...EMPTY_PHONOLOGICAL_DRAFT, name: 'Nasal', matchPattern: 'np', replacement: 'mp' };
    const next = addPhonologicalRule(emptyProfile(), draft);
    expect(next.phonologicalRules).toHaveLength(1);
    expect(next.phonologicalRules?.[0]).toMatchObject({ name: 'Nasal', matchPattern: 'np', replacement: 'mp' });
    expect(next.phonologicalRules?.[0].id).toMatch(/^phono_/);

    const profile = emptyProfile();
    expect(addPhonologicalRule(profile, { ...draft, name: '' })).toBe(profile);
    expect(addPhonologicalRule(profile, { ...draft, matchPattern: '' })).toBe(profile);
  });

  it('elimina por id', () => {
    const profile = addPhonologicalRule(emptyProfile(), {
      ...EMPTY_PHONOLOGICAL_DRAFT,
      name: 'Nasal',
      matchPattern: 'np',
      replacement: 'mp',
    });
    const id = profile.phonologicalRules?.[0].id as string;
    expect(deletePhonologicalRule(profile, id).phonologicalRules).toHaveLength(0);
  });
});

describe('previewPhonologicalRules', () => {
  it('aplica reglas literales en orden', () => {
    const rules: PhonologicalRule[] = [
      { id: 'p1', name: 'a', matchPattern: 's', replacement: 'h', isRegex: false },
      { id: 'p2', name: 'b', matchPattern: 'h', replacement: 'j', isRegex: false },
    ];
    expect(previewPhonologicalRules(rules, 'sol')).toBe('jol');
  });

  it('aplica regex globales', () => {
    const rules: PhonologicalRule[] = [
      { id: 'p1', name: 'vocal', matchPattern: '[aeiou]', replacement: 'i', isRegex: true },
    ];
    expect(previewPhonologicalRules(rules, 'sol')).toBe('sil');
  });

  it('ignora una regex invalida y continua con las siguientes', () => {
    const rules: PhonologicalRule[] = [
      { id: 'p1', name: 'rota', matchPattern: '(', replacement: 'x', isRegex: true },
      { id: 'p2', name: 's->h', matchPattern: 's', replacement: 'h', isRegex: false },
    ];
    expect(previewPhonologicalRules(rules, 'sol')).toBe('hol');
  });

  it('el preset "Dobles a Simples" reduce duplicados (reference inversa correcta)', () => {
    const preset = PHONOLOGICAL_PRESETS.find(rule => rule.name === 'Dobles a Simples');
    expect(preset).toBeDefined();
    const rule: PhonologicalRule = { ...(preset as NonNullable<typeof preset>), id: 'p1' };
    // Un unico backslash: la reference inversa \1 debe construir la regex (.)\1.
    expect(rule.matchPattern).toBe(String.raw`(.)\1`);
    expect(previewPhonologicalRules([rule], 'aabb')).toBe('ab');
  });
});

describe('normalizeInflectionProfile', () => {
  it('garantiza paradigms aunque el perfil sea nulo', () => {
    expect(normalizeInflectionProfile(null)).toEqual({ paradigms: [] });
    expect(normalizeInflectionProfile(undefined)).toEqual({ paradigms: [] });
  });

  it('conserva las reglas fonologicas existentes', () => {
    const rules: PhonologicalRule[] = [
      { id: 'p1', name: 'Nasal', matchPattern: 'np', replacement: 'mp', isRegex: false },
    ];
    const profile: InflectionProfile = { paradigms: [group('g1', 'A')], phonologicalRules: rules };
    expect(normalizeInflectionProfile(profile)).toEqual(profile);
  });
});
