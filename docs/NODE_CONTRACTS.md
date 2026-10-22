# Node Contracts — LOXAR GraphCanvas

> **Documento CANÓNICO de contratos de datos para cada tipo de nodo en `GraphCanvas.tsx`.**
>
> Define para cada tipo de nodo: fuente de datos, métricas mostradas, hijos conceptuales,
> acción de clic, y objetivo de zoom. Se mantiene en sync con el código tras BLOQUE B y
> GAUNTLET D.

## Arquitectura de niveles

`GraphCanvas` navega entre 4 niveles (`LevelId`):

| Nivel | Componente de nodo principal | Fuente de nodos |
|-------|------------------------------|-----------------|
| `root` | `RootNodeComponent` (conlang-root, **raíz del árbol estrella**) + nodos dinámicos del `ModulePalette` | `ROOT_NODE_ID` + `ROOT_NODES` (árbol estrella) + dinámicos vía `handleDrop` |
| `grammar` | 9 `ModuleNodeComponent` | `GRAMMAR_NODES` (GraphCanvas.tsx:153) + `GRAMMAR_EDGES` |
| `lexicon` | 4 `ModuleNodeComponent` | `LEXICON_NODES` (GraphCanvas.tsx:176) + `LEXICON_EDGES` |
| `syntax` | `SyntaxFlowline` (overlay, no ReactFlow) | N/A — canvas AST completo |

Los niveles `grammar` y `lexicon` se activan vía `zoomIntoNode` (GraphCanvas.tsx:621). El botón
"Volver" llama `navigateToLevel('root')`. Los nodos dinámicos y sus **conexiones** se preservan
al navegar (D5, GraphCanvas.tsx:620-621, 683-696).

---

## Data Sources

| Prop | Origen | Tipo | Nodos que lo usan |
|------|--------|------|-------------------|
| `conlangName` | `App.tsx` → `activeMetadata?.conlangName` | `string \| null` | RootNode |
| `conlangNames` | `App.tsx` → `lexiconHook.lexiconNames` | `string[]` | RootNode |
| `onSelectConlang` | `App.tsx` → `lexiconHook.setActiveLexicon` | `(name: string) => void` | RootNode |
| `stats` | `App.tsx` (computado desde `activeGrammar` + `activeLexicon`) | objeto estructurado | ModuleNode que muestra stats |
| `lexicon` | `App.tsx` → `activeLexicon` | array | SyntaxFlowline (nivel syntax) |
| `activeModule` | `App.tsx` → `activeTab` | `string` | ModuleNode (highlight activo) |
| `onModuleClick` | `App.tsx` (GraphCanvas.tsx:101) | `(moduleId: string) => void` | ModuleNode (navega a pantalla) |
| `onNavigate` | `LanguageHomeCanvas.tsx:52` → `onModuleClick` (mapa tab) | `(tab: string) => void` | ModuleNode / GrammarEngineNode (botones) |
| `pragmaticEngine` | `App.tsx:382` (deriva de `activeGrammar`) | `{typologyLabel, rulesCount, alignment, wordOrder, headDirection, activeClauseType}` | GrammarEngineNode |
| `onZoomToGrammar` | `LanguageHomeCanvas.tsx:78` → `onZoomToNode?.('pragmatic')` | `() => void` | GrammarEngineNode (Zoom → panel pragmático) |

### Stats prop — estructura (App.tsx:605-626)

```typescript
stats = {
  grammar:  { rules, categories, strategies, roles }
  phonology:{ sounds, rules }
  syntax:   { rules, trees }
  lexicon:  { entries, categories }
  neography:{ glyphs, rules }         // unwired → undefined
  semantics:{ fields, relations }
  translator:{ translations }
  workbench:{ pending, completed }
  collections:{ collections }
}
```

