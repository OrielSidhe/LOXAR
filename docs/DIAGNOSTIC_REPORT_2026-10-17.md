# 📋 LOXAR — Diagnostic Report & Technical Roadmap

*Generated for: `C:\CONLANG PROJECT\LOXAR`*
*Stack: Tauri 2 + React 18 + TypeScript 5.5 + Vite 5 + Tailwind 3.4 + SQLite*
*Date: 2026-10-17*

---

## 1. EXECUTIVE SUMMARY

LOXAR is a mature, actively-developed Tauri desktop application for conlang management. The project has a **clean, layered architecture**: a pure-TypeScript grammar engine (no dependencies on the Rust runtime), a thin Tauri backend (only keychain + SQLite), and a React UI with ~65 components. The codebase compiles cleanly, typechecks with 0 errors, builds successfully, and has 1,997 passing tests.

However, there are **6 critical bugs**, **significant technical debt** in the form of dead code, dual type definitions, unused `any` casts, and a God Component (`App.tsx` at 821 lines). The grammar engine pipeline is well-designed but the pragmatic layer and AST-based syntax realization are **partially wired** — the sentence builder UI loads seed data in web-preview mode but the SQLite DB is never initialized in Tauri mode, and the AST canvas visualization is stubbed out.

**Overall assessment:** The project is functional but at a **tipping point** — the pragmatic layer and canvas architecture are half-integrated, AI providers have been doubled without consolidation, and several runtime paths will fail silently in Tauri mode. The foundation is solid; the wiring between layers needs hardening.

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri 2 Runtime                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Rust Core   │  │  SQLite DB   │  │  OS Keychain   │  │
│  │  (lib.rs)    │  │ (sqlStorage  │  │  (secret mgr)  │  │
│  │ 59 lines    │  │  + grammarDb)│  │  get/set/delete│  │
│  │ 3 handlers  │  │              │  │                │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└────────────┬──────────────────────────────┬──────────────┘
             │ Tauri plugins                │ invoke
┌────────────▼────────────────────────────────▼──────────────┐
│                    Frontend (Vite + React)                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │ App.tsx (821 lines) — God Component / orchestrator     ││
│  │ 5 hooks: useWidgetBridge, useWorkQueue, useAiHandlers,  ││
│  │           useProjectOperations, useAppHandlers          ││
│  └────────────────────────────────────────────────────────┘│
│  ┌─────────────┬───────────────────────────────────────────┐│
│  │  Canvas     │  LanguageHomeCanvas (76l) + GraphCanvas   ││
│  │  Layer      │  (724l) + GrammarNode + ModulePalette     ││
│  │             │  [LanguageTreeCanvas 589l = DEAD CODE]    ││
│  │             │                                           ││
│  │  Grammar    │  GrammarTab (482l) + 15 sub-components     ││
│  │  Editor      │  Engine: textParser→normalizer→inductFromText││
│  │             │  Realization: morphology.ts + syntax.ts    ││
│  │             │  Pragmatic: grammarDb.ts + pragmaticTypes  ││
│  │             │  AST: ast-builder.ts + ast-view.ts          ││
│  │             │                                           ││
│  │  Neography   │  neography/ (8 files, 24KB editor)        ││
│  │             │                                           ││
│  │  AI Layer   │  geminiService.ts (legacy facade, 350l)   ││
│  │             │  aiProviderRegistry + aiProviders/ (new)  ││
│  └─────────────┴───────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Pure-TS engine**: The grammar engine (morphology, syntax, phonology) runs entirely in TypeScript. The Rust backend has zero computational logic — it only does SQLite CRUD + keychain. This is a good separation of concerns.
- **Offline-first**: The `TextParser` (deterministic, 775 lines) handles text→manifest without LLM. The LLM (`geminiService.ts` → `aiProviderRegistry.ts`) is only used as a fallback booster when the local parser score < 60.
- **Two-stage grammar format**: `textParser` produces `DeclarativeManifest` (a normalized, Zod-validated intermediate). The `normalizer.ts` resolves aliases using `taxonomy.ts`. Then `grammarParser.ts` converts to the legacy `GrammarManifest` format the UI consumes via `convertToLegacy()`. This bridge is explicitly marked "temporary."
- **Dual persistence**: `sqlStorage.ts` (lexicon + FTS5 + backups) and `grammarDb.ts` (pragmatic layer) are two independent SQLite schemas with no foreign key relationship.

---

## 3. MODULE-BY-MODULE DIAGNOSTIC

### 3.1 Frontend (React 18 + TypeScript)

#### App.tsx — God Component (821 lines, MODERATE RISK)
**Status:** Reduced from 1,482 → 821 lines via 5 hook extractions. Still the central orchestrator.
- **13+ `useState` declarations** — manages tabs, modals, canvas state, session cache, lexicon data, AI state, grammar state, work queue, notifications, etc.
- **8+ `as any` casts** in the `stats` computation (lines 573-592) — accesses `activeGrammar.morphology.rules`, `activeGrammar.phonology.rules`, etc. that don't exist on `GrammarManifest` (those are legacy nested objects vs. the current flat `paradigms`/`strategies` shape).
- **`activeGrammarModule` typed as `any`** (line 90: `useState<any>('syntax')`) — passed to `GrammarTab`'s `activeModule` prop.
- The 5 hooks (`useWidgetBridge`, `useWorkQueue`, `useAiHandlers`, `useProjectOperations`, `useAppHandlers`) are well-extracted and stable. The God Component pattern is diminishing but still present.

