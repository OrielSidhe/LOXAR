# LOXAR — Teoría de Gramática Universal y su Motor Lógico

**Documento maestro consolidado**
**Fecha:** 2026-07-18
**Autor:** ZCode (sesiones de brainstorming + refactor AST)
**Propósito:** Unificar en un solo lugar la investigación sobre *cómo manejar lógicamente cualquier lengua*, cómo se mapea a la arquitectura del motor de LOXAR, y los porqués/cuándos/dóndes de cada decisión. Fuente de verdad para handoff y futuras fases.

---

## 0. TL;DR (para el conlanger y para el agente)

Toda lengua — natural o construida — comparte un **esqueleto universal** y varía solo en **énfasis y posición**. LOXAR modela ese esqueleto como un **Árbol de Sintaxis Abstracta (AST)**, y lo realiza con un **motor puro y determinista** que lee un `GrammarManifest`. El manifest es la "hoja de ruta" de la lengua; el AST es la cláusula de ejemplo; el motor es la máquina que los convierte en palabras reales.

```
teoría universal  ──►  GrammarManifest (fuente de verdad)
       │                      │
       │                      ▼
       └──►  Árbol AST  ──►  Motor (realizeLexeme / realizeClause / validatePhonology)  ──►  superficie
```

---

## 1. La premisa: ¿cómo manejar lógicamente CUALQUIER lenguaje?

### 1.1 Lo que toda lengua comparte (elementos universales invariantes)

Partimos de la observación del usuario: *"todas las lenguas funcionan igual, aunque hacen énfasis en diferentes cosas; todas conservan los mismos elementos"*. Esos elementos, desnudos de cualquier etiqueta escolar, son:

| Elemento | Qué es | En el motor |
|----------|--------|-------------|
| **Sonidos** (fonología) | el inventario y cómo se combinan | `phonology` + `validatePhonology` |
| **Sujeto** | quien hace la acción | rol `subject` |
| **Acción** | el predicado / verbo (raíz del árbol) | `VerbNode` (`role: 'root'`) |
| **Calificador** | lo que modifica (adjetivo, adverbio, determinante) | rol `modifier` (dependiente) |
| **Nexo** | lo que conecta (relativas, conjunciones, cláusulas) | rol `modifier`/`particle` (anidado) |
| **Partículas** | morfemas libres (preverbales, post, clíticos) | `ParticleNode` (`isIndependentWord`) |

Esto NO es una lista cerrada de "partes de la oración" escolares. Es un **conjunto mínimo de funciones**: alguien actúa, algo califica, algo conecta, algo se dice como partícula suelta. Cualquier lengua del mundo se reduce a combinaciones de estas funciones.

### 1.2 Lo que varía (énfasis y posición)

Dos lenguas con los mismos elementos universales pueden ser totalmente distintas porque varían en:

- **Orden** — ¿el verbo va primero, segundo o último? (SVO, SOV, VSO, libre…)
- **Énfasis morfológico** — ¿pega sufijos (aglutinante), funde (fusional), no marca nada (aislante), o cambia el tono?
- **Caso/alineamiento** — ¿sujeto y objeto llevan marcas distintas (nominativo-acusativo) o el foco lo marca (ergativo)?
- **Head-direction** — ¿el núcleo va antes o después de sus modificadores?

**Ejemplo real analizado (español):**
> "El ave azul que come pistaches voló al cielo."

Descompuesto en funciones universales:
```
(sujeto: ave)
  (calificador: azul)
  (nexo: que)
  (calificador: come pistaches)   ← cláusula relativa = sujeto anidado
(acción: voló)
(partícula: al cielo)             ← direccional
```
Son **dos cláusulas** y al menos un modificador anidado. Un modelo plano "S V O" se rompe aquí; un árbol no.

### 1.3 Por qué un árbol y no una lista plana

El motor original de LOXAR era *"aplicador de reglas plano S/V/O"*. El usuario lo diagnosticó con precisión: *"el motor no es robusto ni flexible ni se adapta a las teorías investigadas"*. Razones:

1. El orden S/V/O es solo **una** de las variantes (§1.2). Una lista plana asume una sola.
2. Los calificadores y nexos **se anidan** (el ave *azul que come pistaches*). Una lista plana no tiene profundidad.
3. Las partículas y los verbos auxiliares **no son sujeto/objeto/verbo**; son funciones aparte.

El **AST** resuelve las tres: modela *quién modifica a quién* (dependientes), no *en qué orden aparece*. El orden es un **detalle de realización** (tipología), no de estructura. Esto es exactamente lo que hacen Universal Dependencies y los árboles de dependencias de la lingüística formal: el árbol lógico es el dato; la posición en pantalla / en la frase es un render.

---

## 2. La arquitectura del motor (qué existe y cómo se conecta)

### 2.1 Capas

