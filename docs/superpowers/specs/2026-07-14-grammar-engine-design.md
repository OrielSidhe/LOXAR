# Design: Motor de Gramática Local (con IA opcional) — LOXAR

**Fecha:** 2026-07-14
**Estado:** Diseño propuesto (pendiente de revisión del usuario antes de implementar)
**Rama:** `feature/sql-migration-clean`
**Autor:** ZCode (sesión de brainstorming de gramática)

---

## 1. Contexto y problema

Tras análisis diligente del módulo de gramática actual (`GrammarTab`, `SyntaxCanvas`,
`grammarParser`, `TranslationPlayground`, `types.ts`, `types/grammar.ts`):

- **La gramática de hoy es una herramienta de captura/visualización, no un motor.**
  El único código ejecutable es `buildPreviewSentence` (concatena afijos sobre una plantilla
  S/V/O según `typology.wordOrder`). No hay intérprete de reglas.
- **No ejecuta la mayoría de tipos de lengua:** aglutinante solo "crudo" (apila afijos por
  categoría sin rasgos), fusional **no** (sin alomorfia/portmanteaux), tonal/mutación **no**
  (los tipos `tone`/`mutation` en `MorphosyntacticStrategy` no tienen estructura de regla),
  polisintética **no**, no-concatenativa **no**.
- **No traduce ni transforma reglas en computación:**
  - `grammarParser.ts` está **roto**: llama a `window.electronAPI.parseGrammar`, inexistente en Tauri.
  - `TranslationPlayground` es 100% chat LLM (`conlangAgentChat`); la gramática es solo contexto en el prompt.
  - `SyntaxCanvas` es un diagrama (nodos x/y + flechas) sin semántica ejecutable.
- **Fonología capturada pero nunca usada** (el linter fonotáctico P3 no se implementó).
- **Esquema duplicado/incoherente:** `types/grammar.ts` redefine `GrammarManifest` con uniones
  más estrictas y SÍ incluye `transformationRule`; `types.ts` (el que usa la app) no.
- `tsc` tiene 14 errores (3 en el módulo de gramática: `GrammarTab` 222/363, `grammarParser` 5);
  el build pasa (esbuild) pero el tipo queda sucio.

### Decisión del usuario (de la sesión de brainstorming)
- Arquitectura elegida: **motor local pragmático potenciado con IA**.
- **Offline-first:** el motor local resuelve casi todo; si falta IA (sin API key), la app avisa
  los detalles que sin IA no se pueden lograr.
- El front-end **debe respetar el canvas arrastrable/interconectable** (`SyntaxCanvas`).
- Flujo **bidireccional** import/export lo más seamles posible.
- **Sistema de excepciones/irregularidades** es requisito (p.ej. verbos "ser/estar").
- Entregar handoff completo (plan, arquitectura, tareas, sub-agentes).

---

## 2. Objetivo y no-objetivos

**Objetivo:** convertir la gramática de "wiki estructurada" en una **herramienta que produce
formas de superficie reales y deterministas** a partir de un manifiesto editado por el usuario,
reutilizable por Neography (grapemas de las formas) y el Traductor (generación/inflexión local).

**No-objetivos (fase actual):**
- No embeber GF/foma/hfst (WASM) — queda como upgrade futuro opcional.
- No construir un analizador sintáctico completo estilo PCFG/HPSG.
- No soportar fonología no-concatenativa real (raíz+patrón semítico) ni sandhi tonal secuencial
  complejo en esta fase (se documenta como limitación y se deja la puerta abierta).

---

## 3. Arquitectura

Motor **puro TypeScript** (sin React, sin Tauri) en `src/services/grammar/`. En una app Tauri el
"backend" es Rust, pero la morfología determinista es pura lógica: convive en el renderer como
módulo framework-agnóstico, testeable y reutilizable por los otros módulos (todos TS). Migrar a
Rust después es posible (serializar `GrammarManifest`) pero no necesario hoy.