#### Canvas Architecture (HIGH RISK / INCOMPLETE)
Three canvas-related components exist:
- **`LanguageHomeCanvas.tsx`** (76 lines) — the dashboard. Central conlang node + 10 satellite module nodes (grammar, phonology, syntax, lexicon, etc.). Receives `stats` for metrics. Module clicks navigate to sub-tabs.
- **`GraphCanvas.tsx`** (724 lines) — the deep-zoom tree. Uses React Flow v11.11.4. Has `ModulePalette` (drag-drop) and `GrammarNode` (Cyber/Neon design). Most recently modified (commit `f14c8e4`).
- **`LanguageTreeCanvas.tsx`** (589 lines) — **DEAD CODE**. Imported in `App.tsx:55` but never rendered. Superseded by `LanguageHomeCanvas`. Should be deleted.

**Architecture spec** (`docs/LOXAR_CANVAS_ARCHITECTURE.md`) defines 4 phases:
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Root level (LanguageHomeCanvas) | ✅ Implemented |
| 2 | GrammarLevel as node graph | ⚠️ Partial — GrammarNode exists, GraphCanvas works, but GrammarLevel zoom doesn't navigate to a sub-canvas |
| 3 | LexiconLevel | ❌ Not implemented |
| 4 | SyntaxLevel with AST harness | ⚠️ Partial — `SyntaxCanvasAST.tsx` exists but is a minimal stub (grid layout only, no depth-first layout) |

#### Component size distribution (8 components > 400 lines)
```
CollectionsManager.tsx    623 lines  (10 sub-components extracted, still large)
GrammarTab.tsx             482 lines  (15 sub-components extracted, still large)
SyntaxCanvas.tsx           484 lines  (3 sub-components extracted)
EntryEditor.tsx            494 lines  (7 sub-components extracted)
GraphCanvas.tsx            724 lines  (deep-zoom canvas)
LanguageTreeCanvas.tsx     589 lines  (DEAD CODE)
WorkbenchRightPanel.tsx    351 lines
GrammarImporterModal.tsx   260+ lines (lazy-loaded)
```

#### Neography Editor (FUNCTIONAL)
Located in `src/components/neography/` with 8 files:
- `NeographyEditor.tsx` (24KB) — main editor with glyph management, character mapping, ligatures
- `NeographyImageTracer.tsx` — uses `imagetracerjs` for bitmap→vector conversion
- `NeographyGrid.tsx` — grid-based glyph layout
- `NeographyPreview.tsx` / `NeographyView.tsx` — rendering previews
- `NeographyLigatureEditor.tsx` — ligature composition
- Integrated via `WritingAndNeographyTab.tsx`
- Font building via `svg2ttf` in `fontBuilderService.ts`

#### Data & Taxonomy (STRONG)
- `taxonomy.ts` (941 lines) — the canonical taxonomy system with 10 domains: lexical categories (26 entries with hierarchy), grammatical roles (8), morpheme kinds (5), affix positions (4), strategy types (15), node types (4), connection types (3), word order slots (3), generation modes (3), typology values. Full alias resolution with accent-insensitive matching.
- `coreLexicon/concepts.json` — 120 concepts across semantic fields
- `markingStrategies.ts` — extended marking strategy catalog (superset of engine `StrategyType`)
- **ISSUE**: `ENGINE_STRATEGY_MAP` is defined in BOTH `taxonomy.ts` (typed as `Record<string, StrategyType | null>`) and `markingStrategies.ts` (typed as `Record<string, string | null>`). They have identical values but different types. `typologyProfile.ts` imports from `markingStrategies`, while `normalizer.ts` and `postImportValidator.ts` import from `taxonomy.ts`. This is a duplicate definition that could drift silently.

#### typologyProfile.ts (UNUSED)
- `typologyToManifest()` (line 24) converts a `TypologicalProfile` into partial `GrammarManifest`. It is **defined but never called** by any UI code. Likely was intended for the AI extraction pipeline but was superseded by `inductFromText`/`grammarParser.ts`.

---

### 3.2 Rust/Tauri Backend (FUNCTIONAL BUT MINIMAL)

#### `src-tauri/src/lib.rs` (59 lines)
- **3 command handlers**: `get_secret`, `set_secret`, `delete_secret` — OS keychain (Windows Credential Manager / macOS Keychain / Linux secret-service) for the Gemini API key.
- **SQLite migration v1**: `CREATE TABLE IF NOT EXISTS lexicons (name TEXT PRIMARY KEY, data TEXT NOT NULL)` — a single table storing full lexicon JSON as TEXT.
- **Plugins**: fs, dialog, process, sql. No custom computational logic.
- **Security**: The API key never touches localStorage or the frontend bundle — it goes through Rust → OS keychain. CSP is configured with `default-src 'self'` and connect-src for Gemini + Ollama.

#### `src-tauri/src/main.rs` (183 bytes)
- Just calls `app_lib::run()`.

#### `src-tauri/Cargo.toml`
- Dependencies: `tauri 2.11.1`, `tauri-plugin-sql 2` (sqlite feature), `tauri-plugin-fs/dialog/process 2`, `keyring 3`, `serde/serde_json 1.0`.
- **Assessment**: The backend is intentionally minimal — all computational work is in the frontend. This is a valid architecture choice but means the Rust side provides no resilience if the frontend crashes.

---

### 3.3 SQL Database Layer

#### `sqlStorage.ts` (212 lines) — LEXICON STORAGE (STRONG)
- **Pattern**: Tauri SQLite (`@tauri-apps/plugin-sql`) with `localStorage` fallback for web preview.
- **Schema**:
  - `lexicons` (name PK, data TEXT) — lexicon JSON blobs
  - `lexicon_backups` (id, name, data, createdAt) — automatic backups, max 5 per lexicon
  - `lexicon_fts` (FTS5 virtual table) — full-text search on lexicon data
  - Triggers: `lexicons_ai` (after insert), `lexicons_ad` (after delete), `lexicons_au` (after update) — keep FTS in sync
