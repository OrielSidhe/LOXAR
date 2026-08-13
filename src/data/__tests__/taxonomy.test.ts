import assert from 'node:assert';
import { describe, test } from 'vitest';
import {
  resolveLexicalCategory,
  resolveGrammaticalRole,
  resolveMorphemeKind,
  resolveAffixPosition,
  resolveNodeType,
  resolveConnectionType,
  displayOf,
  displayOfRole,
  displayOfMorphemeKind,
  displayOfAffixPosition,
  getAncestors,
  getDescendants,
  isSubcategory,
  getRootCategories,
  getChildren,
  LEXICAL_CATEGORIES,
  GRAMMATICAL_ROLES,
  MORPHEME_KINDS,
  AFFIX_POSITIONS,
  DEFAULT_CATEGORIES,
  STANDARD_CATEGORIES_KEYS,
} from '../taxonomy';

describe('taxonomy', () => {
  test('resolveLexicalCategory canonical keys', () => {
    assert(resolveLexicalCategory('sustantivo') === 'sustantivo', 'sustantivo → sustantivo');
    assert(resolveLexicalCategory('verbo') === 'verbo', 'verbo → verbo');
    assert(resolveLexicalCategory('preposicion') === 'preposicion', 'preposicion (sin tilde) → preposicion');
    assert(resolveLexicalCategory('preposición') === 'preposicion', 'preposición (CON tilde) → preposicion (canonical sin tilde)');
    assert(resolveLexicalCategory('conjuncion') === 'conjuncion', 'conjuncion → conjuncion');
    assert(resolveLexicalCategory('conjunción') === 'conjuncion', 'conjunción → conjuncion');
    assert(resolveLexicalCategory('interjeccion') === 'interjeccion', 'interjeccion → interjeccion');
    assert(resolveLexicalCategory('interjección') === 'interjeccion', 'interjección → interjeccion');
    assert(resolveLexicalCategory('articulo') === 'articulo', 'articulo → articulo');
    assert(resolveLexicalCategory('artículo') === 'articulo', 'artículo → articulo');
    assert(resolveLexicalCategory('frase_verbal') === 'frase_verbal', 'frase_verbal → frase_verbal');
    assert(resolveLexicalCategory('frase verbal') === 'frase_verbal', 'frase verbal (con espacio) → frase_verbal');
    assert(resolveLexicalCategory('desconocida') === 'desconocida', 'desconocida → desconocida');
  });

  test('resolveLexicalCategory aliases', () => {
    assert(resolveLexicalCategory('noun') === 'sustantivo', 'noun → sustantivo');
    assert(resolveLexicalCategory('Noun') === 'sustantivo', 'Noun (mayúscula) → sustantivo');
    assert(resolveLexicalCategory('nombre') === 'sustantivo', 'nombre → sustantivo');
    assert(resolveLexicalCategory('verb') === 'verbo', 'verb → verbo');
    assert(resolveLexicalCategory('accion') === 'verbo', 'accion → verbo');
    assert(resolveLexicalCategory('adj') === 'adjetivo', 'adj → adjetivo');
    assert(resolveLexicalCategory('prep') === 'preposicion', 'prep → preposicion');
    assert(resolveLexicalCategory('conj') === 'conjuncion', 'conj → conjuncion');
    assert(resolveLexicalCategory('interj') === 'interjeccion', 'interj → interjeccion');
    assert(resolveLexicalCategory('art') === 'articulo', 'art → articulo');
    assert(resolveLexicalCategory('det') === 'determinante', 'det → determinante');
    assert(resolveLexicalCategory('sn') === 'sustantivo', 'sn → sustantivo');
    assert(resolveLexicalCategory('v') === 'verbo', 'v → verbo');
  });

  test('resolveLexicalCategory fallbacks', () => {
    assert(resolveLexicalCategory('') === 'desconocida', 'string vacío → desconocida');
    assert(resolveLexicalCategory('   ') === 'desconocida', 'espacios → desconocida');
    assert(resolveLexicalCategory(undefined) === 'desconocida', 'undefined → desconocida');
    assert(resolveLexicalCategory(null) === 'desconocida', 'null → desconocida');
    assert(resolveLexicalCategory('categoria_inexistente') === 'desconocida', 'key inexistente → desconocida');
    assert(resolveLexicalCategory('xyz') === 'desconocida', 'xyz → desconocida');
  });

  test('resolveLexicalCategory subcategories', () => {
    assert(resolveLexicalCategory('pronombre') === 'pronombre', 'pronombre → pronombre');
    assert(resolveLexicalCategory('pronoun') === 'pronombre', 'pronoun → pronombre');
    assert(resolveLexicalCategory('prefijo') === 'prefijo', 'prefijo → prefijo');
    assert(resolveLexicalCategory('prefix') === 'prefijo', 'prefix → prefijo');
    assert(resolveLexicalCategory('sufijo') === 'sufijo', 'sufijo → sufijo');
    assert(resolveLexicalCategory('suffix') === 'sufijo', 'suffix → sufijo');
    assert(resolveLexicalCategory('desinencia') === 'desinencia', 'desinencia → desinencia');
    assert(resolveLexicalCategory('desinence') === 'desinencia', 'desinence → desinencia');
    assert(resolveLexicalCategory('ending') === 'desinencia', 'ending → desinencia');
    assert(resolveLexicalCategory('circunfijo') === 'circunfijo', 'circunfijo → circunfijo');
    assert(resolveLexicalCategory('circumfix') === 'circunfijo', 'circumfix → circunfijo');
    assert(resolveLexicalCategory('particula') === 'particula', 'particula → particula');
  });

  test('resolveGrammaticalRole canonical and aliases', () => {
    assert(resolveGrammaticalRole('root') === 'root', 'root → root');
    assert(resolveGrammaticalRole('raiz') === 'root', 'raiz → root');
    assert(resolveGrammaticalRole('raíz') === 'root', 'raíz → root');
    assert(resolveGrammaticalRole('subject') === 'subject', 'subject → subject');
    assert(resolveGrammaticalRole('sujeto') === 'subject', 'sujeto → subject');
    assert(resolveGrammaticalRole('object') === 'object', 'object → object');
    assert(resolveGrammaticalRole('objeto') === 'object', 'objeto → object');
    assert(resolveGrammaticalRole('modifier') === 'modifier', 'modifier → modifier');
    assert(resolveGrammaticalRole('modificador') === 'modifier', 'modificador → modifier');
    assert(resolveGrammaticalRole('particle') === 'particle', 'particle → particle');
    assert(resolveGrammaticalRole('particula') === 'particle', 'particula → particle');
    assert(resolveGrammaticalRole('auxiliary_verb') === 'auxiliary_verb', 'auxiliary_verb → auxiliary_verb');
    assert(resolveGrammaticalRole('clitic') === 'clitic', 'clitic → clitic');
    assert(resolveGrammaticalRole('connector') === 'connector', 'connector → connector');
    assert(resolveGrammaticalRole('nexo') === 'connector', 'nexo → connector');
  });

  test('resolveGrammaticalRole fallback', () => {
    assert(resolveGrammaticalRole(undefined) === 'root', 'undefined → root (fallback)');
    assert(resolveGrammaticalRole('') === 'root', 'empty → root');
    assert(resolveGrammaticalRole('unknown_role') === 'unknown_role', 'role desconocida → input tal cual (no fuerza canonical)');
  });

  test('resolveMorphemeKind', () => {
    assert(resolveMorphemeKind('stem') === 'stem', 'stem → stem');
    assert(resolveMorphemeKind('raiz') === 'stem', 'raiz → stem');
    assert(resolveMorphemeKind('affix') === 'affix', 'affix → affix');
    assert(resolveMorphemeKind('afijo') === 'affix', 'afijo → affix');
    assert(resolveMorphemeKind('mutation') === 'mutation', 'mutation → mutation');
    assert(resolveMorphemeKind('mutacion') === 'mutation', 'mutacion → mutation');
    assert(resolveMorphemeKind('tone') === 'tone', 'tone → tone');
    assert(resolveMorphemeKind('tono') === 'tone', 'tono → tone');
    assert(resolveMorphemeKind('particle') === 'particle', 'particle → particle');
  });

  test('resolveAffixPosition', () => {
    assert(resolveAffixPosition('prefix') === 'prefix', 'prefix → prefix');
    assert(resolveAffixPosition('prefijo') === 'prefix', 'prefijo → prefix');
    assert(resolveAffixPosition('suffix') === 'suffix', 'suffix → suffix');
    assert(resolveAffixPosition('sufijo') === 'suffix', 'sufijo → suffix');
    assert(resolveAffixPosition('infix') === 'infix', 'infix → infix');
    assert(resolveAffixPosition('infijo') === 'infix', 'infijo → infix');
    assert(resolveAffixPosition('circumfix') === 'circumfix', 'circumfix → circumfix');
    assert(resolveAffixPosition('circunfijo') === 'circumfix', 'circunfijo → circumfix');
  });

  test('resolveNodeType', () => {
    assert(resolveNodeType('clause') === 'clause', 'clause → clause');
    assert(resolveNodeType('oracion') === 'clause', 'oración → clause');
    assert(resolveNodeType('phrase') === 'phrase', 'phrase → phrase');
    assert(resolveNodeType('frase') === 'phrase', 'frase → phrase');
    assert(resolveNodeType('lexeme') === 'lexeme', 'lexeme → lexeme');
    assert(resolveNodeType('lexema') === 'lexema', 'lexema → lexema');
  });

  test('resolveConnectionType', () => {
    assert(resolveConnectionType('dependency') === 'dependency', 'dependency → dependency');
    assert(resolveConnectionType('dependencia') === 'dependency', 'dependencia → dependency');
    assert(resolveConnectionType('constituent') === 'constituent', 'constituent → constituent');
    assert(resolveConnectionType('constituyente') === 'constituyente', 'constituyente → constituyente');
  });

  test('displayOf and displayOfRole', () => {
    assert(displayOf('sustantivo') === 'Sustantivo', 'displayOf sustantivo');
    assert(displayOf('verbo') === 'Verbo', 'displayOf verbo');
    assert(displayOfRole('subject') === 'Sujeto', 'displayOfRole subject');
    assert(displayOfRole('object') === 'Objeto', 'displayOfRole object');
  });

  test('hierarchy and ancestry', () => {
    assert(isSubcategory('pronombre', 'sustantivo'), 'pronombre es subcategoría de sustantivo');
    assert(getAncestors('pronombre').includes('sustantivo'), 'ancestros de pronombre incluye sustantivo');
    assert(getDescendants('sustantivo').includes('pronombre'), 'descendientes de sustantivo incluye pronombre');
    assert(getRootCategories().some(c => c.key === 'sustantivo'), 'sustantivo es categoría raíz');
    assert(getRootCategories().some(c => c.key === 'verbo'), 'verbo es categoría raíz');
    assert(getChildren('sustantivo').some(c => c.key === 'pronombre'), 'hijos de sustantivo incluye pronombre');
  });

  test('DEFAULT_CATEGORIES == STANDARD_CATEGORIES_KEYS', () => {
    assert(JSON.stringify(DEFAULT_CATEGORIES) === JSON.stringify(STANDARD_CATEGORIES_KEYS), 'DEFAULT_CATEGORIES == STANDARD_CATEGORIES_KEYS');
  });
});
