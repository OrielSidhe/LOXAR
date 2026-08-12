# Grammar Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the LOXAR grammar module from a data-capture wiki into a deterministic local engine that produces real surface forms (inflection, derivation, word order, phonotactics) from an editable manifest, reusable by Neography and the Translator, with AI as an optional offline-aware booster.

**Architecture:** A pure-TypeScript engine in `src/services/grammar/` (`morphology`, `syntax`, `phonology`, `index`) with no React/Tauri dependencies. `GrammarManifest` (in `src/types.ts`, de-duplicated) is the single source of truth; `SyntaxCanvas` remains the visual surface the engine can populate and read. AI (`geminiService`) is used only for bootstrapping rules from text and rule induction, guarded by `isAiAvailable()`.

**Tech Stack:** TypeScript, React 18, Vite, Tauri v2. Tests run with `npx tsx` + `node:assert` (matches existing smoke-test practice; no new test framework). Lint: `npm run check:esc`. Typecheck: `npm run typecheck`.

---

## File Structure

**Create:**
- `src/services/grammar/engineTypes.ts` — engine-only types (`SurfaceForm`, `ClauseFeatures`, etc.)
- `src/services/grammar/morphology.ts` — `realizeLexeme`
- `src/services/grammar/syntax.ts` — `realizeClause` (returns string + `SyntaxCanvas`)
- `src/services/grammar/phonology.ts` — `validate` / `apply`
- `src/services/grammar/index.ts` — re-exports + `realizeLexeme`/`realizeClause` barrel
- `src/services/grammar/__tests__/morphology.test.ts`
- `src/services/grammar/__tests__/syntax.test.ts`
- `src/services/grammar/__tests__/phonology.test.ts`
- `src/services/grammar/__tests__/exceptions.test.ts`
- `src/components/RuleEditor.tsx` — edit `paradigms` + `mutationRules`
- `src/components/ExceptionEditor.tsx` — edit `LexicalException` + `GrammarException` registry

**Modify:**
- `src/types.ts` — unify `GrammarManifest`, extend `MorphosyntacticStrategy` (add `transformationRule`/`positionRule`), add `InflectionSlot`/`SlotRealization`/`CategoryParadigm`/`MutationRule`/`LexicalException`, extend `PhonologyConfig` + `GrammarAffix.type`, add `exceptions?` to `LexiconEntry`
- `src/types/grammar.ts` — **DELETE**
- `src/services/grammarParser.ts` — rewrite to use `geminiService.parseGrammarText`
- `src/services/geminiService.ts` — add `parseGrammarText` + `isAiAvailable`
- `src/components/GrammarTab.tsx` — fix 2 tsc errors; wire `RuleEditor`, `ExceptionEditor`, upgraded `Preview`, phonotactic feedback, offline-aware AI button
- `src/components/SyntaxCanvas.tsx` — accept optional `roles`/`features` tags on nodes (no API change required; purely additive data)
- `src/types/grammar-flexible.ts` — keep (imports from `../types`)

---

## Phase 0 — Foundation & Unblock

### Task 1: Unify grammar types (delete `types/grammar.ts`)

**Files:**
- Modify: `src/types.ts`
- Delete: `src/types/grammar.ts`

- [ ] **Step 1: Delete the shadowed duplicate**
```bash
rm src/types/grammar.ts
```

- [ ] **Step 2: Replace the `GrammarManifest`, `GrammarAffix`, `PhonologyConfig` and add engine types in `src/types.ts`**

In `src/types.ts`, find the existing `GrammarManifest` (around line 294) and replace the block from `export interface GrammarAffix` through `export interface GrammarManifest` (lines 209–314) with:

```ts
export interface GrammarAffix {
  id: string;
  form: string;
  type: 'prefix' | 'suffix' | 'infix' | 'circumfix';
  meaning: string;
  appliesTo: string[];
  source: 'manual' | 'lexicon';
  enabled: boolean;
}

export interface GrammarPreviewConfig {
  useLexiconAffixes: boolean;
  subjectEntryId?: string;
  verbEntryId?: string;
  objectEntryId?: string;
}

// ── Engine: inflection by feature slots ──────────────────────────────────────
export type SlotRealization =
  | { kind: 'affix'; position: 'prefix' | 'suffix' | 'infix' | 'circumfix'; form: string }
  | { kind: 'mutation'; ruleId: string }
  | { kind: 'stem'; replace: string }
  | { kind: 'particle'; form: string }
  | { kind: 'tone'; ruleId: string };

export interface AllomorphCondition {
  when: string; // 'prevVowel' | 'afterConsonant' | 'wordInitial' | 'always'
  realization: SlotRealization;
}

export interface InflectionSlot {
  feature: string; // 'tense' | 'number' | 'person' | 'case' | 'gender' | 'aspect' | ...
  label?: string;
  order: number;
  realization: SlotRealization;
  allomorphs?: AllomorphCondition[];
}

export interface CategoryParadigm {
  category: string; // 'verbo' | 'sustantivo' | 'adjetivo' | ...
  slots: InflectionSlot[];
}

export interface MutationRule {
  id: string;
  name: string;
  pattern: string; // e.g. "b" or regex
  replacement: string; // e.g. "v"
  scope: 'consonant' | 'vowel' | 'tone';
}

export interface PhonologyConfig {
  inventory: { consonants: string[]; vowels: string[] };
  phonotactics: {
    syllableStructures: string[]; // ['CVC','CV','CCV']
    maxConsonantClusters: number;
    consonantClusters?: string[];
    vowelClusters?: string[];
  };
}

export interface SyntaxCanvas {
  level: 0 | 1;
  typologySelected: boolean;
  nodes: SyntaxNode[];
  connections: SyntaxConnection[];
  exceptions: GrammarException[];
  lastPreviewResult?: string;
}

export interface GrammarManifest {
  meta: { author: string; version: string; sourceFormat: 'json' | 'markdown'; lastUpdated: string };
  phonology?: PhonologyConfig; // canonical phonology source of truth
  typology: { wordOrder: string; alignment: string; morphology: string; headDirection: string };
  roles: SyntacticRole[];
  strategies: MorphosyntacticStrategy[];
  paradigms: CategoryParadigm[]; // real inflection engine data
  mutationRules: MutationRule[];
  affixInventory?: GrammarAffix[]; // legacy quick-affix list (engine falls back to it)
  exceptions: GrammarException[];
  syntaxCanvas?: SyntaxCanvas;
  preview?: GrammarPreviewConfig;
  notes: string[];
}
```