> **Nota técnica**: App.tsx:607-610 usa accesos `(activeGrammar as any)?....` porque el
> `GrammarManifest` (types.ts) no declara `.morphology/.syntax.rules` como props tipadas.
> BLOQUE B los alinea con la interfaz `TypologicalProfile` (pragmaticTypes.ts).

---

## GAUNTLET D — Contratos actualizados (El Árbol de Verdad)

> Implementado en `GraphCanvas.tsx`. Refleja el estado post-D; los bugs del canvas
> (pipeline en vez de árbol, edges genéricos, sin borrar conexiones, conexiones
> que se deshacen al navegar, nodos inconsistentes) están corregidos.

### D1 — Árbol jerárquico estrella en `root`

- **Contrato**: `conlang-root` es la raíz del árbol. `ROOT_EDGES` (GraphCanvas.tsx:143) es una
  **estrella**: cada arista tiene `from.node === ROOT_NODE_ID` y `to.node` = un módulo.
- **Ventana visible**: el nodo central conecta con sus módulos (Léxico, Gramática, Fonología…).
- **`workbench`** se dobla como botón dentro del nodo Léxico (D3), no es nodo del árbol.
- **Añadir módulos** (palette drag) no pierde conexiones existentes: las aristas del árbol son
  estáticas y se regeneran solo al (re)entrar a `root`; las conexiones dinámicas del usuario se
  preservan por separado (D5).
- **Validación**: `tests/graphCanvasTree.test.ts` verifica que todas las ROOT_EDGES salen de root
  y que cada módulo expone un puerto `in`.

### D2 — Handles nominales (multiples puntos de conexión)

- **Contrato**: `ModuleNodeComponent` (GraphCanvas.tsx:382) renderiza **un `<Handle>` por puerto
  declarado** (`id = port.id`), apilados verticalmente si hay varios por lado. Dejan de ser
  "2 dots genéricos".
- `RootNodeComponent` (GraphCanvas.tsx:338) expone handles nominales en los 4 lados
  (`top/right/bottom/left`) para anclaje radial del árbol.
- `GrammarEngineNodeComponent` (GraphCanvas.tsx:495) expone handles por sub-motor:
  `target` `alignment` + `syntax` (sub-tarjetas E y X), `source` `morph` + `roles`.
- Las aristas referencian `sourceHandle`/`targetHandle` con el `id` del puerto (toRfEdges:256).

### D3 — Regla de contrato: pantallas vs datos

- **Regla**: los módulos que son **PANTALLAS** no tienen nodo propio — viven como botón dentro
  de su nodo padre. **Nodos solo para DATOS**.
  - `Workbench` → botón **dentro del nodo Léxico** (GraphCanvas.tsx:450).
  - `Neografía` (escritura) → botón dentro del nodo escritura (Neografía conserva su nodo de datos
    de glifos/reglas; el editor abre vía su botón).
  - `Importar/Exportar` → nodo `isScreen` con estilo botón de acción (GraphCanvas.tsx:456).
- Al click se navega a la pantalla vía `onNavigate`.

### D4 — Eliminar conexiones

- **Contrato**: toda conexión puede eliminarse.
  - (a) **Seleccionar edge + tecla Supr/Borrar** → `handleDeleteSelected` (GraphCanvas.tsx:806),
    que filtra edgesSeleccionados no estáticos. `onSelectionChange` (GraphCanvas.tsx:907)
    alimenta `selectedEdges`.
  - (b) **Botón `×` flotante** sobre el edge en hover → `DeletableEdge` (GraphCanvas.tsx:271),
    renderizado vía `edgeTypes.deletable` (GraphCanvas.tsx:548).
- Las aristas **estáticas** (estructura del árbol) están marcadas `data.static = true`
  (toRfEdges:256) y **no son eliminables**; solo las conexiones dinámicas del usuario lo son.
- `isValidConnection` (GraphCanvas.tsx:798) impide auto-conexiones.

### D5 — Preservación de posiciones y conexiones (B5-BIS)