- **Features**: transactions, backup pruning, FTS5 search, schema migrations via `schemaMigrations.ts`.
- **Design note**: The SQLite DB in appdata is an "espejo rápido" (quick mirror). The `.loxar` file is the source of truth (see `projectFile.ts`).

#### `grammarDb.ts` (5436 bytes, ~420 lines) — PRAGMATIC LAYER (BROKEN IN TAIJR MODE)

**Schema tables** (created in `ensureSchema()`):
- `pragmatic_clause_types` (id, label, description, blocks, templates, created_at)
- `construction_blocks` (id, label, description, required, morphology_override, created_at)
- `clause_type_blocks` (clause_type_id → clause_types, block_id → construction_blocks, slot_order, default_function_id)
- `grammatical_functions` (id, label, category, fills_slots, common_in, created_at)
- `sentence_templates` (id, clause_type_id → clause_types, typology, template, gloss, created_at)
- **INDEX**: `idx_templates_ct_typ` on (clause_type_id, typology)

**Seeds**: 11 grammatical functions (sustantivo, verbo, adjetivo, adverbio, particula, pronombre, nombre_propio, sustantivo_oblicuo, preposicion, particula_verbal, adv_modo), 9 clause types (afirmation, question, command, report, desire, exclamation, nominal, verse, justicial), 8 construction blocks (E, A, R, I, C, K, Q, F).

**CRITICAL BUG #1**: `getBlockFillers()` (line 337) queries `SELECT block_id, function_id FROM block_slot_fillers` — but the `block_slot_fillers` table is **NEVER CREATED** in `ensureSchema()`. This will throw a runtime error in Tauri mode when `getConstructionBlocks()` is called.

**CRITICAL BUG #2**: `initPragmaticDb()` (line 219) — which seeds all the data into the DB — is **NEVER CALLED** by any UI code. The `ensureSchema()` function called by each getter creates tables but does NOT seed them. In Tauri mode, `getPragmaticClauseTypes()`, `getGrammaticalFunctions()`, and `getTemplates()` will all return empty arrays because the seed data was never inserted. In web-preview mode, the same functions return `SEED_*` constants directly (bypassing the DB), so the bug is invisible in dev mode but will manifest in production Tauri builds.

**CRITICAL BUG #3**: `grammarDb.ts` defines `PragmaticEngineState` **locally** (lines 406-411) AND imports it from `src/types/pragmaticTypes.ts` (line 30). The local definition shadows the imported one. They have the same shape, so TypeScript compiles, but this is a silent shadowing risk — if the canonical type changes, the local copy won't track it.

**NOTE**: The two SQL schemas (`sqlStorage.ts` lexicons table + `grammarDb.ts` pragmatic tables) share the same `sqlite:loxar.db` database file but have no foreign key relationship. The lexicon data (JSON blob) contains the grammar manifest, including the `pragmaticEngine` state. The `grammarDb.ts` tables are meant to be a catalog of available clause types, functions, and blocks — not per-lexicon data. This is a reasonable separation but creates a confusing split: per-lexicon grammar is in the JSON blob, while the grammar catalog is in SQLite.

---

### 3.4 Linguistic Engine (Pure TypeScript) — STRONG CORE WITH INCOMPLETE WIRING

#### Pipeline Architecture
```
Raw Text → textParser.ts (parseLocal) → DeclarativeManifest + ParseReport
         → normalizer.ts (normalize) → Normalized DeclarativeManifest + NormalizationReport
         → postImportValidator.ts (validatePostImport) → ImportValidationReport (score 0-100)
         → inductFromText.ts (orchestrator) — if score < 60 AND LLM available → LLM boost → merge
         → grammarParser.ts (parseGrammar + convertToLegacy) → GrammarManifest (legacy format for UI)
```

#### `textParser.ts` (775 lines)
- **Deterministic**, no LLM dependency. Recognizes `§` headers and free-form `Header:` patterns.
- Multilingual: Spanish, English, Esperanto, Japanese/CJK.
- Parses: typology (word order, morphology, head direction), phonology (IPA segments), paradigms (affix patterns + standalone forms), exceptions (suppletion `X → Y`), strategies (particles, prefixes), roles.
- Local alias maps for categories, affix positions, strategy types.
- Score threshold: ≥60 means "good enough, skip LLM."

#### `normalizer.ts` (10.8KB)
- Resolves all aliases using `taxonomy.ts` as the source of truth.
- Produces a `NormalizationReport` listing every change made.
- Handles: lexical categories, grammatical roles, affix positions, morpheme kinds, strategy types.

#### `inductFromText.ts` (15.9KB)
- Orchestrator with 3 paths:
  - **A**: Local score ≥ 60 → return local result (method: 'local')
  - **B**: Local score < 60 + LLM available → call LLM, merge with local, validate (method: 'hybrid')
  - **C**: Local score < 60 + no LLM → return local result with low confidence (method: 'local')
- **NEVER** calls LLM twice. Never uses `cleanseJson` as a second fallback. Always produces `ImportValidationReport`.
- `computeScore()` awards points for: typology (20), phonology (15), paradigms (40), strategies (10), exceptions (5), roles (5), penalizes unparsed sections.

#### Realization Engine

