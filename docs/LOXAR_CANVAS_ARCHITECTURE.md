# LOXAR — Arquitectura del Canvas Navegable (Deep-Zoom Tree)

**Versión:** 1.0 — 2026-09-09
**Estado:** Diseño aprobado, implementación en curso
**Autor:** ZCode / Victor Sidhe
**Propósito:** Documentar la arquitectura del sistema de canvas infinito con deep-zoom que sirve como navegación central de LOXAR. Fuente de verdad para handoff.

---

## 0. Visión (el "por qué")

LOXAR es una IDE de conlangs donde **toda lengua comparte un esqueleto universal** y varía solo en énfasis y posición. La interfaz principal NO es un menú de tabs: es un **árbol gráfico navegable** donde:

- El **tronco/centro** es el conlang
- Las **ramas** son módulos (gramática, léxico, fonología, etc.)
- Cada rama es **zoomable** → revela sub-componentes
- Los **sub-componentes se comparten** entre ramas (ej: "tipos de palabra" vive en Léxico Y en Sintaxis)
- El **punto final** de cada rama es donde estructuras morfología y flujo del lenguaje mediante nodos
- Los **nodos son el arnés** que se llena con datos reales del léxico (raíz + función) → genera preview

**El léxico es la materia prima.** Los nodos le dan forma. El preview muestra el resultado.

---

## 1. Jerarquía de niveles (zoom)

```
Nivel 0 (PRINCIPAL — pantalla inicial)
  └── Centro: Conlang
      ├── Gramática ──[zoom]──→ Nivel 1A
      ├── Léxico ─────[zoom]──→ Nivel 1B
      ├── Fonología ──[zoom]──→ Nivel 1C
      ├── Sintaxis ───[zoom]──→ Nivel 1D (también accesible desde Gramática)
      ├── Neografía
      ├── Semántica
      ├── Traductor
      └── Workbench

Nivel 1A (zoom en Gramática)
  ├── Fonología (compartido con Nivel 1C)
  ├── Tipología
  ├── Morfología
  ├── Sintaxis ──[zoom]──→ Nivel 2A (arnés AST)
  ├── Semántica
  ├── Roles
  ├── Estrategias
  ├── Pragmática
  └── Notas

Nivel 1B (zoom en Léxico)
  ├── Tipos de palabra (compartido con Sintaxis)
  ├── Raíces
  ├── Entradas
  └── Importar/Exportar

Nivel 1D / 2A (zoom en Sintaxis)
  ├── Slot Sujeto ( espera función: sustantivo/pronombre )
  ├── Slot Acción ( espera función: verbo )
  ├── Slot Receptor ( espera función: sustantivo/pronombre )
  ├── Slot Modificador ( espera función: adjetivo/adverbio )
  └── Preview ←──[realizeClause]── Motor de gramática
```

---

## 2. Modelo de datos (reutilizar lo existente)

### 2.1 Datos que alimentan los nodos (NO inventar nuevos)

| Dato | Fuente | Se usa en |
|------|--------|-----------|
| Raíz | `LexiconEntry.Raíz` | Léxico, Sintaxis (slots) |
| Léxema | `LexiconEntry.Léxema[]` | Léxico, Sintaxis (slots) |
| Categoría/Función | `LexiconEntry.Categoría` → `taxonomy.ts` `LEXICAL_CATEGORIES` | Léxico (tipos de palabra), Sintaxis (slots), Pragmática |
| Significado | `LexiconEntry.Significado[]` | Léxico, Sintaxis (preview) |
| Funciones gramaticales | `taxonomy.ts` `GRAMMATICAL_ROLES` | Sintaxis (slots), Gramática |
| Estrategias | `taxonomy.ts` `STRATEGY_LEGEND` | Gramática, Morfología |
| Tipología | `GrammarManifest.typology` | Gramática, Tipología |
| AST | `engineTypes.ts` `ClauseAST` | Sintaxis (arnés) |
| Reglas morfológicas | `GrammarManifest.paradigms` | Morfología, Sintaxis (preview) |

### 2.2 El arnés (nodos de Sintaxis)

Los nodos de Sintaxis son slots que esperan una **función gramatical** específica:

