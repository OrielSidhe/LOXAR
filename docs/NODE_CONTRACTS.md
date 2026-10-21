# Node Contracts — LOXAR GraphCanvas

> **Documento CANÓNICO de contratos de datos para cada tipo de nodo en `GraphCanvas.tsx`.**
>
> Define para cada tipo de nodo: fuente de datos, métricas mostradas, hijos conceptuales,
> acción de clic, y objetivo de zoom. Sirve como especificación antes de la implementación
> de BLOQUE B (nodos data-driven, canvas state preservation).
>
> Cada sección incluye:
> - **Estado actual** — cómo funciona hoy (muchos nodos usan datos hardcodeados).
> - **Estado objetivo** — cómo debe funcionar tras BLOQUE B.
> - **Referencias de código** — `file:line` exactos para cada pieza.

---

## Arquitectura de niveles

`GraphCanvas` navega entre 4 niveles (`LevelId`):

| Nivel | Componente de nodo principal | Fuente de nodos |
|-------|---------------------------|-----------------|
| `root` | `RootNodeComponent` (conlang-root) + nodos dinámicos del `ModulePalette` | `ROOT_NODE_ID` + `setNodes` con nodo raíz; nodos palette via `handleDrop` |
| `grammar` | 9 `ModuleNodeComponent` | `GRAMMAR_NODES` (línea 128) + `GRAMMAR_EDGES` |
| `lexicon` | 4 `ModuleNodeComponent` | `LEXICON_NODES` (línea 151) + `LEXICON_EDGES` |
| `syntax` | `SyntaxFlowline` (overlay, no ReactFlow) | N/A — canvas AST completo |

Los niveles `grammar` y `lexicon` se activan via `zoomIntoNode` (línea 444), que llama
`setLevel`. El botón "Volver" llama `navigateToLevel('root')` (línea 710).