```
┌──────────────────────────── UI (React) ────────────────────────────┐
│  GrammarTab (sub-módulos) · SyntaxCanvas · Preview · ExceptionEditor │
│  RuleEditor (paradigmas/ranuras) · AIInduceButton (offline-aware)    │
│  Import/Export                                                      │
└───────┬───────────────────────────────────────┬────────────────────┘
        │ lee/escribe                              │ autor/inspecciona
        ▼                                          ▼
 GrammarManifest (types.ts)              SyntaxCanvas JSON
        │
        ▼
┌────────────── GRAMMAR ENGINE (TS puro, determinista) ──────────────┐
│  index.ts (orquestador: realizeLexeme, realizeClause)              │
│  ├─ morphology.ts  ranuras/afijos/mutación/alomorfia/supletiva      │
│  ├─ syntax.ts      realizador: rasgos + orden tipológico → superficie│
│  ├─ phonology.ts   valida/transforma contra inventario + silabas    │
│  └─ engineTypes.ts tipos internos del motor                         │
└───────────────┬───────────────────────────────────────────────────┘
                │ invoca (opcional, con guardian)
                ▼
┌──────────────── AI bridge (geminiService) ────────────────────────┐
│  parseGrammarText(text) → manifest        (bootstrap)              │
│  induceRules(canvas|corpus) → manifest     (inducción, difícil)     │
│  isAiAvailable()  (keyring) → degradación offline                   │
└──────────────────────────────────────────────────────────────────┘
        ▲
        │ consumen las SurfaceForm del motor (no la UI)
┌─────── Neography (mapea grafema) · Translator (local + LLM) ───────┘
```

**Principio de única fuente:** `GrammarManifest` (en `types.ts`, sin duplicados) es la única
fuente de verdad. El motor es una función pura `manifest + entrada → SurfaceForm`. El canvas es
una *vista* de esa misma información (las realizaciones del motor pueden emitir un `SyntaxCanvas`
JSON para visualizar).

---

## 4. Cambios en el modelo de datos (`src/types.ts`)

Se **elimina `types/grammar.ts`**; se unifican las definiciones en `types.ts` (quedándose con las
uniones estrictas de tipología del archivo eliminado, que son mejores).

### 4.1 `GrammarManifest` (ampliado)
```ts
export interface GrammarManifest {
  meta: { author: string; version: string; sourceFormat: 'json'|'markdown'; lastUpdated: string };
  phonology?: PhonologyConfig;                 // FUENTE DE VERDAD fonológica (ver §4.5)
  typology: { wordOrder: string; alignment: string; morphology: string; headDirection: string };
  roles: SyntacticRole[];
  strategies: MorphosyntacticStrategy[];        // ahora con transformationRule (§4.3)
  paradigms: CategoryParadigm[];                // NUEVO: infra de inflexión real
  mutationRules: MutationRule[];                // NUEVO: apofonía/gradación/tono
  affixInventory?: GrammarAffix[];              // se mantiene para afijos rápidos (compat)
  exceptions: GrammarException[];               // YA EXISTE; se cablea a UI (§5)
  syntaxCanvas?: SyntaxCanvas;
  preview?: GrammarPreviewConfig;
  notes: string[];
}
```

### 4.2 Ranuras de inflexión (el corazón del motor)
```ts
export interface InflectionSlot {
  feature: string;                 // 'tense'|'number'|'person'|'case'|'gender'|'aspect'|...
  label?: string;
  order: number;                   // posición en la secuencia de realización
  realization: SlotRealization;
  allomorphs?: AllomorphCondition[]; // formas condicionadas por contexto
}

export type SlotRealization =
  | { kind: 'affix'; position: 'prefix'|'suffix'|'infix'|'circumfix'; form: string }
  | { kind: 'mutation'; ruleId: string }            // referencia MutationRule
  | { kind: 'stem'; replace: string }               // tallo supletivo
  | { kind: 'particle'; form: string }              // morfema libre (analítico)
  | { kind: 'tone'; ruleId: string };               // referencia MutationRule (tono)

export interface AllomorphCondition {
  when: string;                    // condición legible/evaluable, p.ej. "prevVowel" | "afterConsonant:#"
  realization: SlotRealization;
}

export interface CategoryParadigm {
  category: string;                // 'verbo'|'sustantivo'|'adjetivo'|...
  slots: InflectionSlot[];
}
```