```typescript
type SyntaxSlot = {
  id: 'subject' | 'action' | 'receiver' | 'modifier' | 'nexus';
  label: string;
  expectedFunction: string; // key canónica de taxonomy.ts
  filled?: {
    entryId: string;      // LexiconEntry.ID
    root: string;         // LexiconEntry.Raíz
    function: string;     // key canónica
    meaning: string;      // primer significado
  };
};
```

Cuando un slot está lleno, el preview llama al motor:
```typescript
realizeClause(ast, manifest) → string // forma de superficie
```

### 2.3 Componentes compartidos

Los siguientes componentes aparecen en MÚLTIPLES niveles (misma datos, no copias):

| Componente | Niveles donde aparece |
|------------|----------------------|
| Tipos de palabra (funciones) | Léxico, Sintaxis, Pragmática |
| Raíces | Léxico, Sintaxis |
| Reglas fonológicas | Fonología, Morfología, Sintaxis |
| Estrategias de marcaje | Gramática, Morfología, Sintaxis |

---

## 3. Flujo de usuario (ejemplo completo)

```
1. Usuario abre LOXAR → ve Nivel 0 (conlang al centro + ramas)
2. Click en "Léxico" → puede:
   a) Ir a la tab Léxico existente (navegación tradicional)
   b) Hacer zoom → ver componentes del léxico (tipos, raíces, entradas)
3. Zoom en Gramática → ve sub-módulos como grafo de nodos
4. Click en Sintaxis (dentro de Gramática) → zoom al arnés AST
5. En el arnés: slots vacíos (Sujeto, Acción, Receptor...)
6. Usuario selecciona un lexema del léxico (raíz "lugal", función "sustantivo")
7. Lo arrastra al slot "Sujeto" → slot se llena
8. Repite para Acción (verbo "dù", "construir")
9. Preview muestra: "lugal-e dù" (con las reglas activas de gramática)
10. Usuario ajusta switches (persona, número, tiempo) → preview se actualiza
11. Exporta: gramática + léxico + font + corpus → archivo .loxar
```

---

## 4. Arquitectura técnica

### 4.1 Componentes

```
src/components/
  GraphCanvas/                    ← NUEVO: canvas infinito con deep-zoom
    ├── GraphCanvas.tsx           ← componente principal (pan/zoom/levels)
    ├── GraphNode.tsx             ← nodo individual (header/body/ports)
    ├── GraphEdges.tsx            ← SVG bezier connections
    ├── GraphControls.tsx         ← zoom slider, breadcrumb, tools
    ├── levels/
    │   ├── RootLevel.tsx         ← Nivel 0: conlang + módulos
    │   ├── GrammarLevel.tsx      ← Nivel 1A: sub-módulos de gramática
    │   ├── LexiconLevel.tsx      ← Nivel 1B: componentes del léxico
    │   └── SyntaxLevel.tsx       ← Nivel 2: arnés AST + preview
    └── shared/
        └── SharedComponents.tsx  ← tipos de palabra, raíces, etc.
  LanguageHomeCanvas.tsx          ← wrapper que monta GraphCanvas
```

### 4.2 Estado del canvas

```typescript
type CanvasState = {
  level: 'root' | 'grammar' | 'lexicon' | 'syntax';
  transform: { x: number; y: number; zoom: number };
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  draggedItem: { type: 'lexeme' | 'root' | 'function'; data: any } | null;
  syntaxSlots: SyntaxSlot[];  // estado del arnés
  previewParams: { person: number; number: string; tense: string };
};
```

### 4.3 Integración con motor existente

```typescript
// Preview llama al motor de gramática (ya existe)
import { realizeClause } from '../services/grammar/syntax';
import { buildClauseAST } from '../services/grammar/ast-builder';

function generatePreview(slots: SyntaxSlot[], manifest: GrammarManifest): string {
  const ast = buildClauseAST(slots);        // slots → ClauseAST
  return realizeClause(ast, manifest);       // ClauseAST → superficie
}
```

### 4.4 Integración con léxico existente