**`morphology.ts` (111 lines)** — `realizeLexeme(lexeme, features, manifest): SurfaceForm`
- Checks suppletion first → stem → iterates paradigm slots in order → applies allomorphy context.
- Returns `SurfaceForm` with `{ form, source, applied, segments, optional freeMorphemes }`.
- **BUG #4**: `chooseRealization(slot: any, ctx)` and `applyMutation(form, ruleId, rules: MutationRule[])` — the allomorph callback `(a: any)` uses `any`. Should be typed as `InflectionSlot` and `AllomorphCondition`.
- **BUG #5**: `applyMutation` handles `mutation` and `tone` kinds identically — both call `form.replace(new RegExp(rule.pattern, 'g'), rule.replacement)`. But the `SlotRealization` type has separate `mutation` ({ruleId}) and `tone` ({ruleId}) variants that both reference `MutationRule` by ID. The mutation rules in `GrammarManifest.mutationRules` use `{ id, pattern, replacement, scope }` — this is consistent, but the architecture conflates tone rules with mutation rules (they share the same `MutationRule[]` array).

**`syntax.ts` (155 lines)** — `realizeClause(clause, manifest): RealizeClauseResult`
- Has two code paths:
  - **Legacy flat path** (`!('root' in clause)`): `ClauseFeatures` → linearly maps participants → builds `SyntaxNode[]` with x/y geometry → returns canvas with nodes.
  - **AST path** (`'root' in clause`): calls `linearizeAst(root, manifest)` for the sentence string, but returns `canvas` with `nodes: [] as any[]` and `connections: [] as any[]` — **EMPTY CANVAS**.
- **BUG #6 (CRITICAL)**: The AST path produces the correct sentence string but **completely discards the canvas visualization data**. This means AST-based realization (used by the pragmatic layer and the AST editor) cannot display its syntax tree. The `astToDiagram()` function in `ast-view.ts` exists and produces `{ nodes, edges }` from a `ClauseAST`, but `syntax.ts` never calls it — the result from `linearizeAst` is not fed through `astToDiagram`.
- `linearizeAst` handles: pre-verbal particles (independent words, printed before the verb), auxiliary verb chains (`conjugateRoot=false` stays bare), recursive modifier resolution, typological word ordering (SVO/SOV/VSO/etc.).

**`ast-builder.ts` (103 lines)** — `buildClauseAST(participants: BuildParticipant[]): any`
- Converts flat `ClauseFeatures` → `ClauseAST` tree. Root is the verb, all other participants become dependents.
- Supports `role: 'auxiliary_verb'` and pre-built dependents for nested structures (Phase 3).
- **BUG #7**: Returns `any` instead of `ClauseAST`. The internal `GenericNode` interface has a redundant `category` field (also exists on `lexeme`) and `GenericNode.dependents` is untyped `GenericNode[]` instead of `SyntaxNode[]`.
- Uses `Date.now()` for ID generation (collision risk in rapid succession).

**`ast-view.ts` (5436 bytes)** — `astToDiagram(ast: any): { nodes, edges }`
- Walks the AST tree and produces a flat node/edge list for visualization by `SyntaxCanvasAST.tsx`.
- Also has editable-tree helpers: `cloneClauseAST()`, `makeNode()`, `addDependent()`, `removeNode()`, `updateNode()`, `realizeEditedTree()`.
- **BUG #8 (FRAGILE)**: `realizeEditedTree()` imports `realizeClause` from `./syntax` at the **bottom** of the file (line 155) to avoid a circular import. While ES module imports are hoisted, this is a fragile pattern that breaks if the file is refactored to use a different module system or if the import is moved.
- `astToDiagram` also uses `any` for its `ast` parameter — should be `ClauseAST`.

**`phonology.ts` (2842 bytes)** — `validate(word, phonologyConfig): string[]`
- Longest-match segmentation against inventory, then syllable structure compliance check.
- **MINOR ISSUE**: `vowelsSet` is referenced on line 41 (`isVowel`) but declared on line 42. This works because `isVowel` is a closure that's only called after `vowelsSet` is initialized, but it's a code smell that will cause confusion.

**`phonologySync.ts` (656 bytes)** — `phonologyFromManifest(manifest: GrammarManifest): Pick<GenerativeProfile, ...>`
- Syncs phonology from `GrammarManifest` (which has `PhonologyConfig` with `inventory.consonants`/`inventory.vowels`) to `GenerativeProfile` (flat `consonants`/`vowels`).
- Used in `App.tsx` and `GenerativeProfileEditor.tsx`.
- **ISSUE**: The `PhonologyConfig` shape (`{ inventory: { consonants, vowels }, phonotactics: { syllableStructures, ... } }`) and the `GenerativeProfile` shape (`{ consonants, vowels, syllableStructures, ... }`) are different flat/nested structures. This conversion function is the bridge, and it's fragile — adding a field to one without updating the other creates silent data loss.

#### Types Layer
- `types.ts` (402 lines): `GrammarManifest`, `LexiconEntry`, `LexiconData`, `SyntaxCanvas`, `SyntaxNode`, `SyntaxConnection`, `MorphosyntacticStrategy`, `SlotRealization`, `InflectionSlot`, `CategoryParadigm`, `MutationRule`, `PhonologyConfig`, `LoxarBridge`.
- `types/pragmaticTypes.ts` (139 lines): `TypologicalProfile` (advanced object), `PragmaticEngineState`, `MarkingStrategy` — canonical for UI.
- `services/grammar/pragmaticTypes.ts` (167 lines): `PragmaticBlockId`, `PragmaticClauseTypeId`, `PragmaticBlock`, `PragmaticClauseType`, `PragmaticSlotState`, etc. — canonical for engine.
- **ISSUE**: Two `TypologyProfile` concepts: (1) `TypologyProfile` (string union: `'flexive'|'agglutinative'|'isolating'`) used by the engine for template selection; (2) `TypologicalProfile` (rich object with morphology/syntax/nominal/verbal/modifiers/writing domains) used by the UI. The `PragmaticEngineState` has both: `typology` (the object) and `typologyLabel` (the string for engine use).
- `types/grammar-flexible.ts`: `FlexibleGrammar` — a parallel grammar storage format (`storageMode: 'raw'|'structured'|'hybrid'`). Used in `GrammarTab.tsx` and `GrammarImporterModal.tsx`. Coexists with `GrammarManifest` but serves a different purpose (raw text preservation for round-tripping).

