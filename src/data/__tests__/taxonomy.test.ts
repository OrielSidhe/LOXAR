/**
 * taxonomy.test.ts
 * ----------------------------------------------------------------------------
 * Tests unitarios del resolver Taxonomy de LOXAR.
 * Cobertura: resolveLexicalCategory, resolveGrammaticalRole,
 *            resolveMorphemeKind, resolveAffixPosition, resolveNodeType,
 *            resolveConnectionType, jerarquía (ancestros/descendientes),
 *            displayOf, and the unificador-duplicados fix (desconocido→desconocida).
 *
 * Ejecutar: npx tsx src/data/__tests__/taxonomy.test.ts
 * ----------------------------------------------------------------------------
 */
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

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n── ${name} ──`);
}

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveLexicalCategory — canonical keys (sin acentos)');

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

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveLexicalCategory — aliases (inglés, variantes)');

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

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveLexicalCategory — fix B1: desconocido → desconocida');

assert(resolveLexicalCategory('desconocido') === 'desconocida', 'desconocido (masc) → desconocida (fem, canonical)');
assert(resolveLexicalCategory('desconocida') === 'desconocida', 'desconocida → desconocida');
assert(resolveLexicalCategory('unknown') === 'desconocida', 'unknown → desconocida');
assert(resolveLexicalCategory('n/a') === 'desconocida', 'n/a → desconocida');
assert(resolveLexicalCategory('sin clasificar') === 'desconocida', 'sin clasificar → desconocida');
assert(resolveLexicalCategory('pendiente') === 'desconocida', 'pendiente → desconocida');
assert(resolveLexicalCategory('?') === 'desconocida', '? → desconocida');
assert(resolveLexicalCategory('-') === 'desconocida', '- → desconocida');
assert(resolveLexicalCategory('n.a') === 'desconocida', 'n.a → desconocida');
assert(resolveLexicalCategory('na') === 'desconocida', 'na → desconocida');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveLexicalCategory — fallback seguros (nunca lanza)');

assert(resolveLexicalCategory('') === 'desconocida', 'string vacío → desconocida');
assert(resolveLexicalCategory('   ') === 'desconocida', 'espacios → desconocida');
assert(resolveLexicalCategory(undefined) === 'desconocida', 'undefined → desconocida');
assert(resolveLexicalCategory(null) === 'desconocida', 'null → desconocida');
assert(resolveLexicalCategory('categoria_inexistente') === 'desconocida', 'key inexistente → desconocida');
assert(resolveLexicalCategory('xyz') === 'desconocida', 'xyz → desconocida');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveLexicalCategory — subcategorías');

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

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveGrammaticalRole — canonical + aliases');

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

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveGrammaticalRole — fallback seguro');

assert(resolveGrammaticalRole(undefined) === 'root', 'undefined → root (fallback)');
assert(resolveGrammaticalRole('') === 'root', 'empty → root');
assert(resolveGrammaticalRole('unknown_role') === 'unknown_role', 'role desconocida → input tal cual (no fuerza canonical)');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveMorphemeKind');

assert(resolveMorphemeKind('stem') === 'stem', 'stem → stem');
assert(resolveMorphemeKind('raiz') === 'stem', 'raiz → stem');
assert(resolveMorphemeKind('affix') === 'affix', 'affix → affix');
assert(resolveMorphemeKind('afijo') === 'affix', 'afijo → affix');
assert(resolveMorphemeKind('mutation') === 'mutation', 'mutation → mutation');
assert(resolveMorphemeKind('mutacion') === 'mutation', 'mutacion → mutation');
assert(resolveMorphemeKind('tone') === 'tone', 'tone → tone');
assert(resolveMorphemeKind('tono') === 'tone', 'tono → tone');
assert(resolveMorphemeKind('particle') === 'particle', 'particle → particle');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveAffixPosition');

assert(resolveAffixPosition('prefix') === 'prefix', 'prefix → prefix');
assert(resolveAffixPosition('prefijo') === 'prefix', 'prefijo → prefix');
assert(resolveAffixPosition('suffix') === 'suffix', 'suffix → suffix');
assert(resolveAffixPosition('sufijo') === 'suffix', 'sufijo → suffix');
assert(resolveAffixPosition('infix') === 'infix', 'infix → infix');
assert(resolveAffixPosition('infijo') === 'infix', 'infijo → infix');
assert(resolveAffixPosition('circumfix') === 'circumfix', 'circumfix → circumfix');
assert(resolveAffixPosition('circunfijo') === 'circumfix', 'circunfijo → circumfix');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveNodeType');

assert(resolveNodeType('clause') === 'clause', 'clause → clause');
assert(resolveNodeType('oracion') === 'clause', 'oracion → clause');
assert(resolveNodeType('phrase') === 'phrase', 'phrase → phrase');
assert(resolveNodeType('frase') === 'phrase', 'frase → phrase');
assert(resolveNodeType('word') === 'word', 'word → word');
assert(resolveNodeType('palabra') === 'word', 'palabra → word');
assert(resolveNodeType('morpheme') === 'morpheme', 'morpheme → morpheme');
assert(resolveNodeType('morfema') === 'morpheme', 'morfema → morpheme');

// ═══════════════════════════════════════════════════════════════════════════════
section('resolveConnectionType');

assert(resolveConnectionType('dependency') === 'dependency', 'dependency → dependency');
assert(resolveConnectionType('dependencia') === 'dependency', 'dependencia → dependency');
assert(resolveConnectionType('agreement') === 'agreement', 'agreement → agreement');
assert(resolveConnectionType('concordancia') === 'agreement', 'concordancia → agreement');
assert(resolveConnectionType('movement') === 'movement', 'movement → movement');
assert(resolveConnectionType('movimiento') === 'movement', 'movimiento → movement');

// ═══════════════════════════════════════════════════════════════════════════════
section('displayOf — canonical key → label UI con tildes');

assert(displayOf('sustantivo') === 'Sustantivo', 'sustantivo → Sustantivo');
assert(displayOf('preposicion') === 'Preposición', 'preposicion (sin tilde) → Preposición (con tilde)');
assert(displayOf('conjuncion') === 'Conjunción', 'conjuncion → Conjunción');
assert(displayOf('interjeccion') === 'Interjección', 'interjeccion → Interjección');
assert(displayOf('articulo') === 'Artículo', 'articulo → Artículo');
assert(displayOf('desconocida') === '(sin categoría)', 'desconocida → (sin categoría)');
assert(displayOf('key_inexistente') === 'key_inexistente', 'key inexistente → devuelve la key (fallback)');

// ═══════════════════════════════════════════════════════════════════════════════
section('displayOfRole');

assert(displayOfRole('root') === 'Raíz (núcleo verbal)', 'root → Raíz (núcleo verbal)');
assert(displayOfRole('subject') === 'Sujeto', 'subject → Sujeto');
assert(displayOfRole('object') === 'Objeto', 'object → Objeto');
assert(displayOfRole('modifier') === 'Modificador', 'modifier → Modificador');
assert(displayOfRole('particle') === 'Partícula', 'particle → Partícula');
assert(displayOfRole('auxiliary_verb') === 'Verbo auxiliar', 'auxiliary_verb → Verbo auxiliar');
assert(displayOfRole('clitic') === 'Clítico', 'clitic → Clítico');
assert(displayOfRole('connector') === 'Conector / Nexo', 'connector → Conector / Nexo');
assert(displayOfRole('unknown_role') === 'unknown_role', 'rol desconocido → devuelve input (fallback)');

// ═══════════════════════════════════════════════════════════════════════════════
section('Jerarquía — sustantivo es padre de pronombre/nombre/numeral');

assert(isSubcategory('pronombre', 'sustantivo') === true, 'pronombre ES subcat de sustantivo');
assert(isSubcategory('nombre_propio', 'sustantivo') === true, 'nombre_propio ES subcat de sustantivo');
assert(isSubcategory('numeral', 'sustantivo') === true, 'numeral ES subcat de sustantivo');
assert(isSubcategory('verboide_sn', 'sustantivo') === true, 'verboide_sn ES subcat de sustantivo');
assert(isSubcategory('verboide_sn', 'verbo') === false, 'verboide_sn NO es subcat de verbo');
assert(isSubcategory('sustantivo', 'sustantivo') === true, 'sustantivo ES subcat de sí mismo');
assert(isSubcategory('verbo', 'sustantivo') === false, 'verbo NO es subcat de sustantivo');

const sustantivoChildren = getChildren('sustantivo').map(c => c.key);
assert(sustantivoChildren.includes('pronombre'), 'getChildren sustantivo incluye pronombre');
assert(sustantivoChildren.includes('nombre_propio'), 'getChildren sustantivo incluye nombre_propio');
assert(sustantivoChildren.includes('numeral'), 'getChildren sustantivo incluye numeral');
assert(sustantivoChildren.includes('verboide_sn'), 'getChildren sustantivo incluye verboide_sn');
assert(!sustantivoChildren.includes('verbo'), 'getChildren sustantivo NO incluye verbo');

const sustantivoDesc = getDescendants('sustantivo');
assert(sustantivoDesc.includes('pronombre'), 'getDescendants sustantivo incluye pronombre');
assert(sustantivoDesc.includes('nombre_propio'), 'getDescendants sustantivo incluye nombre_propio');

// ═══════════════════════════════════════════════════════════════════════════════
section('Jerarquía — verbo es padre de auxiliar/copulativo');

assert(isSubcategory('auxiliar', 'verbo') === true, 'auxiliar ES subcat de verbo');
assert(isSubcategory('copulativo', 'verbo') === true, 'copulativo ES subcat de verbo');
assert(isSubcategory('verboide_v', 'verbo') === true, 'verboide_v ES subcat de verbo');
assert(isSubcategory('frasema', 'verbo') === false, 'frasema NO es subcat de verbo');

const verboChildren = getChildren('verbo').map(c => c.key);
assert(verboChildren.includes('auxiliar'), 'getChildren verbo incluye auxiliar');
assert(!verboChildren.includes('verboide_sn'), 'getChildren verbo NO incluye verboide_sn');

// ═══════════════════════════════════════════════════════════════════════════════
section('Jerarquía — afijo es padre de prefijo/sufijo/infijo/circunfijo/desinencia');

assert(isSubcategory('prefijo', 'afijo') === true, 'prefijo ES subcat de afijo');
assert(isSubcategory('sufijo', 'afijo') === true, 'sufijo ES subcat de afijo');
assert(isSubcategory('infijo', 'afijo') === true, 'infijo ES subcat de afijo');
assert(isSubcategory('circunfijo', 'afijo') === true, 'circunfijo ES subcat de afijo');
assert(isSubcategory('desinencia', 'afijo') === true, 'desinencia ES subcat de afijo');

// ═══════════════════════════════════════════════════════════════════════════════
section('Jerarquía — getRootCategories (raíces sin parent)');

const roots = getRootCategories().map(c => c.key);
assert(roots.includes('sustantivo'), 'raíces incluyen sustantivo');
assert(roots.includes('verbo'), 'raíces incluyen verbo');
assert(roots.includes('adjetivo'), 'raíces incluyen adjetivo');
assert(roots.includes('adverbio'), 'raíces incluyen adverbio');
assert(roots.includes('afijo'), 'raíces incluyen afijo');
assert(roots.includes('frase_verbal'), 'raíces incluyen frase_verbal');
assert(!roots.includes('pronombre'), 'raíces NO incluyen pronombre (tiene parent)');
assert(!roots.includes('prefijo'), 'raíces NO incluyen prefijo (tiene parent)');

// ═══════════════════════════════════════════════════════════════════════════════
section('getAncestors — cadena completa');

assert(JSON.stringify(getAncestors('pronombre')) === JSON.stringify(['sustantivo', 'pronombre']),
  'ancestors(pronombre) = [sustantivo, pronombre]');
assert(JSON.stringify(getAncestors('sustantivo')) === JSON.stringify(['sustantivo']),
  'ancestors(sustantivo) = [sustantivo] (raíz)');
assert(JSON.stringify(getAncestors('prefijo')) === JSON.stringify(['afijo', 'prefijo']),
  'ancestors(prefijo) = [afijo, prefijo]');
assert(getAncestors('key_inexistente').length === 1, 'ancestors(key_inexistente) = [key_inexistente]');

// ═══════════════════════════════════════════════════════════════════════════════
section('displayOfMorphemeKind');

assert(displayOfMorphemeKind('stem') === 'Raíz', 'stem → Raíz');
assert(displayOfMorphemeKind('affix') === 'Afijo', 'affix → Afijo');
assert(displayOfMorphemeKind('mutation') === 'Mutación', 'mutation → Mutación');
assert(displayOfMorphemeKind('tone') === 'Tono', 'tone → Tono');
assert(displayOfMorphemeKind('particle') === 'Partícula', 'particle → Partícula');

// ═══════════════════════════════════════════════════════════════════════════════
section('displayOfAffixPosition');

assert(displayOfAffixPosition('prefix') === 'Prefijo', 'prefix → Prefijo');
assert(displayOfAffixPosition('suffix') === 'Sufijo', 'suffix → Sufijo');
assert(displayOfAffixPosition('infix') === 'Infijo', 'infix → Infijo');
assert(displayOfAffixPosition('circumfix') === 'Circunfijo', 'circumfix → Circunfijo');

// ═══════════════════════════════════════════════════════════════════════════════
section('Compatibilidad — DEFAULT_CATEGORIES == STANDARD_CATEGORIES_KEYS');

assert(JSON.stringify(DEFAULT_CATEGORIES) === JSON.stringify(STANDARD_CATEGORIES_KEYS),
  'DEFAULT_CATEGORIES y STANDARD_CATEGORIES_KEYS son idénticos');
assert(DEFAULT_CATEGORIES.length === LEXICAL_CATEGORIES.length,
  'DEFAULT_CATEGORIES tiene la misma longitud que LEXICAL_CATEGORIES');

// ═══════════════════════════════════════════════════════════════════════════════
section('Canonical sin acentos — verificación de todas las keys');

const accentPattern = /[àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚâêîôûÂÊÎÔÛäëïöüÄËÏÖÜ]/;
const invalidKeys = LEXICAL_CATEGORIES.filter(c => accentPattern.test(c.key));
assert(invalidKeys.length === 0, `Ninguna key léxica tiene acentos (${invalidKeys.map(c => c.key).join(', ')})`);

const invalidRoleKeys = GRAMMATICAL_ROLES.filter(r => accentPattern.test(r.key));
assert(invalidRoleKeys.length === 0, `Ninguna key de rol tiene acentos`);

const invalidMkKeys = MORPHEME_KINDS.filter(m => accentPattern.test(m.key));
assert(invalidMkKeys.length === 0, `Ninguna key de morpheme kind tiene acentos`);

const invalidApKeys = AFFIX_POSITIONS.filter(a => accentPattern.test(a.key));
assert(invalidApKeys.length === 0, `Ninguna key de affix position tiene acentos`);

// ═══════════════════════════════════════════════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n══════════════════════════════════════════════`);
console.log(`  PASSED: ${passed}`);
console.log(`  FAILED: ${failed}`);
console.log(`  TOTAL:  ${passed + failed}`);
console.log(`══════════════════════════════════════════════\n`);

if (failed > 0) {
  process.exit(1);
}