### 4.3 `MorphosyntacticStrategy` (con regla de mutación/tono)
```ts
export interface MorphosyntacticStrategy {
  id: string; name: string;
  type: StrategyType;              // 'position'|'affix'|'clitic'|'tone'|'mutation'|'particle'|'auxiliary'
  appliesTo: string[];             // role IDs
  appliesToCategories?: string[];
  positionRule?: { anchor: 'verb'|'noun'|'sentence_start'|'sentence_end'; relation: 'before'|'after'; distance: number };
  affixRule?: { position: 'prefix'|'suffix'|'infix'|'circumfix'; form: string; allomorphs?: {condition:string;form:string}[] };
  transformationRule?: { pattern: string; replacement: string };  // mutación/tono (ANTES SOLO EN types/grammar.ts)
  notes?: string;
}
```

### 4.4 `MutationRule` (nueva)
```ts
export interface MutationRule {
  id: string; name: string;
  pattern: string;        // regex o descriptor ("initialConsonant", "stemVowel")
  replacement: string;    // p.ej. "b→v", o regla de tono "H→L"
  scope: 'consonant'|'vowel'|'tone';
}
```

### 4.5 Fonología unificada (fuente de verdad = manifiesto)
```ts
export interface PhonologyConfig {
  inventory: { consonants: string[]; vowels: string[] };
  phonotactics: {
    syllableStructures: string[];      // ['CVC','CV','CCV']  (antes solo syllableStructure:string)
    maxConsonantClusters: number;
    consonantClusters?: string[];
    vowelClusters?: string[];
  };
}
```
`GenerativeProfile` (del léxico) **lee/sincroniza** desde `manifest.phonology` para la generación
con IA (botón "Copiar fonología al perfil" en la UI; la fuente canónica es el manifiesto).

### 4.6 Excepciones/irregularidades
```ts
// Por lexema (supletiva / irregular "ser/estar"):
export interface LexicalException {
  id: string;
  featureKey: string;     // p.ej. "tense=past&number=sg" o "tense=present@1sg"
  surfaceForm: string;    // forma supletiva, p.ej. "fui"
  note?: string;
}
// En LexiconEntry se añade: exceptions?: LexicalException[]

// Registry documentado (YA EXISTE en types.ts, se cablea a UI):
export interface GrammarException {
  id: string; ruleDescription: string; exceptionPattern: string;
  context: string; example?: string; createdAt: string;
}
```
El motor comprueba `LexicalException` **primero** (supletiva); si no hay, aplica las ranuras.
`GrammarException` se usa como registro documentado mostrado en UI y, opcionalmente, para marcar
formas que el motor debe respetar (no reescribir).

---

## 5. Diseño del motor

### 5.1 `morphology.ts` — `realizeLexeme`
```
realizeLexeme(lexeme, features, manifest): SurfaceForm {
  // 1) Supletiva / irregular
  const supp = lexeme.exceptions?.find(e => matchFeatureKey(e.featureKey, features));
  if (supp) return { form: supp.surfaceForm, source: 'suppletion', applied: [supp.featureKey] };

  // 2) Tallo base
  let form = stemOf(lexeme);            // Raíz o Léxema base

  // 3) Ranuras en orden
  const paradigm = manifest.paradigms.find(p => p.category === lexeme.category);
  const slots = (paradigm?.slots ?? [])
    .filter(s => features[s.feature] !== undefined)
    .sort((a,b) => a.order - b.order);

  for (const slot of slots) {
    const ctx = { preceding: form.slice(-1), following: '', env: features };
    const real = chooseRealization(slot, ctx);   // alomorfia por contexto
    form = applyRealization(form, real, manifest.mutationRules);
  }

  // 4) Fonología
  form = phonology.apply(form, manifest.phonology);
  return { form, source: 'rule', applied: slots.map(s => s.feature) };
}
```
- `chooseRealization`: evalúa `allomorphs[].when` contra el contexto; si ninguna coincide, usa
  `slot.realization`.
- `applyRealization`: según `kind` → concatena afijo (prefix/suffix/infix/circumfix), aplica
  `MutationRule` (mutación/apofonía/tono), reemplaza tallo (stem), o emite partícula libre
  (se devuelve como morfema independiente para el realizador sintáctico).

**Cubre:** afijación + apilado (aglutinación), fusión vía alomorfia/portmanteaux condicionados,
mutación/apofonía, marcas de tono básicas, partículas/clíticos/auxiliares (palabra libre), caso/
adposiciones, acuerdo básico (copia de rasgo), y supletiva irregular.