```typescript
// Los slots se llenan con datos reales del léxico
import { LexiconEntry } from '../types';

function fillSlot(slot: SyntaxSlot, entry: LexiconEntry): SyntaxSlot {
  return {
    ...slot,
    filled: {
      entryId: entry.ID,
      root: entry.Raíz,
      function: entry.Categoría,  // normalizado via taxonomy
      meaning: entry.Significado[0] ?? '',
    },
  };
}
```

---

## 5. Implementación por fases

### Fase 1: Canvas multinivel (COMPLETADO)
- [x] Infinite canvas con pan/zoom
- [x] Nodos arrastrables con puertos
- [x] Conexiones bezier SVG con glow
- [x] Deep-zoom básico (root → grammar → syntax/lexicon)
- [x] Root level como vista principal (conlang centro + módulos)
- [x] Navegación entre niveles con animación de cámara
- [x] Breadcrumb dinámico
- [x] Dropdown de conlangs en el centro (reutiliza `lexiconHook.lexiconNames`)
- [x] Sidebar colapsable (botón chevron, ancho w-16 → w-12)
- [x] Highlight de búsqueda con contraste mejorado (amber-400/40)

### Fase 2: Grafo de Gramática
- [ ] Sub-módulos como nodos conectados (no grid)
- [ ] Conexiones lógicas entre sub-módulos
- [ ] Click navega a tab existente

### Fase 3: Léxico zoomable
- [ ] Componentes del léxico (tipos, raíces, entradas)
- [ ] Drag de lexema a otros módulos
- [ ] Componentes compartidos visibles

### Fase 4: Arnés AST + Preview
- [ ] Slots con funciones esperadas
- [ ] Preview con realizeClause
- [ ] Switches de parámetros (persona/número/tiempo)
- [ ] Exportación de resultado

### Fase 5: Documentación
- [ ] Este documento actualizado
- [ ] Handoff claro para siguiente AI

---

## 6. Principios de diseño

1. **Reutilizar, no inventar**: tipos, funciones, raíces, significados vienen de `taxonomy.ts` y `LexiconEntry`
2. **Sin identidades locales**: si agregás un campo/tipo, verificar TODOS los consumidores
3. **Bidireccional**: crear/exportar AND importar
4. **Lenguaje simple**: sin tecnicismos para el conlanger
5. **Todo interconectar**: un cambio en un nodo impacta preview, export, otros módulos
6. **Sin prototipos**: todo funcional y operativo, si no se termina → handoff claro

---

## 7. Handoff (para la siguiente AI)

### Estado actual
- `GraphCanvas.tsx` — canvas infinito multinivel (root/grammar/lexicon/syntax)
- `LanguageHomeCanvas.tsx` — wrapper que conecta con `lexiconHook`
- `VerticalSidebar.tsx` — ahora colapsable con botón chevron
- `LexiconTable.tsx` — highlight de búsqueda mejorado (amber-400/40)
- Root level es la vista principal con el conlang al centro + dropdown selector
- Deep-zoom funcional: root → grammar (grafo de 9 sub-módulos) → syntax (arnés AST)
- Dropdown de connected to `lexiconHook.lexiconNames` y `setActiveLexicon`

### Próximos pasos
1. Refactorizar `LanguageHomeCanvas` para que root level sea la vista principal
2. Crear `GrammarLevel` como grafo de nodos (no grid)
3. Crear `LexiconLevel` con componentes compartidos
4. Crear `SyntaxLevel` con arnés AST + preview
5. Implementar drag & drop entre niveles
6. Conectar preview a `realizeClause`

### Archivos clave
- `src/components/LanguageHomeCanvas.tsx` ← canvas principal
- `src/services/grammar/syntax.ts` ← motor (realizeClause)
- `src/services/grammar/ast-builder.ts` ← slots → AST
- `src/services/grammar/engineTypes.ts` ← tipos del motor
- `src/data/taxonomy.ts` ← funciones gramaticales canónicas
- `src/types.ts` ← LexiconEntry, GrammarManifest
- `src/App.tsx` ← onModuleClick handler (línea 574)

### Validaciones
- `npm run typecheck` → 0 errores
- `npm run lint` → OK
- `npm run build` → OK
- `npm run tauri dev` → validación visual por usuario

---

**Fin del documento v1.0**