- [ ] **Step 3: Extend `MorphosyntacticStrategy` and `LexiconEntry` in `src/types.ts`**

Replace the existing `MorphosyntacticStrategy` (around line 196) with:

```ts
export type StrategyType = 'position' | 'affix' | 'clitic' | 'tone' | 'mutation' | 'particle' | 'auxiliary';

export interface MorphosyntacticStrategy {
  id: string;
  name: string;
  type: StrategyType;
  appliesTo: string[];
  appliesToCategories?: string[];
  positionRule?: { anchor: 'verb' | 'noun' | 'sentence_start' | 'sentence_end'; relation: 'before' | 'after'; distance: number };
  affixRule?: { position: 'prefix' | 'suffix' | 'infix' | 'circumfix'; form: string; allomorphs?: { condition: string; form: string }[] };
  transformationRule?: { pattern: string; replacement: string };
  notes?: string;
}
```

Add the irregularity type and the lexeme field. Insert near the other grammar types:

```ts
export interface LexicalException {
  id: string;
  featureKey: string; // e.g. "tense=past" or "tense=past&number=sg"
  surfaceForm: string; // suppletive form, e.g. "fui"
  note?: string;
}
```

And in `LexiconEntry` (around line 2) add one optional field:

```ts
export interface LexiconEntry {
  ID: string;
  externalID?: string;
  Raíz: string;
  Léxema: string[];
  Categoría: string;
  Significado: string[];
  extraData: { [key: string]: any };
  exceptions?: LexicalException[]; // irregular/suppletive forms (ser/estar style)
}
```

- [ ] **Step 4: Verify no other file imports from `types/grammar`**
```bash
grep -rn "types/grammar" src/ || echo "OK: no remaining imports"
```
Expected: only the soon-to-be-rewritten `grammarParser.ts` (fixed in Task 2). If anything else appears, update its import to `../types`.

- [ ] **Step 5: Typecheck the type layer**
```bash
npm run typecheck 2>&1 | grep -E "types.ts|grammar" | head
```
Expected: no NEW errors introduced in `types.ts`. (Pre-existing errors in `GrammarTab`/`NeographyModal` may remain; they are fixed in later tasks.)

- [ ] **Step 6: Commit**
```bash
git add src/types.ts
git commit -m "refactor(grammar): unify GrammarManifest types, add engine slot model"
```

### Task 2: Fix `grammarParser` + add AI bridge to `geminiService`

**Files:**
- Modify: `src/services/geminiService.ts`
- Modify: `src/services/grammarParser.ts`

- [ ] **Step 1: Add `isAiAvailable` and `parseGrammarText` to `src/services/geminiService.ts`**

Append after `loadAiSettings` (line ~48):

```ts
export const isAiAvailable = async (): Promise<boolean> => {
  try {
    const s = await loadAiSettings();
    if (s.provider === 'ollama') return Boolean(s.ollamaUrl);
    return Boolean(s.geminiApiKey);
  } catch {
    return false;
  }
};

export const parseGrammarText = async (text: string): Promise<import('../types').GrammarManifest> => {
  const prompt = `Eres un lingüista. Convierte la descripción de gramática en JSON estricto que cumpla este esquema:
{
  "meta": { "author": "user", "version": "1.0", "sourceFormat": "markdown", "lastUpdated": "<iso>" },
  "typology": { "wordOrder": "SVO|SOV|VSO|VOS|OVS|OSV|Free", "alignment": "string", "morphology": "string", "headDirection": "string" },
  "roles": [ { "id": "subject", "name": "Sujeto" } ],
  "strategies": [ { "id": "s1", "name": "string", "type": "affix|position|clitic|tone|mutation|particle|auxiliary", "appliesTo": ["subject"], "affixRule": { "position": "suffix", "form": "-x" } } ],
  "paradigms": [ { "category": "verbo", "slots": [ { "feature": "tense", "order": 1, "realization": { "kind": "affix", "position": "suffix", "form": "-t" } } ] } ],
  "mutationRules": [],
  "exceptions": [],
  "notes": []
}
Responde ÚNICAMENTE con el JSON. Descripción:\n${text}`;
  const res = await callAi(prompt);
  const json = extractJson(res) ?? (await cleanseJson(res));
  const manifest = JSON.parse(json);
  manifest.meta = { ...manifest.meta, lastUpdated: new Date().toISOString() };
  manifest.exceptions = manifest.exceptions ?? [];
  manifest.mutationRules = manifest.mutationRules ?? [];
  manifest.paradigms = manifest.paradigms ?? [];
  return manifest as import('../types').GrammarManifest;
};
```