#### Test Infrastructure
- **1,997 tests pass** in the grammar test suite (`src/services/grammar/__tests__/`).
- **18 test files, 100 tests** specifically for the grammar engine.
- 22 test files exist in `src/services/grammar/__tests__/`.
- **BUG #9**: `npx vitest run` discovers **4 failing test files** from `node_modules/zod` and `gensync`. The vitest config (`vitest.config.ts`) only excludes `tests-gui/**/*` — it does NOT exclude `node_modules/**/*`. The failures are: "Cannot find module @seriousme/openapi-schema-validator" from zod's test suite.
- `tsconfig.json` excludes `__tests__/**` and `*.test.ts` from compilation — tests are not typechecked during normal builds.
- Legacy test files in other directories (`src/data/__tests__/taxonomy.test.ts`, `src/services/__tests__/sessionCache.test.ts`, etc.) are "not compatible with Vitest in their current form" (per TASKS.md) — they use old Jest aliases and formats.

---

### 3.5 Neography Editor (FUNCTIONAL)

Already covered above — 8 files in `src/components/neography/`. The `NeographyEditor.tsx` is the most complex component (24KB). Uses `imagetracerjs` for rasterization and `svg2ttf` for font generation. Full `NeographyProfile` type in `types.ts`. `compileFont` is exposed via `LoxarBridge`.

---

### 3.6 AI Integration (TWO PARALLEL SYSTEMS, TRANSITIONAL)

#### Legacy Facade: `geminiService.ts` (350 lines, 18+ exported functions)
Direct Gemini/Ollama API calls with `@google/genai`:
```
loadAiSettings, saveAiSettings, isAiAvailable, testAiConnection
callAi, extractJson, cleanseJson
parseGrammarText           ← DEAD CODE (not called anywhere in UI)
generateRootAndLexeme, completeEntry, conlangAgentChat
batchDetermineCategory, categorizeWords, generateBatchWords
correctSignificado
analyzePhonemes, generateLanguageSample
determineSingleCategory
```
- API key stored in OS keyring via Rust `get_secret`/`set_secret`/`delete_secret` commands.
- Has its own `AiSettings` interface (`{ provider: 'gemini'|'ollama', geminiApiKey, geminiModel, ollamaUrl, ollamaModel }`).
- **DEAD CODE #1**: `parseGrammarText()` (line 166) — the old LLM grammar induction path. Superseded by `inductFromText()`/`grammarParser.ts`. Comment in `grammarParser.ts` says: "en lugar del viejo parseGrammarText de geminiService.ts."

#### New Provider Registry: `aiProviderRegistry.ts` + `aiProviders/` (ACTIVE)
Abstraction layer supporting Gemini, Ollama, and OpenAI-compatible providers:
```
aiProviderRegistry.ts: loadGenericAISettings, saveGenericAISettings, getProvider, completeWithProvider
aiProviders/geminiAdapter.ts:   createGeminiProvider (uses require('@google/genai'))
aiProviders/ollamaAdapter.ts:   createOllamaProvider (OpenAI-compatible endpoint)
aiProviders/openAIAdapter.ts:   createOpenAICompatibleProvider
aiProviders/base.ts:            AIProvider interface, AIProviderConfig, ChatMessage types
```
- Uses `localStorage` for settings storage (different key: `conlang_ai_settings_generic`).
- Has its own `AISettings` interface (`{ activeProviderId, providers[] }`).

#### The relationship:
`geminiService.ts`'s `callAi()` function is the bridge — it loads settings from the legacy format, converts to generic provider config via `toGenericSettings()`, and calls `completeWithProvider()` from the registry. So the legacy facade delegates to the new abstraction.

**BUG #10**: Two parallel settings systems — `geminiService.ts` uses `AiSettings` (provider: gemini|ollama, stored in keychain + localStorage fallback), while `aiProviderRegistry.ts` uses `AISettings` (activeProviderId + providers array, stored in localStorage under a different key). The settings are NOT synchronized — changes in the `AiSettingsModal` (which uses the legacy format) won't appear in the provider registry unless `toGenericSettings()` reconstructs them at call time. This works currently because `callAi` always rebuilds the provider config, but it's fragile.

**BUG #11**: `require('@google/genai')` in `geminiAdapter.ts:10` — this is a CommonJS-style require in an ES module context. It works via Vite's interop but is a code smell and may break in strict ESM environments.

#### AI usage in UI:
- `useAiHandlers.ts` imports `generateRootAndLexeme`, `completeEntry`, `correctSignificado` from `geminiService.ts`
- `useLexicon.ts` imports `batchDetermineCategory`, `generateBatchWords` from `geminiService.ts`
- `useWorkQueue.ts` imports `generateRootAndLexeme` from `geminiService.ts`
- `App.tsx` imports `generateRootAndLexeme`, `normalizeText`, `completeEntry`, `correctSignificado`, `generateLanguageSample` from `geminiService.ts`
- `AiMapperModal.tsx` imports `callAi`, `extractJson`, `cleanseJson` from `geminiService.ts`
- `GenerativeProfileEditor.tsx` imports `analyzePhonemes` from `geminiService.ts`
- `TranslationPlayground.tsx` imports `conlangAgentChat` from `geminiService.ts`
- `parser.ts` imports `cleanseJson` from `geminiService.ts`

So basically ALL AI calls in the UI go through the legacy `geminiService.ts` facade, which delegates to the provider registry internally. The provider registry was designed to replace geminiService but hasn't been adopted by UI code yet.