> **Bug B5**: El `useEffect` en `GraphCanvas.tsx:466-495` purga todos los nodos
> `ROOT_NODES` al volver a `root`, dejando solo `rootNode` + dinámicos.
> Estado del canvas se pierde al navegar. Ver [Canvas State Preservation](#canvas-state-preservation-b5).

---

## Data Sources

| Prop | Origen | Tipo | Nodos que lo usan |
|------|--------|------|-------------------|
| `conlangName` | `App.tsx:575` → `activeMetadata?.conlangName` | `string \| null` | RootNode (selector de conlang) |
| `conlangNames` | `App.tsx:577` → `lexiconHook.lexiconNames` | `string[]` | RootNode (select múltiple) |
| `onSelectConlang` | `App.tsx:578` → `lexiconHook.setActiveLexicon` | `(name: string) => void` | RootNode |
| `stats` | `App.tsx:580-601` (computado desde `activeGrammar` + `activeLexicon`) | objeto estructurado (abajo) | Todos los ModuleNode que muestran stats |
| `lexicon` | `App.tsx:579` → `activeLexicon` | `Array<{ID, Raíz, Léxema, Categoría, Significado}>` | SyntaxFlowline (nivel syntax) |
| `activeModule` | `App.tsx:576` → `activeTab` | `string` | ModuleNode (highlight activo) |
| `onModuleClick` | `App.tsx:602` | `(moduleId: string) => void` | ModuleNode (navega a pantalla) |
| `onZoom` | `GraphCanvas.tsx:444` (`zoomIntoNode`) | `(nodeId: string) => void` | ModuleNode (cambio de nivel) |
| `pragmaticEngine` | `LanguageHomeCanvas.tsx:68` → `onZoomToNode?.('pragmatic')` | `{typologyLabel?, rulesCount?, activeClauseType?}` | **NO se pasa aún** (línea 68 pasa `onZoomToGrammar` pero `LanguageHomeCanvas` no pasa `pragmaticEngine` a `GraphCanvas`) |
| `onZoomToGrammar` | `LanguageHomeCanvas.tsx:68` → `onZoomToNode?.('pragmatic')` | `() => void` | GrammarEngineNode (abre panel pragmático) |

### Stats prop — estructura (App.tsx:580-601)

```typescript
stats = {
  grammar:  { rules, categories, strategies, roles }     // desde activeGrammar
  phonology:{ sounds, rules }                            // desde activeGrammar
  syntax:   { rules, trees }                             // desde activeGrammar
  lexicon:  { entries, categories }                      // desde activeLexicon.length
  neography:{ glyphs, rules }                            // hardcodeado undefined
  semantics:{ fields, relations }                       // hardcodeado 0
  translator:{ translations }                            // hardcodeado 0
  workbench:{ pending, completed }                      // desde incompleteEntries
  collections:{ collections }                           // hardcodeado 0
}
```

> **Nota**: App.tsx:582-593 usa `(activeGrammar as any)?.morphology?.rules` etc.
> El `GrammarManifest` (types.ts:366) no declara `.morphology` o `.syntax.rules`
> como propiedades tipadas — estos son accesos `as any` a propiedades runtime.
> BLOQUE B debe alinear el cálculo de stats con la interfaz tipada real
> (`phonology.inventory.consonants`, `phonology.inventory.vowels`,
> `strategies.length`, `roles.length`, `paradigms.length`, `mutationRules.length`, etc.).

---

## 1. Root Node — `rootNode` / `RootNodeComponent`

**Archivo**: `GraphCanvas.tsx:230-264`

### Estado actual
- **Data source**: Props `conlangName` / `conlangNames` / `onSelectConlang` en `data` del nodo (línea 423).
- **Metrics**: Muestra el nombre del conlang como título (`sin conlang` si null). Si `conlangNames.length > 1`, muestra un `<select>` para cambiar de conlang. Si `=== 1`, muestra el nombre grisado.
- **Children**: No aplica (nodo raíz del canvas). Los módulos se agregan dinámicamente vía `ModulePalette` drag-drop.
- **Click action**: `handleNodeClick` retorna early si `node.id === ROOT_NODE_ID` (línea 521). El nodo raíz NO es clickeable.
- **Zoom target**: Ninguno (nivel root, no hay zoom desde raíz).

### Estado objetivo
- **Data source**: Igual. Proponer agregar `stats.totalEntries` y `stats.totalRules` como subtítulos en el nodo raíz para dar feedback global.
- **Metrics**: Además del nombre, mostrar badge con total de entradas léxicas + reglas gramaticales.
- **Children**: Mantener drag-drop desde palette.
- **Click action**: Podría abrir settings para editar nombre del conlang (future enhancement).
- **Zoom target**: Ninguno.

---

## 2. Grammar Engine Node — `grammarNode` / `GrammarEngineNodeComponent`

**Archivo**: `GraphCanvas.tsx:359-378` (wrapper) + `GrammarNode.tsx:32-130` (tarjeta visual)

### Estado actual
- **Data source**: `pragmaticEngine` prop en `data` (línea 369-371). **Pero `LanguageHomeCanvas.tsx:59-68` NO pasa `pragmaticEngine`** — `GraphCanvas` lo recibe como prop (línea 397-408) pero `LanguageHomeCanvas` no lo inyecta. `GrammarNode` recibe siempre `rulesCount={0}`, `typologyLabel={undefined}`, `status='inactive'`.
- **Metrics mostradas (hardcodeadas)**:
  - Sub-tarjeta `[E] Ergative Case` — muestra `typologyLabel` (hardcodeado `'—'` cuando undefined, línea 76 de GrammarNode).
  - Sub-tarjeta `[X] X-Bar Syntax` — muestra texto estático `"SOV Specifier"` (línea 83).
  - Footer: `"Status: {rulesCount} Rules Compiled"` → siempre `"0 Rules Compiled"`.
- **Children**: Ninguno (es un leaf node en el canvas).
- **Click action**: El botón "Zoom" llama `onZoom` → `onZoomToGrammar` (línea 373).
- **Zoom target**: `LanguageHomeCanvas.tsx:68` → `onZoomToNode?.('pragmatic')` → `App.tsx:621` → abre `activeTab='grammar'` + `setActiveGrammarModule('pragmatic')`.

### Estado objetivo (B2)
- **Data source**: `LanguageHomeCanvas` debe calcular `pragmaticEngine` desde `activeGrammar`:
  - `typologyLabel` ← `morphologyToTypologyProfile(activeGrammar.typology.morphology)` (pragmaticTypes.ts:147)
  - `rulesCount` ← `activeGrammar.paradigms.length` + `activeGrammar.mutationRules.length` + `activeGrammar.exceptions.length`
  - `activeClauseType` ← `activeGrammar.pragmaticEngine?.activeClauseType` (si existe)
- **Metrics objetivo**:
  - `[E]` sub-tarjeta: mostrar `typologyLabel` capitalizado real (no `'—'`). Label: "Ergative Case" (o dinámico según alignment).
  - `[X]` sub-tarjeta: mostrar `wordOrder` del manifest (ej: "SOV Specifier" derivado de `activeGrammar.typology.wordOrder`), no hardcodeado.
  - Footer: `"Status: {rulesCount} Rules Compiled"` con número real.
- **Children**: Mantener leaf node.
- **Click action**: Igual (Zoom → panel pragmático).
- **Zoom target**: Igual (abre panel de pragmática).

### Sub-tarjetas — contrato de datos

| Sub-tarjeta | Data source (objetivo) | Métrica |
|-------------|----------------------|---------|
| `[E]` (align) | `activeGrammar.typology.alignment` | Alignment del idioma (ej: "ergative-absolutive") |
| `[X]` (syntax) | `activeGrammar.typology.wordOrder` | Orden de palabras (ej: "SOV") |

---

## 3. Module Nodes — `moduleNode` / `ModuleNodeComponent`

**Archivo**: `GraphCanvas.tsx:267-355`

### Estado actual
- **Data source**: `node` (GraphNode) + `callbacks` (NodeCallbacks) en `data`.
- **Metrics**: Muestra `node.stats` como pares label/value (líneas 307-315). ROOT_NODES tiene `stats` hardcodeado solo para `'grammar'` (`[{ label: 'Reglas', value: 0 }]`). El `stats` prop de GraphCanvas **NO se mapea** a los nodos en niveles `root`, `grammar`, o `lexicon` — los valores hardcodeados en las constantes `ROOT_NODES`/`GRAMMAR_NODES`/`LEXICON_NODES` nunca se actualizan con datos reales.
- **Children**: `hasChildren` = `['grammar', 'lexicon', 'syntax'].includes(node.id)` (línea 273). Muestra botón "Zoom" solo si `hasChildren`. Botón "→ Ir a pantalla" para nodos con pantalla asociada (líneas 325-332).
- **Click action**: `handleNodeClick` → `onModuleClick(moduleId)` (línea 523). También `handleNavigate` en `onNavigate` (línea 327).
- **Zoom target**: `d.onZoom(node.id)` → `zoomIntoNode` (línea 444): `'grammar'` → nivel grammar, `'lexicon'` → nivel lexicon, `'syntax'` → nivel syntax.

### Estado objetivo (B3-B4)

#### 3a. Root-level Module Nodes (ROOT_NODES + palette dinámicos)

ROOT_NODES (línea 109-118) define 8 módulos. Pero **estos se PURGEAN** al volver a root (línea 478-482). Los módulos visibles en root son los **dinámicos** creados via `ModulePalette` drag-drop (`handleDrop`, línea 547).

| Node ID | Label | Data Source (objetivo) | Metrics (objetivo) | Children | Click → Pantalla | Zoom target |
|---------|-------|----------------------|-------------------|---------|-------------------|-------------|
| `grammar` | Gramática 📐 | `stats.grammar` | Rules, Categories, Strategies, Roles | Sí (grammar level) | `activeTab='grammar'` | `level='grammar'` |
| `phonology` | Fonología 🔊 | `stats.phonology` | Sounds, Rules | Sí (grammar level, sub-módulo) | `activeTab='grammar'`, módulo `'phonology'` | No (root) |
| `syntax` | Sintaxis 🧩 | `stats.syntax` | Rules, Trees | Sí (syntax level) | No (abre canvas syntax) | `level='syntax'` |
| `lexicon` | Léxico 📚 | `stats.lexicon` | Entries, Categories | Sí (lexicon level) | `activeTab='table'` | `level='lexicon'` |
| `workbench` | Workbench 🔨 | `stats.workbench` | Pending, Completed | No | `activeTab='workbench'` | No |
| `neography` | Neografía ✍️ | `stats.neography` | Glyphs, Rules | No | `activeTab='writing'` | No |
| `semantics` | Semántica 💡 | `stats.semantics` | Fields, Relations | No | `activeTab='grammar'` (semántica) | No |
| `translator` | Traductor 🔁 | `stats.translator` | Translations | No | `activeTab='translator'` | No |

> **Nota**: Los nodos dinámicos (`dyn_*`) se crean con `MODULE_LABELS` (línea 181-190)
> que mapea tipo → label/icon/descripción. Los stats deben propagarse desde el
> `stats` prop del canvas al nodo dinámico via `toRfNodes`.

#### 3b. Grammar-level Module Nodes (GRAMMAR_NODES)

GRAMMAR_NODES (línea 128-138) define 9 sub-módulos de gramática. Al hacer zoom en el
nodo `grammar` desde root, se muestra este conjunto.

| Node ID | Label | Data Source (objetivo) | Metrics (objetivo) | Click → Pantalla |
|---------|-------|----------------------|-------------------|------------------|
| `phonology` | Fonología 🔊 | `activeGrammar.phonology` | Consonantes, Vowels, Syllable Structures | `activeTab='grammar'`, módulo `'phonology'` |
| `typology` | Tipología 🧬 | `activeGrammar.typology` | Word Order, Alignment, Morphology, Head Direction | `activeTab='grammar'`, módulo `'typology'` |
| `morphology` | Morfología 🔧 | `activeGrammar.paradigms`, `activeGrammar.mutationRules` | Paradigms, Affixes, Mutation Rules | `activeTab='grammar'`, módulo `'morphology'` |
| `syntax` | Sintaxis 🧩 | `activeGrammar.roles` | Roles, Strategies | `activeTab='grammar'`, módulo `'syntax'` |
| `semantics` | Semántica 💡 | `activeGrammar.notes` | Fields (de manifest), Relations | `activeTab='grammar'`, módulo `'semantics'` |
| `roles` | Roles 🎭 | `activeGrammar.roles` | Role count | `activeTab='grammar'`, módulo `'roles'` |
| `strategies` | Estrategias ⚙️ | `activeGrammar.strategies` | Strategy count | `activeTab='grammar'`, módulo `'strategies'` |
| `pragmatic` | Pragmática 🧭 | `activeGrammar.pragmaticEngine` | Active Clause Type, Slots filled | `activeTab='grammar'`, módulo `'pragmatic'` |
| `notes` | Notas 📝 | `activeGrammar.notes` | Note count | `activeTab='grammar'`, módulo `'notes'` |

> **Estado actual**: Todos muestran `status: 'empty'` y `stats: undefined` (excepto
> `'wordtypes'` en LEXICON_NODES que tiene stats hardcodeados). El `stats` prop no
> se propaga a `toRfNodes(GRAMMAR_NODES, ...)`.

#### 3c. Lexicon-level Module Nodes (LEXICON_NODES)

LEXICON_NODES (línea 151-156) define 4 nodos de léxico. Al hacer zoom en `lexicon`
desde root, se muestra este conjunto.

| Node ID | Label | Data Source (objetivo) | Metrics (objetivo) | Click → Acción |
|---------|-------|----------------------|-------------------|---------------|
| `wordtypes` | Tipos de palabra 🏷️ | `activeLexicon` (categorías únicas) | Número de categorías | No tiene pantalla directa (informativo) |
| `roots` | Raíces 🌱 | `activeLexicon` (raíces únicas) | Número de raíces | No tiene pantalla directa |
| `entries` | Entradas 📖 | `activeLexicon.length` | Total de entradas (real, no 0) | `activeTab='table'` |
| `import` | Importar/Exportar 📦 | N/A | No metrics | Abre `GrammarImporterModal` (texto paste + file upload) |

> **Estado actual**: `wordtypes` tiene stats hardcodeados `[{ label: 'Tipos', value: 10 }]`.
> `entries` tiene `[{ label: 'Entradas', value: 0 }]` (hardcodeado, debería ser `activeLexicon.length`).
> `roots` y `import` no tienen stats.

---

## 4. Syntax Level — `SyntaxFlowline`

**Archivo**: `GraphCanvas.tsx:663-668` (render) + `components/SyntaxFlowline.tsx`

### Estado actual
- **Data source**: `lexicon` prop (full array).
- **Metrics**: El `SyntaxFlowline` renderiza el AST con slots E-A-R-I-C-K-Q-F, preview,
  y botones de acción. Es un overlay, no nodos de React Flow.
- **Children**: N/A (overlay completo).
- **Click action**: Dentro del `SyntaxFlowline` (ver su propio contrato).
- **Zoom target**: N/A (es un nivel hoja, "Volver" vuelve a root).

### Estado objetivo
- **Data source**: Mantener `lexicon` prop. Proponer pasar `pragmaticEngine` +
  `activeGrammar` para sincronizar slots reales.

---

## Canvas State Preservation (B5)

**Bug**: `GraphCanvas.tsx:466-495` — el `useEffect` en `level === 'root'` purga todos
los nodos ROOT_NODES y reemplaza con solo `rootNode` + nodos dinámicos preservados:

```typescript
// Línea 478-482 — PURGE de ROOT_NODES
setNodes(nds => {
  const dyn = nds.filter(
    n => n.id !== ROOT_NODE_ID && !ROOT_NODES.some(rn => rn.id === n.id)
  );
  return [rootNode, ...dyn];
});
```

### Impacto
- Al hacer zoom en `grammar` → se setean GRAMMAR_NODES.
- Al hacer clic en "Volver" → `navigateToLevel('root')` → purga todo, deja solo `rootNode`.
- Cualquier nodo dinámico agregado desde palette desaparece.
- El canvas vuelve a estar "en blanco" (solo nodo raíz).

### Estado objetivo
- **Root → Grammar/Lexicon → Root**: Preservar los nodos dinámicos del nivel `root`
  usando un estado guardado (`const [rootNodes, setRootNodes]` o similar).
- Al volver a `root`, restaurar `rootNode` + nodos dinámicos guardados, NO purgarlos.
- Los nodos `GRAMMAR_NODES` / `LEXICON_NODES` son siempre regenerados (son estáticos,
  no se modifican el usuario), por lo que su purga/recread es aceptable.

---

## Cross-reference: Data Flow Summary

```
App.tsx
  │
  ├─ activeGrammar (GrammarManifest) ──────────────┐
  │   └─ stats.grammar/phonology/syntax           │
  ├─ activeLexicon (array)                         │
  │   └─ stats.lexicon.entries                    │
  ├─ incompleteEntries ────────────────────────────┤
  │   └─ stats.workbench.pending                  │
  │                                                │
  └─ LanguageHomeCanvas                           │
      ├─ conlangName, conlangNames, onSelectConlang │
      ├─ lexicon, onZoomToNode                      │
      ├─ stats (computed)                           │
      └─ App.tsx:580-599                            │
           │                                       │
           ▼                                       ▼
      LanguageHomeCanvas (passthrough)       LanguageHomeCanvas (NO pasa)
           │  ← pragmaticEngine                ┌─ pragmaticEngine prop
           │                                    │  (línea 99-103 GraphCanvas)
           ▼                                    │  pero LanguageHomeCanvas
      GraphCanvas                               │  línea 59-68 NO lo pasa
           │                                    │  → GrammarNode siempre
           ├─ stats prop (no mapeado a nodos)   │  recibe valores default
           ├─ pragmaticEngine prop (undefined)  │  ← BUG B2
           └─ onZoomToGrammar                   │
              │                                 │
              ▼                                 │
      GrammarEngineNodeComponent                │
      (GraphCanvas.tsx:359-378)                 │
           │                                    │
           ▼                                    │
      GrammarNode.tsx                          │
      (GrammarNode.tsx:32-130)                 │
           │  ← hardcodeado "Ergative Case"     │
           │  ← hardcodeado "SOV Specifier"     │
           │  ← rulesCount={0} siempre          │
           │  ← typologyLabel={undefined}       │
           └─────────────────────────────────────┘
```

### Cambios requeridos (BLOQUE B)

| Task | Archivo | Descripción |
|------|---------|-------------|
| B1 | `docs/NODE_CONTRACTS.md` | ✅ Este documento |
| B2 | `LanguageHomeCanvas.tsx:59-68` | Pasar `pragmaticEngine` desde `activeGrammar` (usar `morphologyToTypologyProfile`) |
| B2 | `GrammarNode.tsx:73-84` | Hacer data-driven las sub-tarjetas `[E]` y `[X]` |
| B3 | `GraphCanvas.tsx:466-495` | Mapear `stats` prop a ROOT_NODES/GRAMMAR_NODES/LEXICON_NODES dinámicamente |
| B4 | `GraphCanvas.tsx:466-495` | Propagar stats a nodos en niveles grammar/lexicon; lexicon entries = `activeLexicon.length` |
| B5 | `GraphCanvas.tsx:478-482` | Preservar nodos dinámicos al volver a root |
```