- [ ] **Step 2: Rewrite `src/services/grammarParser.ts`**

```ts
import { parseGrammarText, isAiAvailable } from './geminiService';
import type { GrammarManifest } from '../types';

export const parseGrammar = async (text: string): Promise<GrammarManifest> => {
  if (!(await isAiAvailable())) {
    throw new Error('Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente.');
  }
  return parseGrammarText(text);
};

export { isAiAvailable };
```

- [ ] **Step 3: Typecheck**
```bash
npm run typecheck 2>&1 | grep "grammarParser" | head
```
Expected: no errors referencing `grammarParser.ts` line 5 (`parseGrammar` not on ElectronAPI).

- [ ] **Step 4: Commit**
```bash
git add src/services/geminiService.ts src/services/grammarParser.ts
git commit -m "fix(grammar): route parser through geminiService + isAiAvailable guard"
```

### Task 3: Fix the 2 remaining grammar tsc errors in `GrammarTab.tsx`

**Files:**
- Modify: `src/components/GrammarTab.tsx:222-240` and `:356-367`

- [ ] **Step 1: Fix `source` widening in the `lexiconAffixes` memo (line 222)**

Change the mapped object so `source` is a literal. Replace lines 230–238:

```ts
            return {
                id: `lexicon_${entry.ID}`,
                form: entry.Léxema?.[0] || entry.Raíz,
                type,
                meaning: entry.Significado?.[0] || entry.Categoría || '',
                appliesTo: [],
                source: 'lexicon' as const,
                enabled: editedManifest.preview?.useLexiconAffixes ?? false,
            };
```

(`meaning` now falls back to `''` so it is always `string`, not `string | undefined`.)

- [ ] **Step 2: Remove the non-existent props passed to `SyntaxCanvas` (lines 363–365)**

In `renderSyntax`, the `<SyntaxCanvasComponent>` call currently passes `wordOrder`, `onWordOrderChange`, `onMorphologyChange`. `SyntaxCanvas` already reads typology from its own data flow; remove those three props. Replace lines 358–366 with:

```tsx
                        <SyntaxCanvasComponent
                            canvas={canvas}
                            onChange={handleSyntaxCanvasChange}
                            lexicon={lexicon}
                            conlangName={conlangName}
                        />
```

- [ ] **Step 3: Typecheck only the grammar tab**
```bash
npm run typecheck 2>&1 | grep "GrammarTab.tsx" | head
```
Expected: no remaining errors in `GrammarTab.tsx`.

- [ ] **Step 4: Commit**
```bash
git add src/components/GrammarTab.tsx
git commit -m "fix(grammar): resolve GrammarTab tsc errors (source literal, canvas props)"
```

### Task 4: Unify phonology source of truth

**Files:**
- Modify: `src/components/GenerativeProfileEditor.tsx` (or wherever the generative profile phonology is edited) — add a "Copiar fonología al perfil" action.

- [ ] **Step 1: Confirm `GenerativeProfile` reads from `manifest.phonology`**

In `App.tsx` where `activeProfile` is built/passed to generation, ensure consonents/vowels/syllableStructures come from the grammar manifest when present. Search usages:

```bash
grep -rn "activeProfile" src/App.tsx | head
```

- [ ] **Step 2: Add a sync helper in `src/services/grammar/index.ts` (created in Task 9)**
```ts
export const phonologyFromManifest = (m: GrammarManifest): GenerativeProfile['consonants'] extends string[] ? {
  consonants: string[]; vowels: string[]; syllableStructures: string[]; consonantClusters: string[]; vowelClusters: string[];
} : never => {
  const p = m.phonology;
  if (!p) return { consonants: [], vowels: [], syllableStructures: [], consonantClusters: [], vowelClusters: [] };
  return {
    consonants: p.inventory.consonants,
    vowels: p.inventory.vowels,
    syllableStructures: p.phonotactics.syllableStructures,
    consonantClusters: p.phonotactics.consonantClusters ?? [],
    vowelClusters: p.phonotactics.vowelClusters ?? [],
  };
};
```

- [ ] **Step 3: Add a "Copiar al perfil generativo" button in `GenerativeProfileEditor.tsx`**
Locate the phonology section and add:
```tsx
<button onClick={() => onSyncPhonology?.(phonologyFromManifest(manifest))}
  className="..." title="Usa la fonología de la gramática como fuente">
  Copiar fonología al perfil
</button>
```
Wire `onSyncPhonology` from `App.tsx` to update `activeProfile`.

- [ ] **Step 4: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep -E "GenerativeProfileEditor|grammar/index" | head
git add src/services/grammar/index.ts src/components/GenerativeProfileEditor.tsx src/App.tsx
git commit -m "feat(grammar): manifest.phonology as canonical, sync to generative profile"
```

---

## Phase 1 — Engine Core (pure, testable)

### Task 5: Engine types

**Files:**
- Create: `src/services/grammar/engineTypes.ts`

- [ ] **Step 1: Write engineTypes.ts**
```ts
import type { GrammarManifest, LexiconEntry, SyntaxCanvas } from '../types';

export type SurfaceFormSource = 'rule' | 'suppletion' | 'particle';