### 5.2 `syntax.ts` — `realizeClause`
```
realizeClause(clause: ClauseFeatures, manifest): { sentence: string; canvas: SyntaxCanvas }
```
- `ClauseFeatures`: predicado (categoría + rasgos) + argumentos (rol → lexema + rasgos) + partículas/libres.
- Aplica `realizeLexeme` a cada participante; ordena según `typology.wordOrder`
  (S/V/O extraídos de `alignment`/roles); inserta partículas/auxiliares de estrategias tipo
  `particle`/`auxiliary`/`clitic`.
- Devuelve **la cadena** y un **`SyntaxCanvas` JSON** (nodos etiquetados con rol/categoría/rasgos,
  conexiones de dependencia) → el canvas lo visualiza directamente. **Flujo bidireccional:**
  reglas → árbol es trivial y determinista; árbol → reglas (inducción) es la dirección difícil y la
  resuelve la IA (ver §6).

### 5.3 `phonology.ts` — `apply` / `validate`
- `validate(word, phonology)`: comprueba que cada sílaba cumple `syllableStructures` y que los
  segmentos están en el inventario; devuelve lista de violaciones.
- `apply(word, phonology)`: punto de extensión para sandhi/simple asimilación (fase actual: solo
  validación + aviso; transformaciones opcionales).

---

## 6. IA (potenciador) + offline-first

- `geminiService.isAiAvailable(): boolean` — lee el secreto del keyring.
- **Funciones locales (siempre funcionan offline):** `realizeLexeme`, `realizeClause`,
  `phonology.validate`. El usuario obtiene superficie real sin conexión.
- **Funciones solo-IA (con guardián + aviso):**
  - `parseGrammarText(text): Promise<GrammarManifest>` — bootstrap desde prosa (corrige
    `grammarParser.ts` para usar `geminiService`, no `window.electronAPI`).
  - `induceRules(canvas | corpus): Promise<GrammarManifest>` — generaliza un árbol/corpus en ranuras
    (dirección difícil). Si `!isAiAvailable()`, el botón se deshabilita y muestra:
    *"Modo offline: la inducción de reglas desde el texto requiere IA. Edita las ranuras manualmente."*
  - `conlangAgentChat` (ya existe) para el Traductor.
- **Aviso unificado:** componente `OfflineNotice` / tooltip en botones IA cuando `!isAiAvailable()`.

---

## 7. UI: se respeta el canvas, se añaden superficies

- **`SyntaxCanvas` se mantiene igual** como superficie visual de autoría/inspección. El motor puede
  *poblarlo* (`realizeClause` devuelve `SyntaxCanvas`) y *leerlo* (nodos con rol/categoría/rasgos
  etiquetados sirven para validar/realizar; la inducción a reglas la hace la IA).
- **Nuevas superficies en `GrammarTab`:**
  - `RuleEditor` (módulo "Morfología" ampliado): editar `paradigms` (ranuras por categoría) y
    `mutationRules`. Migración suave desde `affixInventory`.
  - `ExceptionEditor`: supletiva por lexema (`LexicalException`) + registry `GrammarException`.
  - `Preview` mejorado: usa `realizeClause` (no concat) y muestra el `SyntaxCanvas` resultante.
  - Validador fonotáctico: feedback de `phonology.validate` en tiempo real.
  - `AIInduceButton` (offline-aware) en Importador y en el canvas.
- Se corrigen los 3 errores tsc del módulo y se unifica el esquema.

---

## 8. Alcance y limitaciones (honesto)

**Cubre** (analytic → agglutinative → fusional, + mutación/tono básicos + irregularidades):
afijación (pref/suf/inf/circunfijo), apilado/aglutinación, fusión por alomorfia condicionada,
mutación/apofonía, marcas de tono básicas, partículas/clíticos/auxiliares, orden de palabras por
tipología, caso/adposición, acuerdo básico, supletiva irregular (ser/estar), validación fonotáctica.