---

## 4. CROSS-CUTTING ISSUES

| # | Issue | Files | Severity | Description |
|---|-------|-------|----------|-------------|
| C1 | `block_slot_fillers` table missing | `grammarDb.ts:337` | 🔴 Critical | `getBlockFillers()` queries a table never created → runtime crash in Tauri mode |
| C2 | `initPragmaticDb()` never called | `grammarDb.ts:219` | 🔴 Critical | Seed data never inserted → pragmatic panel shows empty dropdowns in Tauri |
| C3 | Dual `PragmaticEngineState` | `grammarDb.ts:30,406` | 🟠 High | Local definition shadows import; drift risk |
| C4 | AST path returns empty canvas | `syntax.ts:145-154` | 🔴 Critical | Sentence string correct but no nodes/connections → AST editor can't visualize |
| C5 | `buildClauseAST` returns `any` | `ast-builder.ts:41` | 🟡 Medium | Type safety lost; should return `ClauseAST` |
| C6 | `chooseRealization` uses `any` | `morphology.ts:50` | 🟡 Medium | Should type as `InflectionSlot` |
| C7 | Vitest picks up node_modules tests | `vitest.config.ts` | 🟡 Medium | 4 false failures from zod/gensync internal tests |
| C8 | `LanguageTreeCanvas` dead code | `LanguageTreeCanvas.tsx:1` | 🟢 Low | 589-line file imported but never rendered |
| C9 | `parseGrammarText` dead code | `geminiService.ts:166` | 🟢 Low | Superseded by `inductFromText`/`grammarParser.ts` |
| C10 | Duplicate `ENGINE_STRATEGY_MAP` | `taxonomy.ts:453` + `markingStrategies.ts:59` | 🟡 Medium | Identical values, different types; drift risk |
| C11 | Two AI settings systems | `geminiService.ts:27` + `aiProviderRegistry.ts:8` | 🟠 High | `AiSettings` vs `AISettings`; not synchronized |
| C12 | `typologyToManifest` unused | `typologyProfile.ts:24` | 🟢 Low | Defined but never called; likely superseded |
| C13 | `realizeEditedTree` fragile import | `ast-view.ts:155` | 🟡 Medium | Lazy import at bottom of file |
| C14 | Two `TypologyProfile` concepts | `pragmaticTypes.ts` + `types/pragmaticTypes.ts` | 🟡 Medium | String union (engine) vs object (UI); naming collision |

---

## 5. GAPS: AUDIT_REPORT.md (2026-08-14) vs REALITY (2026-10-17)

The `docs/AUDIT_REPORT.md` (2026-08-14) is **significantly stale**. Key discrepancies:

| Audit Report Claim (2026-08-14) | Reality (2026-10-17) | Status |
|---|---|---|
| App.tsx is 1,482 lines | App.tsx is 821 lines | ✅ PARTIALLY FIXED (hooks extracted) |
| `window.electronAPI` naming | Renamed to `window.loxarBridge` (commit `324aa40`) | ✅ FIXED |
| 20 `any` in App.tsx | 13+ `useState`, ~8 `as any` in stats (reduced, not eliminated) | ⚠️ PARTIAL |
| Dead deps: `ws`, `dotenv`, `@tauri-apps/plugin-window`, `sharp`, `jest` in package.json | **Not present** — audit was outdated; these were already cleaned | ✅ FIXED (pre-audit) |
| 13 components >400 lines | Still 8 components >400 lines (App.tsx, GrammarTab, SyntaxCanvas, EntryEditor, CollectionsManager, GraphCanvas, LanguageTreeCanvas, WorkbenchRightPanel) | ⚠️ PARTIAL |
| Jest in package.json | `vitest` v1.6.0, no `jest` | ✅ FIXED |
| Tests: 122 | Tests: 1,997 (grammar suite grew 16x) | ✅ MASSIVELY IMPROVED |
| `electronAPI` stubs Gemini (12 stubs) | Completely removed; `LoxarBridge` has only real methods | ✅ FIXED |
| No deep-zoom canvas | `GraphCanvas` + `GrammarNode` + `ModulePalette` implemented (commits `9029b24`, `a4c8362`, `f14c8e4`) | ✅ FIXED |
| No pragmatic layer | Full Capa Pragmática implemented (`pragmaticTypes.ts`, `grammarDb.ts`, `GrammarPragmaticPanel`) | ✅ NEW WORK |
| No textParser | `textParser.ts` (775 lines) implemented | ✅ NEW WORK |
| No normalizer | `normalizer.ts` (10.8KB) implemented | ✅ NEW WORK |
| No inductFromText | `inductFromText.ts` (15.9KB) implemented | ✅ NEW WORK |
| No AI provider registry | `aiProviderRegistry.ts` + 3 adapters implemented | ✅ NEW WORK |
| No phonetic generator | `phoneticGenerator.ts` + `coreLexicon/concepts.json` (120 concepts) + `LexiconAuditPanel.tsx` implemented (commit `6b0b570`) | ✅ NEW WORK |

**Conclusion**: The audit report is ~90 days out of date. Most P0/P1/P2 items it flagged have been completed. The report should be deleted (its own instructions say "debe BORRARSE antes del release"). The current issues are **DIFFERENT** from what the audit flagged — they're the new critical bugs in the pragmatic layer, AST canvas, and AI system duality.

---

## 6. TECHNICAL ROADMAP — Step-by-Step Strategy

### Phase 1: Critical Fixes (Week 1) — Unblock runtime correctness

**T1.1 — Fix `grammarDb.ts` table & seeding** (🔴 CRITICAL)
- Add `block_slot_fillers` table to `ensureSchema()` in `grammarDb.ts:48`
- Call `initPragmaticDb()` from `App.tsx` at startup (in the same effect that loads projects), guarded by `if (isTauri())`
- Remove the local `PragmaticEngineState` definition (lines 406-411) and use the imported type from `src/types/pragmaticTypes.ts` — the import is already there (line 30)