export interface SurfaceForm {
  form: string;
  source: SurfaceFormSource;
  applied: string[];
  freeMorphemes?: string[];
  violations?: string[];
  warnings?: string[];
}

export interface ClauseParticipant {
  role: string;
  lexeme: LexiconEntry;
  features: Record<string, string>;
}

export interface ClauseFeatures {
  participants: ClauseParticipant[];
  freeMorphemes?: { role: string; form: string }[];
}

export interface RealizeClauseResult {
  sentence: string;
  canvas: SyntaxCanvas;
}
```

- [ ] **Step 2: Commit**
```bash
git add src/services/grammar/engineTypes.ts
git commit -m "feat(grammar): add engine types"
```

### Task 6: Morphology engine + tests

**Files:**
- Create: `src/services/grammar/morphology.ts`
- Create: `src/services/grammar/__tests__/morphology.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import assert from 'node:assert';
import { realizeLexeme } from '../morphology';
import type { GrammarManifest, LexiconEntry } from '../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  ...over,
});

const verb = (over: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: 'v1', Raíz: 'tens', Léxema: ['tens'], Categoría: 'verbo', Significado: ['say'], extraData: {}, ...over,
});

// Agglutinative: two suffixes stack in slot order
const aggManifest = mk({ paradigms: [{ category: 'verbo', slots: [
  { feature: 'tense', order: 1, realization: { kind: 'affix', position: 'suffix', form: '-t' } },
  { feature: 'number', order: 2, realization: { kind: 'affix', position: 'suffix', form: '-il' } },
] }] });

const r1 = realizeLexeme(verb(), { tense: 'past', number: 'pl' }, aggManifest);
assert.equal(r1.form, 'tens-t-il');
assert.equal(r1.source, 'rule');

// Fusional: allomorphy conditioned on preceding vowel
const fusManifest = mk({ paradigms: [{ category: 'verbo', slots: [
  { feature: 'tense', order: 1, realization: { kind: 'affix', position: 'suffix', form: '-t' },
    allomorphs: [{ when: 'prevVowel', realization: { kind: 'affix', position: 'suffix', form: '-d' } }] },
] }] });

const r2 = realizeLexeme(verb({ Raíz: 'ka', Léxema: ['ka'] }), { tense: 'past' }, fusManifest);
assert.equal(r2.form, 'ka-d'); // vowel before -> -d

// Suppletion (ser/estar style)
const suppLexeme = verb({ exceptions: [{ id: 'e1', featureKey: 'tense=past', surfaceForm: 'fui' }] });
const r3 = realizeLexeme(suppLexeme, { tense: 'past' }, aggManifest);
assert.equal(r3.form, 'fui');
assert.equal(r3.source, 'suppletion');

console.log('morphology: ALL PASS');
```

- [ ] **Step 2: Run, expect failure**
```bash
npx tsx src/services/grammar/__tests__/morphology.test.ts
```
Expected: FAIL (`Cannot find module '../morphology'`).

- [ ] **Step 3: Implement `src/services/grammar/morphology.ts`**
```ts
import type { GrammarManifest, LexiconEntry, MutationRule } from '../types';
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

const applyAffix = (form: string, position: string, affix: string): string => {
  if (position === 'prefix') return affix.replace(/-$/g, '') + form;
  if (position === 'suffix') return form + affix.replace(/^-+/g, '');
  if (position === 'infix') {
    const mid = Math.max(1, Math.floor(form.length / 2));
    return form.slice(0, mid) + affix.replace(/^-|-$/g, '') + form.slice(mid);
  }
  if (position === 'circumfix') {
    const [pre, sur] = affix.split('^');
    return (pre || '').replace(/-$/g, '') + form + (sur || '').replace(/^-+/g, '');
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
  // 1) Suppletion / irregular
  const supp = lexeme.exceptions?.find(e => matchFeatureKey(e.featureKey, features));
  if (supp) return { form: supp.surfaceForm, source: 'suppletion', applied: [supp.featureKey] };

  let form = stemOf(lexeme);
  const paradigm = manifest.paradigms.find(p => p.category === lexeme.Categoría);
  const slots = (paradigm?.slots ?? [])
    .filter(s => features[s.feature] !== undefined)
    .sort((a, b) => a.order - b.order);

  const freeMorphemes: string[] = [];
  slots.forEach((slot, idx) => {
    const real = chooseRealization(slot, { preceding: form.slice(-1), isFirst: idx === 0 });
    switch (real.kind) {
      case 'affix': form = applyAffix(form, real.position, real.form); break;
      case 'mutation': form = applyMutation(form, real.ruleId, manifest.mutationRules); break;
      case 'tone': form = applyMutation(form, real.ruleId, manifest.mutationRules); break;
      case 'stem': form = real.replace; break;
      case 'particle': freeMorphemes.push(real.form); break;
    }
  });

  return { form, source: 'rule', applied: slots.map(s => s.feature), ...(freeMorphemes.length ? { freeMorphemes } : {}) };
};
```

- [ ] **Step 4: Run, expect PASS**
```bash
npx tsx src/services/grammar/__tests__/morphology.test.ts
```
Expected: prints `morphology: ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/services/grammar/morphology.ts src/services/grammar/__tests__/morphology.test.ts
git commit -m "feat(grammar): morphology engine (slots, allomorphy, suppletion)"
```

### Task 7: Syntax realizer + tests

**Files:**
- Create: `src/services/grammar/syntax.ts`
- Create: `src/services/grammar/__tests__/syntax.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import assert from 'node:assert';
import { realizeClause } from '../syntax';
import type { GrammarManifest, LexiconEntry } from '../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SOV', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  ...over,
});