**Limitado en esta fase (documentado; puerta abierta a futuro):**
- Sandhi tonal secuencial complejo (reglas de tono que dependen del contexto de varias sílabas).
- Polisíntesis real (incorporación de sintagmas completos más allá de un slot de tallo).
- No-concatenativo real (raíz+patrón semítico) — requeriría un subsistema de *patrones morfológicos*.
- Estas quedan como fase 3/futuro; el modelo de `SlotRealization` es extensible para añadir
  `kind: 'pattern'` sin romper lo demás.

---

## 9. Estrategia de pruebas

- Tests unitarios del motor (tsx o vitest) en `src/services/grammar/__tests__/`:
  - analítica (partículas), aglutinante (3 sufijos apilados), fusional (alomorfia condicionada),
    mutación (gradación), supletiva (ser/estar: presente/poseído distinto),
    fonotactica (palabra válida vs inválida).
- Test de `realizeClause` → cadena + `SyntaxCanvas` round-trip (reglas→árbol→reglas vía fixture).
- Test de `isAiAvailable()` false → `induceRules` lanza/avisa controlado (offline degrade).

---

## 10. Fases de implementación (handoff)

**Fase 0 — Fundación y desbloqueo (limpieza)**
- Eliminar `types/grammar.ts`; unificar `GrammarManifest`/`MorphosyntacticStrategy` en `types.ts`
  (traer `transformationRule`, uniones estrictas de tipología).
- Corregir `grammarParser.ts` → `parseGrammarText(text)` vía `geminiService` (no `window.electronAPI`).
- Corregir 3 errores tsc (GrammarTab 222 `source` widening; 363 props sobrantes en `SyntaxCanvas`;
  grammarParser 5 `parseGrammar` inexistente).
- Unificar fonología: `manifest.phonology` como fuente; `GenerativeProfile` lee/sincroniza.
- Añadir `isAiAvailable()` en `geminiService`.

**Fase 1 — Motor núcleo (TS puro, testeable)**
- `src/services/grammar/{engineTypes,morphology,syntax,phonology,index}.ts`.
- Tests unitarios (§9).

**Fase 2 — Sistema de excepciones/irregularidades**
- `LexicalException` en `LexiconEntry`; `ExceptionEditor` (UI); cablear `GrammarException` al registry.
- Tests de supletiva ser/estar.

**Fase 3 — Integración UI**
- `RuleEditor` (paradigms/mutationRules) en GrammarTab; `Preview` con `realizeClause`+canvas;
  validador fonotáctico; `AIInduceButton` offline-aware.

**Fase 4 — Ganchos de tubería (Neography → Traductor)**
- Exponer `SurfaceForm` del motor para Neography (mapeo de grafema) y Traductor (generación/inflexión
  local + `conlangAgentChat` para pragmática). Traductor deja de ser 100% LLM.

### Sub-agentes sugeridos (estilo handoff)
- **Agente A (Fase 0):** limpieza de tipos + `grammarParser` + 3 errores tsc + fonología. Entrega:
  `tsc` 0 errores nuevos en los archivos tocados, build OK.
- **Agente B (Fase 1):** motor puro + tests. Entrega: `realizeLexeme`/`realizeClause` verdes en tests.
- **Agente C (Fase 2):** excepciones + UI ExceptionEditor. Depende de A (tipos) y B (motor).
- **Agente D (Fase 3):** RuleEditor + Preview + validador + botón IA. Depende de A/B/C.
- **Coordinador (Fase 4):** integra con Neography/Translator (otro módulo, fase posterior).
- Los agentes B y C pueden correr en paralelo tras A; D tras B+C. Cada agente recibe este spec +
  el fragmento de archivo relevante + criterio de aceptación (build + tsc + tests).

---

## 11. Riesgos / preguntas abiertas
- **Rendimiento:** aplicar el motor por entrada es O(ranuras); despreciable. Cachear paradigmas.
- **Alomorfia:** el lenguaje de condición (`when`) debe ser simple y evaluable sin IA; definir 3-4
  predicates (`prevVowel`, `afterConsonant:X`, `wordInitial`, `stressed`) en la Fase 1.
- **Decisión de migración de `affixInventory` → `paradigms`:** mantener ambos (motor prefiere
  `paradigms`, cae a `affixInventory`) para no romper UI actual; migrar en Fase 3.
- **Fonología como fuente:** confirmar que la generación de palabras con IA lee `manifest.phonology`
  (añadir sincronización en `GenerativeProfileEditor`/generación).