- **Bug corregido**: `rootDynNodesRef` (GraphCanvas.tsx:620) guardaba nodos pero se perdían las
  conexiones al navegar. Ahora `rootDynEdgesRef` (GraphCanvas.tsx:621) también preserva las
  aristas dinámicas no estáticas (filtrado en 696) y se restauran al volver a `root` (684).
- **Criterio de aceptación manual**: arrastrar un nodo desde Módulos → conectarlo al central
  (conlang-root) → navegar a grammar → volver → el nodo y su conexión siguen ahí. Ver
  [Pruebas manuales D5](#pruebas-manuales-d5).
- Las posiciones de nodos dinámicos se conservan (el `Node` carra `position`).

### D6 — Unificación de nodos (paleta vs poblados)

- **Contrato**: `grammarNodeType` (GraphCanvas.tsx:229) asigna tipo `grammarNode` a **tanto** el
  nodo `grammar` de `ROOT_NODES` como a los dinámicos `dyn_grammar_*`. Ambos usan
  `GrammarEngineNodeComponent` → **un solo sistema de nodos** (GraphCanvas.tsx:771).
- `handleDrop` (GraphCanvas.tsx:845) construye el data shape `{ node, ...nodeCallbacks }`
  idéntico al de `toRfNodes`, incluyendo `pragmaticEngine`, de modo que el nodo poblado y el
  arrastrado muestran los mismos datos reales.
- El nodo `grammar` muestra stats reales (rulesCount, alignment, headDirection → label X
  data-driven, H1).

### Pruebas manuales D5

1. En `root`, arrastrar "Gramática" desde la paleta al canvas.
2. Conectar el nodo arrastrado al nodo central `conlang-root` (arista dinámica).
3. Hacer Zoom en el nodo `grammar` → nivel `grammar`.
4. Clic en "Volver al árbol principal" → vuelve a `root`.
5. **Resultado esperado**: el nodo arrastrado y la conexión al central persisten (posición + edge).
   Las aristas del árbol (conlang → módulos) también persisten.

---

## Estado actual (post-B2/B3/B4/B5 + H1 + D)

Se ha cerrado la brecha entre el "estado objetivo" de BLOQUE B y la realidad:

- **B2**: `LanguageHomeCanvas.tsx:77` pasa `pragmaticEngine` desde `App.tsx:382`; `GrammarNode` muestra
  `rulesCount` real, `typologyLabel` capitalizado, `alignment` y `wordOrder` reales; la sub-tarjeta **X**
  deriva su label de `headDirection` (H1) con fallback `X-Bar`.
- **B3-B4**: `withStats` (GraphCanvas.tsx:237) mapea `stats` a ROOT/GRAMMAR/LEXICON nodes.
- **B5**: preservación de nodos dinámicos (rootDynNodesRef) + conexiones (rootDynEdgesRef, D5).
- **D1-D6**: árbol estrella, handles nominales, delete edges, screen-as-button, unificación.

---

## 1. Root Node — `rootNode` / `RootNodeComponent`

**Archivo**: `GraphCanvas.tsx:338`

- **Data source**: props `conlangName` / `conlangNames` / `onSelectConlang` / `onZoomToGrammar` en `data`.
- **Metrics**: nombre del conlang como título (`Sin conlang` si null) + selector múltiple.
- **Handles (D1/D2)**: handles nominales en los 4 lados para anclaje radial del árbol estrella.
- **Click action**: `handleNodeClick` retorna early si `node.id === ROOT_NODE_ID` — raíz no navega.
- **Zoom target**: ninguno (es la raíz).

---

## 2. Grammar Engine Node — `grammarNode` / `GrammarEngineNodeComponent`

**Archivo**: `GraphCanvas.tsx:495` (wrapper) + `GrammarNode.tsx` (tarjeta visual)

- **Data source**: `pragmaticEngine` prop (vía `nodeCallbacks`) + `onZoomToGrammar`.
- **Metrics (data-driven)**: sub-tarjeta `[E]` Alignment (`headDirection`-derived label), sub-tarjeta
  `[X]` Syntactic Strategy (label de `headDirection`, fallback `X-Bar`, H1), footer `"Status: N Rules Compiled"` real.
- **Handles (D2)**: `target` `in`/`alignment`/`syntax` (izquierda), `source` `morph`/`roles` (derecha).
- **Children**: leaf (tarjeta).
- **Click action**: `handleNodeClick` → `onModuleClick('grammar')` → abre pestaña grammar.
- **Zoom**: botón `🔍 Sub-módulos` → `onZoom('grammar')` (GraphCanvas.tsx:621) → nivel grammar;
  botón card `Zoom` → `onZoomToGrammar` → panel pragmático.
- **Unificación (D6)**: mismo componente para ROOT_NODES `grammar` y paleta `dyn_grammar_*`.

### Sub-tarjetas — contrato de datos

| Sub-tarjeta | Data source | Métrica |
|-------------|-------------|---------|
| `[E]` (align) | `typology.alignment` | Alineación del idioma |
| `[X]` (syntax) | `typology.headDirection` | Estrategia sintáctica (Head-Initial / Head-Final), fallback `X-Bar` |

---

## 3. Module Nodes — `moduleNode` / `ModuleNodeComponent`

**Archivo**: `GraphCanvas.tsx:382`

- **Data source**: `node` (GraphNode) + `callbacks` (NodeCallbacks) en `data`.
- **Metrics**: `node.stats` como pares label/value (mapeados vía `withStats`).
- **Handles (D2)**: un Handle por puerto declarado (`id=port.id`).
- **Children**: `hasChildren = ['grammar','lexicon','syntax'].includes(node.id)` → botón "Zoom" → nivel.
- **Click action**: `handleNodeClick` → `onModuleClick(moduleId)`.
- **Navegación**: botón "→ Ir a pantalla" → `onNavigate(...)` (tab).
- **Screen nodes (D3)**: `isScreen` renderiza estilo botón compacto de acción (import → navega a grammar).

### 3a. Root-level Module Nodes (ROOT_NODES) — `GraphCanvas.tsx:129`

Árbol estrella `conlang-root` → {grammar, phonology, syntax, lexicon, neography, semantics, translator}.
`workbench` **no** es nodo (botón dentro de Léxico, D3).

### 3b. Grammar-level Module Nodes (GRAMMAR_NODES) — `GraphCanvas.tsx:153`

9 sub-módulos (phonology → typology → morphology → syntax → {semantics, roles, pragmatic} → strategies → notes).

### 3c. Lexicon-level Module Nodes (LEXICON_NODES) — `GraphCanvas.tsx:176`

4 nodos: wordtypes, roots, entries, import (import = `isScreen`).

---

## 4. Syntax Level — `SyntaxFlowline`

**Archivo**: `GraphCanvas.tsx:1120` (render) + `components/SyntaxFlowline.tsx`

- **Data source**: `lexicon` prop.
- Overlay completo (no React Flow nodes). "Volver" vuelve a `root`.

---

## Canvas State Preservation (B5/D5)

**Bug corregido**: navegar `root → grammar/lexicon/syntax → root` preserva ahora posiciones **y
conexiones** de los nodos dinámicos.

- `rootDynNodesRef` (GraphCanvas.tsx:620): nodos `dyn_*` + posición.
- `rootDynEdgesRef` (GraphCanvas.tsx:621): aristas **no estáticas** (conexiones del usuario).
- Al salir de `root`: se filtran y guardan (GraphCanvas.tsx:688-696).
- Al volver a `root`: árbol estático + dinámicos restaurados (GraphCanvas.tsx:683-684).
- Nodos `GRAMMAR_NODES` / `LEXICON_NODES` se regeneran (son estáticos, no modificables por el usuario).