const lex = (id: string, cat: string, form: string): LexiconEntry => ({
  ID: id, Raíz: form, Léxema: [form], Categoría: cat, Significado: [id], extraData: {},
});

const clause = {
  participants: [
    { role: 'subject', lexeme: lex('s', 'sustantivo', 'na'), features: {} },
    { role: 'object', lexeme: lex('o', 'sustantivo', 'te'), features: {} },
    { role: 'verb', lexeme: lex('v', 'verbo', 'kor'), features: {} },
  ],
};

const res = realizeClause(clause, mk());
assert.equal(res.sentence, 'na te kor'); // SOV
assert.ok(Array.isArray(res.canvas.nodes) && res.canvas.nodes.length === 3);
console.log('syntax: ALL PASS');
```

- [ ] **Step 2: Run, expect failure**
```bash
npx tsx src/services/grammar/__tests__/syntax.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/grammar/syntax.ts`**
```ts
import type { GrammarManifest } from '../types';
import type { ClauseFeatures, RealizeClauseResult } from './engineTypes';
import { realizeLexeme } from './morphology';

const ROLE_ORDER: Record<string, string> = { S: 'subject', V: 'verb', O: 'object' };

export const realizeClause = (clause: ClauseFeatures, manifest: GrammarManifest): RealizeClauseResult => {
  const order = (manifest.typology.wordOrder || 'SVO').toUpperCase().replace('LIBRE', 'SVO').replace('FREE', 'SVO');
  const tokens = (order.match(/[SVO]/g) || ['S', 'V', 'O']);

  const nodes = clause.participants.map((p, i) => {
    const sf = realizeLexeme(p.lexeme, p.features, manifest);
    const roleKey = tokens.find(t => ROLE_ORDER[t] === p.role) || 'S';
    return {
      id: `n${i}`,
      type: 'word' as const,
      role: p.role,
      label: sf.form,
      x: 60 + i * 240,
      y: 120,
      children: [],
      lexiconCategory: p.lexeme.Categoría,
      literalForm: sf.form,
      color: '#6366f1',
    };
  });

  const ordered = tokens
    .map(t => nodes.find(n => (ROLE_ORDER[t] === n.role)))
    .filter(Boolean) as typeof nodes;
  const sentence = ordered.map(n => n.label).join(' ');

  const canvas = {
    level: 1 as const,
    typologySelected: true,
    nodes: ordered,
    connections: [],
    exceptions: [],
    lastPreviewResult: sentence,
  };
  return { sentence, canvas };
};
```

- [ ] **Step 4: Run, expect PASS**
```bash
npx tsx src/services/grammar/__tests__/syntax.test.ts
```
Expected: `syntax: ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/services/grammar/syntax.ts src/services/grammar/__tests__/syntax.test.ts
git commit -m "feat(grammar): syntax realizer (typology order + canvas emit)"
```

### Task 8: Phonology validate + tests

**Files:**
- Create: `src/services/grammar/phonology.ts`
- Create: `src/services/grammar/__tests__/phonology.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import assert from 'node:assert';
import { validate } from '../phonology';
import type { PhonologyConfig } from '../../types';

const ph: PhonologyConfig = {
  inventory: { consonants: ['p','t','k','n','s'], vowels: ['a','e','i','o','u'] },
  phonotactics: { syllableStructures: ['CV','CVC'], maxConsonantClusters: 1 },
};

assert.deepEqual(validate('pato', ph), []);          // valid
assert.ok(validate('xzq', ph).length > 0);           // segments not in inventory
console.log('phonology: ALL PASS');
```

- [ ] **Step 2: Run, expect failure**
```bash
npx tsx src/services/grammar/__tests__/phonology.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/services/grammar/phonology.ts`**
```ts
import type { PhonologyConfig } from '../types';

const segSet = (p: PhonologyConfig): Set<string> =>
  new Set([...p.inventory.consonants, ...p.inventory.vowels]);