```
┌──────────────────────────── UI (React) ────────────────────────────┐
│  GrammarTab · ASTEditor (diagrama de flujo) · Preview · RuleEditor  │
│  ExceptionEditor · GrammarWizard · InfoHint                          │
└───────┬───────────────────────────────────────┬────────────────────┘
        │ lee/escribe                              │
        ▼                                          ▼
 GrammarManifest (types.ts)                Árbol AST (clauseTree)
        │                                         │
        ▼                                         ▼
┌────────────── GRAMMAR ENGINE (TS puro, determinista) ──────────────┐
│  index.ts → realizeLexeme · realizeClause · buildClauseAST         │
│  ├─ morphology.ts   ranuras / afijos / mutación / alomorfia / supletiva
│  ├─ syntax.ts       realiza el AST (partículas, auxiliares, orden)
│  ├─ phonology.ts    valida contra inventario + sílabas
│  ├─ ast-builder.ts  flat participants → ClauseAST
│  ├─ ast-view.ts     ClauseAST → diagrama + helpers de edición
│  └─ engineTypes.ts  tipos del motor (SyntaxNode, VerbNode, etc.)
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Los tres motores (y qué hacen)

| Motor | Función | Entrada → Salida |
|-------|---------|------------------|
| `realizeLexeme` | inflexión de una palabra | `lexeme + features + manifest` → `SurfaceForm` (forma real) |
| `realizeClause` | ordena y realiza la cláusula | `ClauseAST + manifest` → `{ sentence, diagram }` |
| `validatePhonology` | chequea sonidos | `word + phonology` → lista de violaciones |

`realizeLexeme` es **puro y determinista** (no cambia entre ejecuciones). Es la pieza que da confianza: la misma entrada siempre da la misma salida, sin IA.

### 2.3 El `GrammarManifest` (fuente de verdad de la lengua)

Vive **dentro del conlang** (`LexiconData.grammar`). Al cambiar de conlang, se carga el manifest de ese conlang — incluyendo su `clauseTree`. Campos:

| Campo | Qué contiene |
|-------|--------------|
| `meta` | autor, versión, fecha |
| `phonology` | inventario de sonidos + restricciones silábicas |
| `typology` | orden de palabras, alineamiento, morfología, head-direction |
| `roles` | roles sintácticos definidos |
| `strategies` | estrategias morfosintácticas (cómo marca el idioma un significado) |
| `paradigms` | paradigmas de inflexión (tablas de conjugación/declinación) |
| `mutationRules` | reglas de mutación/apofonía/tono |
| `affixInventory` | afijos rápidos (legacy, el motor cae a él si no hay paradigma) |
| `exceptions` | excepciones/irregularidades (ser/estar supletivo) |
| `clauseTree` ⭐ | **el árbol AST de la cláusula de ejemplo** (lo que editas visualmente) |
| `preview` | qué entradas S/V/O usar en el preview |
| `notes`, `ui` | notas libres y banderas de UI |

### 2.4 El Árbol AST (`clauseTree`)

`ClauseAST = { clauseId, root: VerbNode }`. El `VerbNode` es la raíz; todo lo demás cuelga de él como `dependents`. Cada nodo tiene `role` (de §1.1) y `lexeme`. Esto es **universal**: sirve para una lengua aglutinante turca, una aislante china, o una polisintética inuit, porque modela dependencias, no orden.

### 2.5 ¿Un conlanger debe saber todo esto?

**No.** Un principiante solo necesita sonidos + palabras + "cómo suenan juntas". Por eso existen:
- **`GrammarWizard`** — elige un perfil (flexivo-latín, aglutinante-turco, aislante-chino, tonal-thai, polisintético-inuit) y te pre-llena el manifest.
- **`InfoHint`** — explicaciones al pasar el mouse en cada sección.
- **Los 5 `languageProfiles`** — plantillas de tipología lista para usar.

La jerga (`paradigms`, `strategies`, `roles`) está disponible para cuando la necesites, no antes.

---

## 3. El "árbol de interruptores" (lo que propuso el usuario)

El usuario pidió *"un árbol de interruptores que listara las características del lenguaje correcto"*. Eso ya existe, materializado como:

- **`typology`** — los toggles gruesos (SVO/SOV, fusional/aglutinante…).
- **`languageProfiles`** — 5 perfiles base que setean esos toggles de golpe.
- **`GrammarWizard`** — la UI que los presenta como selección, no como formulario técnico.

El flujo deseado: *marcas las características → el motor infiere el resto → ves el preview en vivo*. Eso es exactamente lo que hace el subtab "Preview Rápido" + el "Árbol AST": eliges perfil/tipología, y el motor realiza la oración.

---

## 4. ¿Ya está hecha la investigación? Estado real

**SÍ está hecha la parte lógica y está implementada:**

| Pieza | Estado | Dónde |
|-------|--------|-------|
| Motor de inflexión (`realizeLexeme`) | ✅ implementado + testeado | `src/services/grammar/morphology.ts` |
| Motor de cláusula (`realizeClause`, AST) | ✅ implementado + testeado | `src/services/grammar/syntax.ts` |
| Validación fonotáctica | ✅ implementada + testeada | `src/services/grammar/phonology.ts` |
| AST refactor (árbol jerárquico) | ✅ 5 fases, commiteado | `engineTypes`, `ast-builder`, `ast-view` |
| Editor visual del árbol (conectores) | ✅ implementado, commiteado | `src/components/ASTEditor.tsx` |
| Persistencia del árbol en el manifest | ✅ `clauseTree` en `GrammarManifest` | `src/types.ts` + `normalize.ts` |
| 5 perfiles de lenguaje | ✅ | `src/data/languageProfiles.ts` |
| Wizard + InfoHints | ✅ | `GrammarWizard.tsx`, `InfoHint.tsx` |
| Tests del motor | ✅ 8 tests tsx PASS | `src/services/grammar/__tests__/` |

**NO está hecho (pendiente, fuera de alcance original):**
- Persistencia del *layout* de nodos arrastrados (posiciones) — hoy el layout es efímero; el árbol sí persiste.
- IA inversa (árbol → reglas / inducción) — el motor va reglas→árbol; la dirección difícil la deja el spec a IA (offline-aware).
- Límites honestos del spec: sandhi tonal complejo, polisíntesis real, no-concatenativo (raíz+patrón semítico). El modelo `SlotRealization` es extensible (`kind: 'pattern'`) para fase futura.

---

## 5. Por qué / cuándo / dónde (decisiones de arquitectura)

| Decisión | Por qué | Cuándo | Dónde |
|----------|---------|--------|-------|
| Motor puro TS, sin React/Tauri | testeable, reutilizable por Neography/Translator, migrable a Rust | Fase 1 | `src/services/grammar/` |
| `GrammarManifest` = única fuente de verdad | evita divergencia de modelos (el bug original era `types/grammar.ts` duplicado) | Fase 0 | `src/types.ts` |
| AST en vez de lista plana S/V/O | soporta modificadores anidados, partículas, auxiliares (universal) | Refactor AST | `engineTypes.ts` |
| `clauseTree` en el manifest (no en estado local) | el árbol sobrevive al cierre y viaja con el conlang | Fase editor | `types.ts` + `GrammarTab.tsx` |
| Legacy `SyntaxCanvas` eliminado | modelo paralelo frágil; el ASTEditor es el único canvas | limpieza definitiva | borrado `SyntaxCanvas.tsx` |
| Offline-first (IA opcional) | el usuario obtiene superficie real sin conexión; IA solo para bootstrap/inducción | Fase 0 | `geminiService.isAiAvailable` |
| Excepciones (supletiva) antes que reglas | "ser/estar" no siguen la regla; el motor las respeta primero | Fase 2 | `morphology.ts` |

---

## 6. Glosario para el conlanger (en cristiano)

- **Rol** — el papel de una palabra en la frase (sujeto, objeto…). No es jerga: es "quién hace qué".
- **Estrategia morfosintáctica** — *cómo* tu idioma marca un significado: ¿pegando sufijos? ¿cambiando la raíz? ¿con una palabra suelta?
- **Paradigmas de inflexión** — las tablas de conjugación/declinación ("verbo en pasado = raíz + -t"). Es lo que el motor aplica.
- **Excepciones** — "ir" es irregular, no sigue la regla. El motor las aplica antes.
- **Árbol AST** — la estructura jerárquica de una oración (quién modifica a quién). Universal.
- **Preview** — una oración de ejemplo calculada en vivo desde tu gramática, sin IA.
- **Notas** — texto libre tuya.

---

## 7. Fuentes de esta investigación

- `docs/superpowers/specs/2026-07-14-grammar-engine-design.md` — diseño del motor local (offline-first, AST, manifiesto fuente de verdad).
- `docs/superpowers/plans/2026-07-14-grammar-engine.md` — plan de implementación (16 tareas, Fase 0-4).
- `src/data/languageProfiles.ts` — 5 perfiles tipológicos (flexivo-latín, aglutinante-turco, aislante-chino, tonal-thai, polisintético-inuit).
- `docs/continuity/TASKS.md` — checkpoints de las fases del motor y del refactor AST.
- Conversaciones del usuario: premisa de elementos universales (sujeto/acción/calificador/nexo/partículas), diagnóstico del motor plano como "no robusto/flexible", y pedido de "diagrama de flujo con conectores" para la UI.
- Análisis de Gemini (sesión de brainstorming): propuesta del refactor AST de 4 pasos, adaptada por ZCode.

---

## 8. Próximos pasos sugeridos (no implementados)

1. **Persistir layout de nodos** — guardar posiciones arrastradas en `clauseTree.layout` para que el árbol se vea igual al reabrir.
2. **Cablear `sessionCache.ts` a `App.tsx`** — unificar la sesión en runtime con `SESSION_CACHE.json` (hoy solo doc de handoff).
3. **Edición de roles vía dropdown** en `ASTEditor` (hoy usa `window.prompt`).
4. **Fase futura** — `SlotRealization.kind: 'pattern'` para no-concatenativo; IA inversa para inducción de reglas.

---

*Fin del documento maestro. Todo lo anterior es la consolidación de la investigación sobre el manejo lógico de cualquier lenguaje y su implementación en LOXAR.*