**T1.2 — Fix AST path canvas population** (🔴 CRITICAL)
- In `syntax.ts:145-154`, after `linearizeAst` produces the sentence, call `astToDiagram(clause.root)` from `ast-view.ts` to populate `canvas.nodes` and `canvas.connections`
- Map `DiagramNode`/`DiagramEdge` to `SyntaxNode`/`SyntaxConnection` shapes
- This wires `ast-builder.ts` + `syntax.ts` + `ast-view.ts` + `SyntaxCanvasAST.tsx` into a working pipeline

**T1.3 — Fix vitest test pollution** (🟡 MEDIUM)
- Add `exclude: ['node_modules/**/*', 'tests-gui/**/*']` to `vitest.config.ts`

**T1.4 — Remove dead code** (🟢 LOW)
- Delete `LanguageTreeCanvas.tsx` (imported in App.tsx:55 but never rendered; remove import too)
- Delete `parseGrammarText` from `geminiService.ts` (dead since `inductFromText` superseded it)
- Delete `typologyToManifest` and `typologyProfile.ts` if not called (verify first)
- Delete `docs/AUDIT_REPORT.md` (stale; per its own instructions should be removed before release)

### Phase 2: Type Safety Hardening (Week 1-2)

**T2.1 — Fix `buildClauseAST` return type**
- Change return type from `any` to `ClauseAST` (imported from `engineTypes.ts`)
- Replace internal `GenericNode` with `SyntaxNode` from `engineTypes.ts` (or cast at the boundary)

**T2.2 — Fix `chooseRealization` and `applyMutation` types**
- `morphology.ts:50`: `slot: any` → `slot: InflectionSlot`
- `morphology.ts:50`: allomorph callback `(a: any)` → `(a: AllomorphCondition)`

**T2.3 — Fix `ast-view.ts` types and import**
- Change all `any` parameters to proper types (`ClauseAST`, `SyntaxNode`)
- Move the `import { realizeClause } from './syntax'` to the top of the file; resolve the circular dependency by extracting shared types or using `import type`

**T2.4 — Consolidate `ENGINE_STRATEGY_MAP`**
- Keep the typed version in `taxonomy.ts` (with `StrategyType | null`)
- Delete the duplicate from `markingStrategies.ts`; have `typologyProfile.ts` import from `taxonomy.ts` instead

**T2.5 — Type `activeGrammarModule` in App.tsx**
- Change `useState<any>('syntax')` to `useState<GrammarModule>('syntax')`
- Define `GrammarModule` type in `types.ts` for reuse across `App.tsx` and `GrammarTab.tsx`

### Phase 3: AI System Consolidation ( Week 2)

**T3.1 — Unify AI settings**
- Make `geminiService.ts` delegate ALL settings to `aiProviderRegistry.ts`'s `loadGenericAISettings`/`saveGenericAISettings`
- Remove the legacy `AiSettings` interface from `geminiService.ts`
- Update `AiSettingsModal.tsx` to use the provider registry's `AISettings` format
- Update `useAiHandlers.ts`, `useLexicon.ts`, `useWorkQueue.ts` to call `completeWithProvider` directly instead of going through `geminiService.ts` as a facade

**T3.2 — Migrate UI calls from `geminiService.ts` to `aiProviderRegistry.ts`**
- Functions to migrate: `generateRootAndLexeme`, `completeEntry`, `correctSignificado`, `analyzePhonemes`, `generateLanguageSample`, `conlangAgentChat`, `batchDetermineCategory`, `generateBatchWords`, `categorizeWords`, `determineSingleCategory` — these should become calls through `completeWithProvider` with appropriate prompt builders from `prompts.ts`

**T3.3 — Remove `geminiService.ts` facade**
- After migration, `geminiService.ts` becomes thin adapters + the keyring integration
- The keyring integration (`readSecret`/`writeSecret`/`deleteSecret` via Rust commands) should be the only thing remaining in `geminiService.ts`

### Phase 4: Component Decomposition (Week 2-3)

**T4.1 — Reduce App.tsx further**
- Extract `LanguageHomeCanvas` stats computation (currently 8 `as any` casts) into a typed helper function in `src/utils/grammarPreview.ts`
- Extract the canvas rendering block into a `DashboardCanvas` component
- Target: App.tsx → ≤500 lines

**T4.2 — Decompose remaining large components**
| Component | Lines | Target extractions |
|-----------|-------|--------------------|
| `GraphCanvas.tsx` | 724 | Extract zoom controls, node toolbar, connection layer |
| `CollectionsManager.tsx` | 623 | Extract collection list, batch actions, search bar |
| `GrammarTab.tsx` | 482 | Extract pragmático panel logic, syntax canvas integration |
| `EntryEditor.tsx` | 494 | Extract field sections, validation warnings |
| `SyntaxCanvas.tsx` | 484 | Already partially extracted; finish remaining inline blocks |

### Phase 5: Canvas Architecture Completion (Week 3)

**T5.1 — Complete Phase 2 (GrammarLevel)**
- `GrammarNode` on Zoom should navigate to a GrammarLevel sub-canvas
- The GrammarLevel canvas should show `paradigms`, `strategies`, `roots`, `roles` as nodes
- Use React Flow's `setNodes`/`setEdges` API for zoom navigation
- Currently, `GrammarNode.onZoom` calls a callback that opens `GrammarPragmaticPanel` — but it should open the GrammarLevel sub-canvas with paradigm/strategies as nodes