export const validate = (word: string, p?: PhonologyConfig): string[] => {
  if (!p) return [];
  const inv = segSet(p);
  const violations: string[] = [];
  for (const ch of word.replace(/[^A-Za-záéíóúüñ]/gi, '')) {
    if (!inv.has(ch)) violations.push(`Segmento fuera de inventario: "${ch}"`);
  }
  // crude syllable check: every vowel must be followed by an allowed structure
  const syl = word.split(/(?=[aeiouáéíóúü])/i).filter(Boolean);
  for (const s of syl) {
    const struct = s.replace(/[^A-Za-z]/g, '').replace(/[aeiouáéíóúü]/gi, 'V').replace(/[^\s]/g, 'C');
    if (!p.phonotactics.syllableStructures.includes(struct)) {
      violations.push(`Estructura silábica no permitida: "${struct}" en "${s}"`);
    }
  }
  return violations;
};
```

- [ ] **Step 4: Run, expect PASS**
```bash
npx tsx src/services/grammar/__tests__/phonology.test.ts
```
Expected: `phonology: ALL PASS`.

- [ ] **Step 5: Commit**
```bash
git add src/services/grammar/phonology.ts src/services/grammar/__tests__/phonology.test.ts
git commit -m "feat(grammar): phonotactic validator"
```

### Task 9: Engine barrel `index.ts`

**Files:**
- Create: `src/services/grammar/index.ts`

- [ ] **Step 1: Write `index.ts`**
```ts
export { realizeLexeme } from './morphology';
export { realizeClause } from './syntax';
export { validate as validatePhonology } from './phonology';
export * from './engineTypes';
```

- [ ] **Step 2: Typecheck the engine**
```bash
npm run typecheck 2>&1 | grep "services/grammar" | head
```
Expected: no errors in `src/services/grammar`.

- [ ] **Step 3: Commit**
```bash
git add src/services/grammar/index.ts
git commit -m "feat(grammar): engine barrel export"
```

---

## Phase 2 — Exception / Irregularity System

### Task 10: Exception editor UI

**Files:**
- Create: `src/components/ExceptionEditor.tsx`
- Modify: `src/components/GrammarTab.tsx` (mount it in the "Morfología" module area)

- [ ] **Step 1: Create `src/components/ExceptionEditor.tsx`**
```tsx
import { useState } from 'react';
import type { LexiconEntry, GrammarException } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface Props {
  lexicon: LexiconEntry[];
  grammarExceptions: GrammarException[];
  onGrammarExceptionsChange: (e: GrammarException[]) => void;
}

const ExceptionEditor = ({ lexicon, grammarExceptions, onGrammarExceptionsChange }: Props) => {
  const [expId, setExpId] = useState('');
  const [featureKey, setFeatureKey] = useState('');
  const [surfaceForm, setSurfaceForm] = useState('');

  const addEntryException = (entryId: string) => {
    if (!featureKey || !surfaceForm) return;
    // mutate the lexicon entry's exceptions via a custom event the parent handles
    window.dispatchEvent(new CustomEvent('loxar:addLexicalException', { detail: { entryId, featureKey, surfaceForm } }));
  };

  const addGrammarException = () => {
    if (!expId) return;
    onGrammarExceptionsChange([...grammarExceptions, {
      id: `ge_${Date.now()}`, ruleDescription: expId, exceptionPattern: featureKey,
      context: surfaceForm, example: '', createdAt: new Date().toISOString(),
    }]);
    setExpId(''); setFeatureKey(''); setSurfaceForm('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-2">Excepciones léxicas (irregulares tipo ser/estar)</h3>
        <p className="text-xs text-text-secondary mb-3">Elige una entrada y define una forma supletiva por rasgo (p.ej. rasgo <code>tense=past</code> → <code>fui</code>). El motor la usa antes que las reglas.</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <select className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" defaultValue=""
            onChange={e => setExpId(e.target.value)}>
            <option value="">Entrada...</option>
            {lexicon.map(l => <option key={l.ID} value={l.ID}>{l.Léxema?.[0] || l.Raíz}</option>)}
          </select>
          <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="rasgo (tense=past)"
            value={featureKey} onChange={e => setFeatureKey(e.target.value)} />
          <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="forma (fui)"
            value={surfaceForm} onChange={e => setSurfaceForm(e.target.value)} />
          <button onClick={() => expId && addEntryException(expId)}
            className="px-3 py-1 bg-primary text-white rounded text-sm">+ Irregular</button>
        </div>
      </div>

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-2">Registro de excepciones documentadas</h3>
        {grammarExceptions.map(ge => (
          <div key={ge.id} className="flex items-center gap-2 text-sm text-text-primary py-1">
            <span className="font-bold">{ge.ruleDescription}</span>
            <span className="text-text-secondary">→ {ge.context}</span>
            <button onClick={() => onGrammarExceptionsChange(grammarExceptions.filter(x => x.id !== ge.id))}
              className="ml-auto text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input className="flex-1 bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="Nueva excepción documentada"
            value={expId} onChange={e => setExpId(e.target.value)} />
          <button onClick={addGrammarException} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">+ Añadir</button>
        </div>
      </div>
    </div>
  );
};
export default ExceptionEditor;
```

- [ ] **Step 2: Mount it in `GrammarTab.tsx`**
In `GrammarTab.tsx`, import and render `ExceptionEditor` inside `renderMorphology` (after the affix section). Add import:
```tsx
import ExceptionEditor from './ExceptionEditor';
```
And inside `renderMorphology` return, before the closing `</div>` of the affix card, insert:
```tsx
<ExceptionEditor
  lexicon={lexicon}
  grammarExceptions={editedManifest.exceptions}
  onGrammarExceptionsChange={(e) => updateManifest({ exceptions: e })}
/>
```
Also handle the `loxar:addLexicalException` event at the top of `GrammarTab` to push into the selected lexicon entry (App owns the lexicon; forward via a new prop `onAddLexicalException(entryId, featureKey, surfaceForm)`). Wire that prop in `App.tsx`.

- [ ] **Step 3: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep -E "ExceptionEditor|GrammarTab" | head
git add src/components/ExceptionEditor.tsx src/components/GrammarTab.tsx src/App.tsx
git commit -m "feat(grammar): exception editor (suppletion + registry)"
```

### Task 11: Exceptions test

**Files:**
- Create: `src/services/grammar/__tests__/exceptions.test.ts`

- [ ] **Step 1: Write + run the test**
```ts
import assert from 'node:assert';
import { realizeLexeme } from '../morphology';
import type { GrammarManifest, LexiconEntry } from '../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [], ...over,
});
const ser = (over: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: 'ser', Raíz: 'ser', Léxema: ['ser'], Categoría: 'verbo', Significado: ['be'], extraData: {}, ...over,
});

const base = ser();
const present = realizeLexeme(base, { tense: 'present', person: '1', number: 'sg' }, mk());
assert.equal(present.form, 'ser'); // no slot -> base

const irregular = ser({ exceptions: [
  { id: 'e1', featureKey: 'tense=present&person=1&number=sg', surfaceForm: 'soy' },
  { id: 'e2', featureKey: 'tense=past', surfaceForm: 'fui' },
]});
assert.equal(realizeLexeme(irregular, { tense: 'present', person: '1', number: 'sg' }, mk()).form, 'soy');
assert.equal(realizeLexeme(irregular, { tense: 'past' }, mk()).form, 'fui');
console.log('exceptions: ALL PASS');
```
```bash
npx tsx src/services/grammar/__tests__/exceptions.test.ts
```
Expected: `exceptions: ALL PASS`.

- [ ] **Step 2: Commit**
```bash
git add src/services/grammar/__tests__/exceptions.test.ts
git commit -m "test(grammar): suppletion / irregular verbs"
```

---

## Phase 3 — UI Integration

### Task 12: Rule editor (paradigms + mutation rules)

**Files:**
- Create: `src/components/RuleEditor.tsx`
- Modify: `src/components/GrammarTab.tsx` (add a "Paradigmas" sub-module or embed in "Morfología")

- [ ] **Step 1: Create `src/components/RuleEditor.tsx`**
```tsx
import type { GrammarManifest, CategoryParadigm, MutationRule, InflectionSlot, SlotRealization } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface Props { manifest: GrammarManifest; onChange: (m: GrammarManifest) => void; }

const kindOptions: SlotRealization['kind'][] = ['affix', 'mutation', 'stem', 'particle', 'tone'];

const RuleEditor = ({ manifest, onChange }: Props) => {
  const update = (patch: Partial<GrammarManifest>) => onChange({ ...manifest, ...patch });
  const setParadigms = (paradigms: CategoryParadigm[]) => update({ paradigms });
  const setMutations = (mutationRules: MutationRule[]) => update({ mutationRules });

  const addSlot = (cat: string) => {
    const paras = manifest.paradigms.map(p => p.category === cat ? {
      ...p, slots: [...p.slots, { feature: 'nuevo', order: p.slots.length + 1,
        realization: { kind: 'affix', position: 'suffix', form: '-x' } }]
    } : p);
    setParadigms(paras);
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-3">Paradigmas de inflexión</h3>
        {manifest.paradigms.map(p => (
          <div key={p.category} className="mb-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">{p.category}</span>
              <button onClick={() => addSlot(p.category)} className="text-xs text-primary">+ Ranura</button>
            </div>
            {p.slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 my-1">
                <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={s.feature}
                  onChange={e => { const slots = [...p.slots]; slots[i] = { ...s, feature: e.target.value }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} />
                <select className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={s.realization.kind}
                  onChange={e => { const slots = [...p.slots]; slots[i] = { ...s, realization: { ...s.realization, kind: e.target.value as any } }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }}>
                  {kindOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="forma (-t) / reglaId"
                  value={(s.realization as any).form ?? (s.realization as any).ruleId ?? (s.realization as any).replace ?? ''}
                  onChange={e => { const slots = [...p.slots]; const r = s.realization as any; if ('form' in r) r.form = e.target.value; if ('ruleId' in r) r.ruleId = e.target.value; if ('replace' in r) r.replace = e.target.value; slots[i] = { ...s, realization: r }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} />
                <button onClick={() => { const slots = p.slots.filter((_, j) => j !== i); setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} className="text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => setParadigms([...manifest.paradigms, { category: 'verbo', slots: [] }])}
          className="text-sm text-primary">+ Categoría</button>
      </div>

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-3">Reglas de mutación / tono</h3>
        {manifest.mutationRules.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 my-1">
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={m.name} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, name: e.target.value }; setMutations(r); }} />
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="patrón (b)" value={m.pattern} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, pattern: e.target.value }; setMutations(r); }} />
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="reemplazo (v)" value={m.replacement} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, replacement: e.target.value }; setMutations(r); }} />
            <button onClick={() => setMutations(manifest.mutationRules.filter((_, j) => j !== i))} className="text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => setMutations([...manifest.mutationRules, { id: `mr_${Date.now()}`, name: 'Nueva', pattern: '', replacement: '', scope: 'consonant' }])}
          className="text-sm text-primary">+ Regla</button>
      </div>
    </div>
  );
};
export default RuleEditor;
```

- [ ] **Step 2: Mount in `GrammarTab.tsx`**
Add import `import RuleEditor from './RuleEditor';` and render `<RuleEditor manifest={editedManifest} onChange={updateManifest} />` inside the "Morfología" module (or as its own sub-tab). Update `GrammarModule` union to include `'rules'` if adding a sub-tab, and add the case in `renderContent`.

- [ ] **Step 3: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep -E "RuleEditor|GrammarTab" | head
git add src/components/RuleEditor.tsx src/components/GrammarTab.tsx
git commit -m "feat(grammar): rule editor (paradigms + mutation rules)"
```

### Task 13: Upgrade Preview to use the engine + canvas

**Files:**
- Modify: `src/components/GrammarTab.tsx` (replace `buildPreviewSentence` usage in `renderSyntax` preview)

- [ ] **Step 1: Replace the preview computation**
In `GrammarTab.tsx`, change the `preview` memo (line ~250) to use the engine:
```ts
import { realizeClause, validatePhonology } from '../services/grammar';
const preview = useMemo(() => {
  const clause = {
    participants: [
      { role: 'subject', lexeme: preview.entries.subject, features: {} },
      { role: 'verb', lexeme: preview.entries.verb, features: {} },
      { role: 'object', lexeme: preview.entries.object, features: {} },
    ].filter(p => p.lexeme) as any,
  };
  const result = realizeClause(clause, effectiveManifest);
  const violations = validatePhonology(result.sentence.replace(/ /g, ''), effectiveManifest.phonology);
  return { ...result, violations };
}, [effectiveManifest, preview.entries]);
```
Then in `renderSyntax` preview, show `preview.sentence` (already rendered) and `preview.violations` as warnings. The existing canvas already receives `canvas`; optionally seed it from `preview.canvas` when entering the canvas subtab.

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep "GrammarTab" | head
git add src/components/GrammarTab.tsx
git commit -m "feat(grammar): preview uses engine + phonotactic warnings"
```

### Task 14: Offline-aware AI button + notice

**Files:**
- Modify: `src/components/GrammarImporterModal.tsx` (disable import when `!isAiAvailable()`)
- Modify: `src/components/GrammarTab.tsx` (disable "AI Mapper"/induce when offline)

- [ ] **Step 1: Guard the importer**
In `GrammarImporterModal.tsx`, import `isAiAvailable` and on mount:
```ts
const [ai, setAi] = useState(true);
useEffect(() => { isAiAvailable().then(setAi); }, []);
```
Disable the "Analizar/Importar" button when `!ai` and show:
`"Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente."`

- [ ] **Step 2: Same guard for the SyntaxCanvas AI Mapper**
`SyntaxCanvas` already calls `callAi`. Add an `isAiAvailable()` check before enabling the AI Mapper button; when offline, show the same notice. (Pass an `aiAvailable` prop from `GrammarTab`, computed once via `isAiAvailable()`.)

- [ ] **Step 3: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep -E "GrammarImporterModal|SyntaxCanvas|GrammarTab" | head
git add src/components/GrammarImporterModal.tsx src/components/SyntaxCanvas.tsx src/components/GrammarTab.tsx
git commit -m "feat(grammar): offline-aware AI (import + mapper) with notice"
```

---

## Phase 4 — Pipeline Hooks (Neography → Translator)

### Task 15: Expose engine output to Neography

**Files:**
- Modify: `src/components/NeographyModal.tsx` (or the glyph-preview) to accept a `SurfaceForm`/word list from the engine.

- [ ] **Step 1: Add a helper that maps a generated surface form to glyphs**
In `NeographyModal.tsx`, import `realizeLexeme` and, for a given lexeme + features, produce the surface form, then render it through the existing `characterMap`/glyph pipeline. Add a small "Vista gramatical" toggle that calls `realizeLexeme(lexeme, { tense:'past' }, manifest)` and feeds the result string to the glyph renderer.

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep "NeographyModal" | head
git add src/components/NeographyModal.tsx
git commit -m "feat(neography): render engine surface forms as glyphs"
```

### Task 16: Translator blends local engine + LLM

**Files:**
- Modify: `src/components/TranslationPlayground.tsx`

- [ ] **Step 1: Pre-realize with the local engine before calling the LLM**
In `handleSendMessage`, before `conlangAgentChat`, attempt a local realization for known lexicon entries/features and include the realized forms as grounded context. When `!isAiAvailable()`, still produce the local realization (offline translation of known words) and show a notice that free translation needs AI.

- [ ] **Step 2: Typecheck + commit**
```bash
npm run typecheck 2>&1 | grep "TranslationPlayground" | head
git add src/components/TranslationPlayground.tsx
git commit -m "feat(translator): local engine grounding + offline notice"
```

---

## Self-Review (against spec)

1. **Spec coverage:** §3 arquitectura → Fase 0-1 (motor puro). §4 modelo de datos → Task 1. §5.1 morfología → Task 6. §5.2 sintaxis → Task 7. §5.3 fonología → Task 8. §6 IA offline → Task 2 + Task 14. §7 canvas preservado → SyntaxCanvas sin cambio de API (Task 14 añade prop opcional `aiAvailable`). §8 excepciones → Task 10-11. Bidireccional → realizeClause emite SyntaxCanvas (Task 7) y el canvas se lee por roles (Task 14 AI mapper). Cobertura completa.
2. **Placeholder scan:** No hay TBD/TODO. Cada paso de código trae el código. Los pasos de UI muestran los edits concretos.
3. **Type consistency:** `realizeLexeme(lexeme, features, manifest)`, `realizeClause(clause, manifest)`, `validate(word, phonology)` y `SurfaceForm` se definen en Task 5-8 y se reusan en Task 10-16 con la misma firma. `SlotRealization.kind` unificado en Task 1 y Task 12. `LexicalException.featureKey` coincide entre Task 1, Task 6, Task 11. Sin desajustes.

**Notas de alcance:** las limitaciones honestas del spec (sandhi tonal complejo, polisíntesis, no-concatenativo) quedan fuera de estas 16 tareas a propósito; el modelo `SlotRealization` es extensible (`kind: 'pattern'`) para una fase futura.