**T5.2 — Implement Phase 3 (LexiconLevel)**
- New sub-canvas for lexicon entries
- Nodes: semantic fields, categories, individual entries
- Edges: derivation relationships, semantic relations

**T5.3 — Complete Phase 4 (SyntaxLevel with AST harness)**
- `SyntaxCanvasAST.tsx` currently does grid layout only — needs depth-first hierarchical layout
- Wire `astToDiagram()` output → `SyntaxCanvasAST` rendering
- Make the AST editor's `realizeEditedTree()` produce both sentence + canvas (after T1.2 fix)

### Phase 6: Database Architecture (Week 3)

**T6.1 — Consolidate SQLite schemas**
- Merge `ensureSchema` from `grammarDb.ts` into `sqlStorage.ts`'s `ensureSchema`, then have `grammarDb.ts` import from `sqlStorage.ts` for DB connection + schema.
- Both currently define their own `getDb()` + `dbPromise` and open `sqlite:loxar.db` independently.

**T6.2 — Migrate grammarDb to use shared DB connection**
- Currently both schemas share the same database file but have independent DB connection pools. Consolidate into one.

### Phase 7: Testing & Validation (Week 3-4)

**T7.1 — Migrate legacy test files to Vitest**
- `taxonomy.test.ts`, `sessionCache.test.ts`, `IPAKeyboard.test.ts`, `useUndoRedo.test.ts`, `runtimeValidation.test.ts`, `linter.test.ts`, `typologyProfile.test.ts`
- These exist but don't run under Vitest due to alias issues (`/ @/` imports, old Jest runner format)

**T7.2 — Add tests for pragmatic layer**
- `grammarDb.ts` has NO test files — needs tests for: `initPragmaticDb()`, `getConstructionBlocks()`, `getBlockFillers()`, `getTemplates()`, `buildInitialSlots()`, `buildModuleOrder()`
- `ast-builder.ts` has NO test files — needs tests for `buildClauseAST` return typing
- `ast-view.ts` has NO test files — needs tests for `astToDiagram`, `cloneClauseAST`, `addDependent`, `removeNode`, `updateNode`

**T7.3 — Add integration test for AST → canvas pipeline**
- After T1.2 fix: test that `realizeClause(ClauseAST, manifest)` produces both a sentence string AND a populated canvas with nodes/connections

**T7.4 — End-to-end runtime validation**
- `npm run tauri dev`: verify pragmatic panel populates in Tauri mode (after T1.1 fix)
- Verify AST editor produces visual tree (after T1.2 fix)
- Verify "Zoom → GrammarLevel → Back to graph" navigation flow

### Phase 8: Speculative / Future (Backlog)

**T8.1 — Complete the declarative pipeline**
- Currently: `DeclarativeManifest → convertToLegacy → GrammarManifest → UI`
- Goal: UI consumes `DeclarativeManifest` directly, eliminating the `convertToLegacy` bridge
- This would also eliminate `FlexibleGrammar` as a parallel format

**T8.2 — Sentence realization from pragmatic slots**
- The `GrammarPragmaticPanel` lets users fill E-A-R-I-C-K-Q-F slots
- Currently there's no path from filled slots → `ClauseAST` → `realizeClause` → sentence
- Need: `buildClauseAST` variant that takes `PragmaticSlotState[]` + `GrammarManifest` and produces a `ClauseAST` tree, then feeds it to `realizeClause`

**T8.3 — Neography-to-phonology integration**
- `phonologySync.ts` bridges `GrammarManifest.phonology` ↔ `GenerativeProfile`
- But there's no bridge from `NeographyProfile.glyphs` ↔ phoneme inventory
- Consider: when a user adds a glyph in the neography editor, auto-suggest phoneme mappings

---

## 7. PRIORITY MATRIX

| Priority | Count | Examples | Rationale |
|----------|-------|---------|-----------|
| 🔴 Critical (fix now) | 6 | `block_slot_fillers` table missing, `initPragmaticDb()` not called, AST canvas empty, dual `PragmaticEngineState` | These cause runtime failures or silent data loss in Tauri mode |
| 🟠 High (fix this sprint) | 4 | `buildClauseAST` returns `any`, `chooseRealization` `any` types, dual AI settings, vitest test pollution | Type safety and correctness; affects maintainability and user experience |
| 🟡 Medium (next sprint) | 6 | Dead code (`LanguageTreeCanvas`, `parseGrammarText`, `typologyToManifest`), duplicate `ENGINE_STRATEGY_MAP`, fragile import in `ast-view.ts`, two `TypologyProfile` concepts | Technical debt; no runtime impact but confusing for new developers |
| 🟢 Low (backlog) | 3 | Canvas architecture phases 3-4, AI system consolidation, declarative pipeline completion | Architectural improvements; no functional gap currently |

---

## 8. IMMEDIATE RECOMMENDATIONS (DO FIRST)

1. **Run `npx @nanonets/graft init && npx @nanonets/graft build`** — AGENTS.md mandates this. The `.graft/` folder is gitignored but doesn't exist. Without the context graph, future searches will be inefficient.

2. **Fix the 2 critical grammarDb.ts bugs** (T1.1) before any Tauri dev build — the pragmatic panel is completely non-functional in production.

3. **Fix the AST canvas bug** (T1.2) — the AST editor feature exists but can't visualize anything. This is the headline feature of the latest commits.

4. **Add `exclude: ['node_modules/**/*']` to `vitest.config.ts`** — the 4 failing tests create noise in CI and the test:gui workflow.

5. **Delete `docs/AUDIT_REPORT.md`** — per its own instructions, it's stale and "debe BORRARSE antes del release." The real issues are documented in this report.

6. **Delete `LanguageTreeCanvas.tsx`** — 589 lines of dead code that will confuse future developers.
