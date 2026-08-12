# Spec-Driven Development (SDD) — LOXAR

**Versión:** 1.0  
**Última actualización:** 2026-08-01  
**Rama:** `feature/sql-migration-clean`  
**Autor:** ZCode / Victor Sidhe  
**Alcance:** Proyecto LOXAR completo (Tauri + React + TS)

---

## Índice

1. [Filosofía SDD en LOXAR](#1-filosofía-sdd-en-loxar)
2. [Taxonomía de artefactos](#2-taxonomía-de-artefactos)
3. [SDD Workflow: checklist obligatoria](#3-sdd-workflow-checklist-obligatoria)
4. [Perfil arquitectónico del proyecto](#4-perfil-arquitectónico-del-proyecto)
5. [ADRs existentes (retrospectivas)](#5-adrs-existentes-retrospectivas)
6. [Decisiones pendientes (backlog de ADRs)](#6-decisiones-pendientes-backlog-de-adrs)
7. [Cumplimiento y auditoría](#7-cumplimiento-y-auditoría)
8. [Apéndice: SDD y el video de referencia](#8-apéndice-sdd-y-el-video-de-referencia)
9. [Historial de cambios](#9-historial-de-cambios)

---

## 1. Filosofía SDD en LOXAR

### 1.1 ¿Qué es SDD para LOXAR?

Spec-Driven Development es la disciplina de **escribir la especificación del comportamiento deseado ANTES de escribir el código que lo implementa**.

En LOXAR, SDD significa:

> **Todo cambio significativo comienza por un documento de especificación (spec) que responde: QUÉ, POR QUÉ, Y CON QUÉ CRITERIOS DE ACEPTACIÓN — antes de tocar una línea de código.**

El spec es el **contrato entre intención e implementación**. El código es la materialización de ese contrato. Si el spec cambia, el código se adapta; si el código se desvía, el spec se actualiza o se documenta la desviación.

### 1.2 Principios operativos (Reglas de Oro de SDD)

| # | Regla | Justificación |
|---|-------|---------------|
| **SDD-1** | **Spec antes de código.** Toda feature/arquitectura con estimación >1h, >3 archivos, o que cruza límites de módulo requiere spec escrito y aprobado antes de implementar. | Evita "vibe coding": desarrollo guiado por impulsos, sin visión clara. |
| **SDD-2** | **ADR para decisiones arquitectónicas.** Toda decisión que no pueda revertirse en <30 min, que toque límites de módulo, o que implique >500 LOC de cambio estructural → ADR. | Documenta el "por qué" de decisiones que se olvidan en 3 meses. |
| **SDD-3** | **Trazabilidad código↔spec.** Cada archivo touched en una implementación debe referenciarse al spec y ADR correspondientes en el commit message y checkpoint de `TASKS.md`. | Permite retomar cualquier cambio con contexto completo. |
| **SDD-4** | **Acceptance criteria ejecutables.** Cada spec incluye criterios de aceptación medibles: `npm run build`, `npm run typecheck`, tests unitarios, y criterios de runtime cuando aplique. | Elimina la ambigüedad de "¿ya está?" — hay métricas. |
| **SDD-5** | **Separación producto/arquitectura/código.** El `what/why` vive en specs (docs/superpowers/specs/); el `how` vive en código (src/); el `plan de ejecución` vive en docs/superpowers/plans/. | Clarifica responsabilidades: specs definen, planes ejecutan, código materializa. |

### 1.3 Cuándo escribir un spec (umbrales)

**Escribir spec cuando cualquiera de estos umbrales se cumpla:**

| Umbral | Acción |
|--------|--------|
| Estimación >1h de trabajo | Escribir spec antes de empezar |
| >3 archivos tocados | Escribir spec antes de empezar |
| Cruza límites de módulo (p. ej., lexicón → gramática) | Escribir spec antes de empezar |
| Decisión arquitectónica irreversible | Escribir ADR antes de implementar |
| Nueva dependencia externa | Escribir ADR antes de instalar |
| Cambio en modelo de datos central (`types.ts`) | Escribir spec antes de empezar |

**No requiere spec cuando:**
- Fix de typo o sintaxis rota
- Renombrado de variable local
- Ajuste de estilo CSS/Tailwind
- Actualización de documentación sin cambio de comportamiento
- Cambios que cumplen los 3 criterios negativos: <1h, <3 archivos, no cruza límites de módulo, totalmente reversible

### 1.4 Cuándo escribir un ADR

**Escribir ADR cuando cualquiera de estos casos aplique:**

| Caso | Ejemplo en LOXAR |
|------|-----------------|
| Decisión arquitectónica >500 LOC | Motor de gramática puro TS vs Rust |
| Toca límites de módulo | Persistencia dual SQLite/localStorage |
| Nueva dependencia externa | Zod v4, keyring crate |
| Cambio en modelo de datos central | Unificación de `GenerativeProfile` vs `PhonologyConfig` |
| Decisión irreversible sin rollback trivial | Eliminación de `dangerouslySetInnerHTML` + CSP |

---

## 2. Taxonomía de artefactos

LOXAR mantiene 4 tipos de artefactos de documentación, cada uno con un propósito y formato definido.

### 2.1 Specs (feature/arquitectura)

**Propósito:** Definir QUÉ se va a construir, POR QUÉ, y con QUÉ CRITERIOS DE ACEPTACIÓN.  
**Ubicación:** `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`  
**Cuándo:** Antes de implementar cualquier feature/arquitectura significativa.  
**Contenido obligatorio:**

```markdown
# Design: <Topic> — LOXAR

**Fecha:** YYYY-MM-DD  
**Estado:** Diseño propuesto / Aprobado / Implementado  
**Rama:** <branch>  
**Autor:** <name>

---

## 1. Contexto y problema
## 2. Objetivo y no-objetivos
## 3. Arquitectura (diagrama ASCII si aplica)
## 4. Cambios en el modelo de datos (si aplica)
## 5. Diseño detallado (módulos, interfaces, contratos)
## 6. IA (potenciador) + offline-first (si aplica)
## 7. UI: superficies y flujos (si aplica)
## 8. Alcance y limitaciones (honesto)
## 9. Estrategia de pruebas
## 10. Fases de implementación (handoff)
## 11. Riesgos / preguntas abiertas
## 12. Criterios de aceptación
```

**Ejemplos existentes:**
- `docs/superpowers/specs/2026-07-14-grammar-engine-design.md` — motor de gramática
- `docs/superpowers/specs/2026-07-15-grammar-friendly-walkthrough.md` — walkthrough conlanger-friendly

### 2.2 ADRs (Architecture Decision Records)

**Propósito:** Documentar una decisión arquitectónica SIGNIFICATIVA con su contexto, opciones consideradas, y la opción elegida.  
**Ubicación:** `docs/superpowers/specs/ADR-NNN-<slug>.md`  
**Cuándo:** Cuando se tome una decisión arquitectónica que cumpla los criterios de [§1.4](#14-cuándo-escribir-un-adr).  
**Formato:**

```markdown
# ADR-NNN: <Título de la decisión>

**Fecha:** YYYY-MM-DD  
**Estado:** Aceptado / Reemplazado por ADR-MMM  
**Autores:** <name>

## Contexto
## Opciones consideradas
## Decisión
## Consecuencias
## ADRs relacionados
```

### 2.3 Plans (ejecución)

**Propósito:** Traducir un spec aprobado en pasos ejecutables con criterios de aceptación por fase.  
**Ubicación:** `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`  
**Cuándo:** Después de aprobar el spec, antes de implementar.  
**Contenido obligatorio:**

```markdown
# Plan: <Topic>

**Rama:** <branch>  
**Spec base:** <path al spec>  
**Autor:** <name>

## Objetivo
## Tareas
## Criterios de aceptación por fase
## Handoff / próximos pasos
```

**Ejemplos existentes:**
- `docs/superpowers/plans/2026-07-14-grammar-engine.md`
- `docs/superpowers/plans/2026-07-16-loxar-continuity-implementation-plan.md`

### 2.4 Checkpoints (continuidad)

**Propósito:** Registrar puntos de recuperación en `TASKS.md` después de cada cambio significativo.  
**Formato (en `TASKS.md`):**

```markdown
## [YYYY-MM-DD HH:MM] Checkpoint: <descripción>
- Archivos tocados: <lista de archivos>
- Acción: <qué se hizo>
- Estado UI: <estado actual>
- Próximo paso: <qué sigue>
```

---

## 3. SDD Workflow: checklist obligatoria

El flujo de trabajo SDD en LOXAR tiene 6 etapas obligatorias. No se puede saltar ninguna.

```
┌────────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌────────────┐   ┌───────────┐
│  1. SPEC   │ → │ 2. ADR   │ → │ 3. PLAN  │ → │ 4. IMPL.   │ → │ 5. VERIF.  │ → │ 6. COMMIT │
│  (qué/por  │   │ (si      │   │ (cómo    │   │ (código +  │   │ (build +   │   │ (con      │
│  qué)      │   │ aplica)  │   │ ejecutar)│   │ tests)     │   │ tests)     │   │ refer.)   │
└────────────┘   └──────────┘   └──────────┘   └────────────┘   └────────────┘   └───────────┘
```

### Etapa 1: SPEC

**Entrada:** Necesidad detectada (bug, feature, refactor, mejora UX)  
**Salida:** Documento `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` aprobado

**Checklist:**
- [ ] Contexto y problema descritos
- [ ] Objetivo y no-objetivos definidos
- [ ] Arquitectura/impacto evaluado
- [ ] Criterios de aceptación medibles definidos
- [ ] Fases de implementación definidas (si aplica)
- [ ] Riesgos/Preguntas abiertas documentadas
- [ ] Usuario/proxy revisa y aprueba el spec

### Etapa 2: ADR (si aplica)

**Entrada:** Spec aprobado que requiere decisión arquitectónica  
**Salida:** Documento `docs/superpowers/specs/ADR-NNN-<slug>.md` aceptado

**Checklist:**
- [ ] Contexto de la decisión documentado
- [ ] ≥2 opciones consideradas con trade-offs
- [ ] Decisión elegida justificada
- [ ] Consecuencias positivas y negativas listadas

### Etapa 3: PLAN

**Entrada:** Spec aprobado (y ADR si aplica)  
**Salida:** Documento `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` listo para ejecutar

**Checklist:**
- [ ] Tareas descompuestas en unidades atómicas
- [ ] Criterios de aceptación por fase/tarea
- [ ] Archivos a tocar identificados
- [ ] Archivos a NO tocar explícitos
- [ ] Orden de ejecución definido (dependencias)

### Etapa 4: IMPLEMENTACIÓN

**Entrada:** Plan aprobado  
**Salida:** Código + tests implementados

**Checklist:**
- [ ] Seguir el plan fase por fase
- [ ] Escribir código con los patrones existentes del proyecto
- [ ] Escribir tests unitarios para lógica pura
- [ ] No tocar archivos fuera del plan sin justificar
- [ ] Checkpoints en `TASKS.md` después de cada fase

### Etapa 5: VERIFICACIÓN

**Entrada:** Código implementado  
**Salida:** Cambios validados contra criterios de aceptación

**Checklist (LOXAR):**
- [ ] `npm run build` pasa
- [ ] `npm run lint` pasa
- [ ] `npm run typecheck` pasa (0 errores nuevos)
- [ ] Tests unitarios pasan (`npx tsx <test>` o runner configurado)
- [ ] Criterios de runtime validad por usuario (si aplica: `npm run tauri dev`)
- [ ] Ningún archivo editado tiene llaves/paréntesis/corchetes desbalanceados

### Etapa 6: COMMIT

**Entrada:** Verificación exitosa  
**Salida:** Commit con referencia a spec/plan/ADR

**Formato de commit:**
```
<type>(<scope>): <descripción>

Especificación: docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
Plan: docs/superpowers/plans/YYYY-MM-DD-<topic>.md
ADR: N/A o ADR-NNN-<slug>

Archivos tocados: <lista>
Criterios: build OK, typecheck OK, tests OK
```

---

## 4. Perfil arquitectónico del proyecto

### 4.1 Visión general

LOXAR es un **gestor de léxico para conlangers** (creadores de lenguas construidas) que funciona como aplicación de escritorio Tauri. Combina:

- **Lexicón**: gestión de entradas léxicas con significados, raíces, léxemas, categorías gramaticales
- **Gramática**: motor local determinista que produce formas de superficie (inflexión, derivación, sintaxis) desde un manifiesto editable
- **IA generativa**: potenciador opcional (Gemini / Ollama) para bootstrap de léxico y gramática, con degradación offline
- **Neografía**: diseño de glifos y compilación a fuentes TTF
- **Traducción**: playground con grounding local + LLM
- **Seguridad**: OS keyring para secretos, CSP estricta, sanitización de renders

### 4.2 Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React 18 + TypeScript 5.5 + Vite 5 | strict: true |
| Runtime | Tauri v2.x | Rust backend |
| IA | Gemini SDK (`@google/genai`) + Ollama (`localhost:11434`) | fallback |
| Persistencia | SQLite vía `tauri-plugin-sql` (primaria) + `localStorage` (fallback) | dual |
| Secretos | OS keyring (Windows Credential Manager / macOS Keychain / libsecret) | crate `keyring = "3"` |
| Validación | Zod v4 | passthrough + defaults |
| UI | Tailwind CSS 3.4 + íconos SVG propios | |Testing | `tsx` para smoke tests unitarios | vitest pendiente |

### 4.3 Mapa de módulos y límites

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI (React + Tailwind)                     │
│  App.tsx (orquestador global)                                    │
│  ├── LexiconTable.tsx (tabla filtrada)                           │
│  ├── EntryEditor.tsx (editor individual)                         │
│  ├── WorkbenchRightPanel.tsx (inspiración/cola)                  │
│  ├── GrammarTab.tsx (motor + canvas + AST)                       │
│  ├── TranslationPlayground.tsx (traductor)                       │
│  ├── WritingAndNeographyTab.tsx (neografía)                      │
│  ├── AiSettingsModal.tsx (config IA)                             │
│  ├── GrammarManagerModal.tsx (editor de manifiesto)              │
│  ├── GrammarWizard.tsx (asistente de gramática)                  │
│  ├── ASTEditor.tsx (editor visual del árbol)                     │
│  └── Modales + componentes compartidos                           │
├──────────────────────────────────────────────────────────────────┤
│  HOOKS (estado de dominio)                                      │
│  useLexicon.ts (estado global del léxico)                        │
│  useUndoRedo.ts (historial genérico)                             │
├──────────────────────────────────────────────────────────────────┤
│  SERVICIOS (lógica pura / dominio)                               │
│  src/services/                                                  │
│  ├── normalize.ts (normalización + Zod, fuente única)            │
│  ├── sqlStorage.ts (persistencia dual SQLite/localStorage)       │
│  ├── geminiService.ts (servicio de IA, keyring)                  │
│  ├── prompts.ts (prompt factories tipadas)                       │
│  ├── typologyProfile.ts (tipología → manifiesto)                 │
│  ├── parser.ts (imports txt/md/json)                             │
│  ├── inflectionService.ts (formas flexionadas)                   │
│  ├── audioService.ts (efectos de sonido UI)                      │
│  └── fontBuilderService.ts (compilación TTF neografía)           │
│  src/services/grammar/ (motor puro TS, sin React/Tauri)          │
│  ├── morphology.ts (realizeLexeme)                               │
│  ├── syntax.ts (realizeClause, AST)                              │
│  ├── phonology.ts (validación fonotáctica)                       │
│  ├── engineTypes.ts (tipos del motor)                            │
│  ├── ast-builder.ts (aplana participantes → AST)                 │
│  └── ast-view.ts (diagrama + helpers inmutables)                 │
│  src/services/phonology/                                         │
│  └── linter.ts (linter fonotáctico)                              │
├──────────────────────────────────────────────────────────────────┤
│  DATOS ESTÁTICOS (sin estado, código puro)                       │
│  src/data/                                                       │
│  ├── taxonomy.ts (diccionario taxonómico canónico 10 dominios)   │
│  ├── standardCategories.ts (shim compatibilidad)                 │
│  ├── languageProfiles.ts (5 perfiles tipológicos)                │
│  ├── markingStrategies.ts (15 estrategias + mapa motor)          │
│  └── wordLists.ts (listas con categorías horneadas)              │
├──────────────────────────────────────────────────────────────────┤
│  TIPOS CENTRALES (src/types.ts)                                  │
│  LexiconData, LexiconEntry, GrammarManifest, SyntaxCanvas, ...    │
├──────────────────────────────────────────────────────────────────┤
│  VALIDACIÓN RUNTIME (src/validation/)                            │
│  runtimeValidation.ts (fumada del motor al arranque)             │
├──────────────────────────────────────────────────────────────────┤
│  BACKEND TAURI (Rust)                                            │
│  src-tauri/src/lib.rs (keyring, migración SQLite)                │
│  src-tauri/tauri.conf.json (CSP, ventana)                        │
│  src-tauri/capabilities/default.json (permisos acotados)         │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Tabla de módulos: responsabilidad → archivo → dependencias

| Dominio | Responsabilidad | Archivo(s) clave | Dependencias |
|---------|----------------|------------------|-------------|
| **Lexicón** | CRUD de entradas léxicas, estado global | `useLexicon.ts`, `sqlStorage.ts`, `normalize.ts` | Zod, SQLite/localStorage |
| **Gramática** | Motor determinista (morfología, sintaxis, fonología), AST | `services/grammar/*.ts` | Tipos de `types.ts` |
| **IA** | Generación de léxico/gramática con Gemini/Ollama | `geminiService.ts`, `prompts.ts` | keyring, API externa |
| **Neografía** | Diseño de glifos, compilación TTF | `fontBuilderService.ts`, `components/neography/*` | `svg2ttf`, `LexiconData` |
| **Fonología** | Validación fonotáctica, linter | `phonology/linter.ts`, `grammar/phonology.ts` | `GenerativeProfile`, `GrammarManifest` |
| **Taxonomía** | Diccionario canónico de entidades (categorías, roles, etc.) | `data/taxonomy.ts` | Ninguna (código puro) |
| **Tipología** | Mapeo perfiles tipológicos → manifiesto de gramática | `typologyProfile.ts` | `GrammarManifest`, `languageProfiles.ts` |
| **Audio** | Efectos de sonido UI | `audioService.ts` | Web Audio API |
| **Validación** | Fumada runtime del motor | `runtimeValidation.ts` | Motor de gramática |

### 4.5 Contratos de comunicación entre capas

```
UI (React) 
  │  lee/escribe via props
  ▼
HOOKS (estado)
  │  invoca
  ▼
SERVICIOS (lógica pura)
  │  importa
  ▼
DATOS/TIPOS (sin estado)
```

**Reglas de acoplamiento:**
1. **Los servicios NO importan componentes React ni APIs Tauri.** El motor de gramática es 100% TS puro.
2. **Los componentes NO acceden a `sqlStorage` directamente.** Usan `useLexicon` como intermediario.
3. **Los tipos centrales (`types.ts`) son el lenguaje común.** Cambios ahí impactan todo el proyecto.
4. **Los servicios pueden importar de `data/` y `types/`.** Los datos estáticos son dependencia legítima.
5. **La IA es un servicio, no una dependencia del motor.** El motor funciona sin IA; IA solo bootstrap/inducción.

### 4.6 Flujos críticos

#### Flujo 1: Guardado de entrada

```
EntryEditor → lexiconHook.editWord → updateActiveLexicon → undoRedo.set → setState
  → App.handleSaveChanges → sqlStorage.saveLexicon → normalizeLexiconData
```

**Propiedad:** El hook `useLexicon` es el único que muta el estado del léxico. `App.tsx` orquesta la persistencia. `normalizeLexiconData` se aplica al LEER, no al escribir — write-through sin re-normalización innecesaria.

#### Flujo 2: Generación IA batch

```
App.handleGenerateBatch → generateBatchWords (geminiService) → promesa
  → encola en workQueue → WorkQueueBar avanza → EntryEditor edita → onQueueAdvance
```

**Propiedad:** La cola de trabajo (`workQueue`/`queueCursor`) vive en `App.tsx`. La generación es fire-and-forget con encolado.

#### Flujo 3: Motor offline

```
App.tsx mount → validateGrammarEngine() + isAiAvailable() → banner offline si !ai && !grammarOk
```

**Propiedad:** El motor local SIEMPRE funciona. IA es booster opcional. Si `!isAiAvailable()`, los botones de inducción se deshabilitan con tooltip explicativo.

#### Flujo 4: Categorización local-first

```
handleDetermineCategory (EntryEditor / App) → WORD_LISTS + resolveLexicalCategory (taxonomy)
  → si no coincide → llamada a Gemini (último recurso)
```

**Propiedad:** La taxonomía local (`taxonomy.ts`) es la primera línea de defensa. IA solo se llama cuando la categoría no se puede inferir localmente.

#### Flujo 5: Persistencia de API key

```
AiSettingsModal save → saveAiSettings → invoke('set_secret') (Rust keyring)
  → localStorage.setItem('conlang_ai_settings') (sin key)
```

**Propiedad:** La API key NUNCA sale del keyring del sistema operativo. Nunca se hornea en el bundle, nunca se guarda en localStorage.

---

## 5. ADRs existentes (retrospectivas)

Los siguientes ADRs se extraen de las decisiones arquitectónicas ya implementadas en el proyecto. Sirven como referencia histórica y como plantilla para ADRs futuros.

---

### ADR-001: Motor de gramática puro TypeScript (sin Rust)

**Fecha:** 2026-07-14  
**Estado:** Aceptado, implementado, commits `5a850b2` → `8a59563`

**Contexto:** La gramática original era una "wiki de captura" sin motor ejecutable. Necesitábamos un sistema que produjera formas de superficie reales (inflexión, derivación, sintaxis) desde un manifiesto editable.

**Opciones consideradas:**
1. Motor puro Rust (backend Tauri) — más rendimiento, pero mayor fricción de desarrollo (compilar Rust por cada cambio), y la lógica morfológica es pura y no necesita sistema de archivos.
2. Motor puro TypeScript (frontend) — desarrollo rápido, testeable directamente con `tsx`, reutilizable por todos los módulos frontend.
3. WebAssembly (GF/foma/hfst) — sobre-ingeniería para el alcance actual.

**Decisión:** Motor puro TypeScript en `src/services/grammar/`. Sin dependencias de React ni Tauri. Testeable con `npx tsx`. Reutilizable por Neography, Traductor, y Preview de Gramática.

**Consecuencias:**
- ✅ Desarrollo rápido, iteraciones en minutos
- ✅ Tests unitarios directos sin framework especializado
- ✅ Reutilización por múltiples módulos frontend
- ⚠️ Rendimiento en léxicos muy grandes no medido (pero O(ranuras) por lexema es despreciable)
- ⚠️ Migrar a Rust después sería posible serializando `GrammarManifest` (no bloqueado)

---

### ADR-002: Zod v4 como normalizador + esquema tolerante

**Fecha:** 2026-07-14  
**Estado:** Aceptado, implementado, commit `7f3b3ec`

**Contexto:** El incidente `2969057` reveló que la normalización de datos divergía entre rutas `localStorage` y SQLite. `sqlStorage.hydrate` asignaba datos tal cual, mientras que `useLexicon.getInitialState` aplicaba `normalizeLexiconData`. Si abrías un léxico viejo por SQLite, podía perder campos.

**Opciones consideradas:**
1. Zod estricto (rechaza datos legacy) — seguro pero rompe léxicos existentes.
2. Zod passthrough + defaults — tolerante, rellena campos faltantes, acepta campos extra (no los elimina).
3. Sin Zod, normalización manual — funciona pero sin validación tipada.

**Decisión:** Zod v4 con `.passthrough().default(...)` — tolerante. `normalizeLexiconData` aplica defaults por sección; `z.looseObject` en el esquema superior preserva claves top-level extra (comportamiento idéntico al normalizador legacy).

**Consecuencias:**
- ✅ Fin de la divergencia localStorage vs SQLite (incidente 2969057 cerrado)
- ✅ Esquema tolerante que no rompe datos legacy
- ✅ Tipado fuerte con validación en runtime
- ⚠️ No valida tipos internos de campos numéricos (diseñado para no rechazar legacy)

---

### ADR-003: OS keyring para API key (no localStorage ni bundle)

**Fecha:** 2026-07-14  
**Estado:** Aceptado, implementado, commit `7f3b3ec`

**Contexto:** La API key de Gemini estaba expuesta en `localStorage.conlang_ai_settings` como texto plano. Cualquier script XSS o exfiltración de localStorage la robaba. Además, `import.meta.env.VITE_GEMINI_API_KEY` la horneaba en el bundle.

**Opciones consideradas:**
1. Seguir en localStorage — pero con ofuscación. No es seguridad real.
2. Plugin Tauri `@tauri-apps/plugin-keyring` — no estaba publicado en npm en el momento.
3. Comando Rust propio con crate `keyring = "3"` — usa Credential Manager (Windows), Keychain (macOS), libsecret (Linux).

**Decisión:** Implementar comandos Rust `get_secret`/`set_secret`/`delete_secret` con crate `keyring = "3"`. La API key solo vive en el keyring del sistema. Los settings no secretos (provider, modelo, URLs) permanecen en localStorage.

**Consecuencias:**
- ✅ API key fuera del bundle y del localStorage
- ✅ Usa gestor de credenciales nativo del sistema
- ✅ Migración única desde localStorage a keyring implementada
- ⚠️ Depende de compilación Rust (`cargo build`) — requiere toolchain instalada
- ⚠️ El frontend mantiene la key en memoria del renderer (necesario para llamar al SDK)

---

### ADR-004: CSP estricta + RenderTemplate seguro (sin dangerouslySetInnerHTML)

**Fecha:** 2026-07-14  
**Estado:** Aceptado, implementado, checkpoint 2026-07-14

**Contexto:** La app usaba `dangerouslySetInnerHTML` en plantillas de reglas de gramática (inflexión) y `@font-face` escrito con `innerHTML` en Neography. Cualquier contenido malicioso en una regla podía romper el contexto del webview.

**Opciones consideradas:**
1. Sanitizar HTML con `dompurify` — agrega dependency, sigue permitiendo HTML.
2. Eliminar HTML crudo completamente — requiere reescribir componentes que usaban `dangerouslySetInnerHTML`.
3. CSP restrictiva + render seguro (nodos React como texto/span) — más trabajo upfront pero elimina la clase de ataque.

**Decisión:** CSP estricta (`default-src 'self'`, fuentes/estilos/imágenes controladas) + eliminar `dangerouslySetInnerHTML` (reemplazado por `<RenderTemplate>` que divide el token `[RAÍZ]` en nodos React) + eliminar `innerHTML` (reemplazado por `styleRef.textContent`).

**Consecuencias:**
- ✅ Cierra vector XSS en plantillas de gramática
- ✅ Cierra vector XSS en `@font-face` de Neography
- ✅ CSP restringe canales de exfiltración de la API key
- ⚠️ `style-src 'unsafe-inline'` se mantiene por React HMR en dev; `script-src` mantiene `'unsafe-inline'` para no romper `tauri dev`
- ⚠️ Próximo paso recomendado: nonces para eliminar `'unsafe-inline'` de `script-src`

---

### ADR-005: Persistencia dual SQLite/localStorage con ruta Tauri primaria

**Fecha:** 2026-07-09  
**Estado:** Aceptado, implementado, commit `fc80b78`

**Contexto:** LOXAR debe funcionar como app Tauri (primaria) y como app web en browser (fallback). Necesitábamos una capa de persistencia transparente que el código consumiera sin saber si corría en Tauri o en browser.

**Opciones consideradas:**
1. Solo SQLite (Tauri) — no funciona en browser.
2. Solo localStorage — no funciona en Tauri (aunque técnicamente podría, pero no es first-class).
3. Capa dual transparente (`sqlStorage.ts`) — misma API, ruta automática según entorno.

**Decisión:** `sqlStorage.ts` detecta entorno (`isTauri()`): Tauri → `tauri-plugin-sql` sobre `sqlite:loxar.db`; browser → `localStorage` con prefijo `conlang_lexicon_manager_`. Ambos aplican `normalizeLexiconData`. Tabla SQLite: `lexicons(name TEXT PK, data TEXT)`.

**Consecuencias:**
- ✅ Misma API para frontend sin importar entorno
- ✅ `normalizeLexiconData` aplicado en AMBAS rutas (cierra schema drift)
- ⚠️ SQLite serializa `LexiconData` completa como JSON en columna `data` — no es relacional óptimo, pero funciona para el alcance actual
- ⚠️ `localStorage` es fallback con límite de ~5MB — suficiente para léxicos normales, no para corpus masivos

---

### ADR-006: AST jerárquico vs lista plana para SyntaxCanvas

**Fecha:** 2026-07-18  
**Estado:** Aceptado, implementado, commits `5a850b2` → `8a59563`

**Contexto:** El SyntaxCanvas original usaba una lista plana de nodos S/V/O con conexiones manuales. Esto no modelaba lenguas con partículas independientes, auxiliares verbales, modificadores anidados, o cadenas verbales correctamente.

**Opciones consideradas:**
1. Lista plana con tipos adicionales — simple pero limitada.
2. AST jerárquico con dependientes — modela cualquier estructura sintáctica, el motor `realizeClause` recorre el árbol.
3. Grafo dirigido acíclico completo — sobre-ingeniería para el alcance actual.

**Decisión:** AST jerárquico (`ClauseAST` con `root: VerbNode`, `dependents[]` en cada nodo). `realizeClause` acepta tanto `ClauseAST` como el legacy `ClauseFeatures` plano (fallback reversible). Helper `buildClauseAST` aplana participantes a árbol.

**Consecuencias:**
- ✅ Modela lenguas con partículas, auxiliares, modificadores, cadenas verbales
- ✅ Fallback reversible al path plano legacy
- ✅ Editor visual AST (`ASTEditor.tsx`) con arrastre/zoom/pan/acciones por nodo
- ⚠️ El AST editable es estado local de `GrammarTab` — no se persiste en el manifiesto aún

---

### ADR-007: Taxonomía canónica sin acentos + aliases

**Fecha:** 2026-07-20  
**Estado:** Aceptado, implementado, commit `7f3b3ec`

**Contexto:** El proyecto tenía definiciones distintas para las mismas entidades across módulos: `Categoría`/`Función`/`category`/`categoria`; `GrammaticalRole`/`SyntacticRole`/`role`; `prefijo`/`prefix`. Esto causaba bugs de normalización y divergencia de catálogos.

**Opciones consideradas:**
1. Usar español con acentos en todas las keys canónicas — pero los archivos de código usan keys como nombres de variables/props, donde los acentos son inválidos.
2. Usar inglés en todas las keys canónicas — funciona técnicamente pero el proyecto es hispanohablante.
3. Keys canónicas SIN ACENTOS, aliases multilingües, display labels en español — combina viabilidad técnica con UX hispanohablante.

**Decisión:** `taxonomy.ts` como diccionario canónico: 10 dominios taxonómicos, keys sin acentos/snake_case, aliases con tilde/inglés/shorthand, display labels en español. `resolveLexicalCategory()` normaliza cualquier variante de entrada.

**Consecuencias:**
- ✅ Bug B1 cerrado: `desconocido` → `desconocida`, `n/a`/`?` → `desconocida`
- ✅ 171 tests unitarios (taxonomy.test.ts)
- ✅ Jerarquía de categorías (`getAncestors`, `getDescendants`, `isSubcategory`)
- ⚠️ Cambio de naming: `DEFAULT_CATEGORIES` reemplaza `DEFAULT_FUNCTIONS` (shim de compatibilidad en `normalize.ts`)

---

### ADR-008: Motor puro TypeScript vs Rust para gramática

**Fecha:** 2026-07-14  
**Estado:** Aceptado

**Contexto:** Al diseñar el motor de gramática, se evaluó si implementarlo como comando Rust en Tauri (backend nativo) o como módulo TypeScript puro (frontend).

**Opciones consideradas:**
1. Motor Rust (comando Tauri) — performance máxima, acceso a archivos/cráneos, pero requiere serialización `GrammarManifest` → JSON por cada llamada, y compilar Rust por cada cambio.
2. Motor TS puro — desarrollo rápido, testeable con `npx tsx`, cero serialización, reutilizable por Neography/Traductor sin invocar Tauri.
3. Hibrido (TS para desarrollo, Rust para producción) — complejidad innecesaria para el alcance actual.

**Decisión:** Motor TS puro. Ver ADR-001 para consecuencias detalladas.

**Relacionado:** ADR-001, ADR-005 (persistencia dual)

---

### ADR-009: Pipeline de gramática con parser local + DeclarativeManifest + taxonomy resolver

**Fecha:** 2026-08-01  
**Estado:** Aceptado, implementado

**Contexto:** El importador de gramática era 100% dependiente de LLM (`parseGrammarAdvanced` en `geminiService.ts`). Si Gemini fallaba o devolvía JSON malformado, el usuario no podía importar gramáticas. Además, `cleanseJson` hacía una segunda llamada a IA como fallback, duplicando el punto de fallo. Las estrategias de marcaje (`MorphosyntacticStrategy`) eran metadata descriptiva editable en UI pero nunca se consumían por el motor (`realizeLexeme`). La normalización usaba Zod laxo (`z.array(z.any())`) que aceptaba cualquier basura del LLM.

**Opciones consideradas:**
1. Mejorar el prompt de Gemini + retry — sigue dependiendo de API externa, no resuelve offline.
2. Parser local determinista como PRIMARY, LLM como OPTIONAL booster — funciona offline, fallback predecible, LLM solo mejora.
3. Solo parser local sin LLM — funciona offline pero pierde capacidad de inferencia para gramáticas complejas no estructuradas.

**Decisión:** Pipeline de 3 capas: Texto → Parser local (determinista) → Normalizer (taxonomy resolver) → Validador post-import → LLM booster opcional → `DeclarativeManifest`. `DeclarativeManifest` como formato intermedio entre parser/LLM y motor. `convertToLegacy` bridge para backward compatibility con UI. `taxonomy.ts` (ADR-007) como entity resolver: variantes como "sustantivo", "noun", "sostantivo", "nomen" mapean al mismo canonical key.

**Consecuencias:**
- ✅ Importador funciona 100% offline (parser local)
- ✅ LLM es booster opcional, no crítico
- ✅ `cleanseJson` eliminado como fallback (no segunda llamada a IA)
- ✅ Normalización de aliases via taxonomy (variantes → canonical)
- ✅ Validador post-import siempre muestra score + problemas + sugerencias
- ✅ Estrategias ahora se cablean al motor via `strategyBridge.ts`
- ⚠️ Parser local tiene limitaciones vs LLM para texto muy libre/npestructurado
- ⚠️ `DeclarativeManifest` agrega capa intermedia que debe mantenerse sincronizada con `GrammarManifest`

**Relacionado:** ADR-001 (motor TS puro), ADR-007 (taxonomía canónica), ADR-006 (AST jerárquico)

---

## 6. Decisiones pendientes (backlog de ADRs)

Las siguientes decisiones arquitectónicas están documentadas pero no resueltas. Cada una puede convertirse en un ADR formal cuando se tome la decisión.

| # | Decisión | Opciones | Prioridad | Estado |
|---|----------|----------|-----------|--------|
| **P1** | `sessionCache.ts` → ¿conectar a `App.tsx`? | Conectar (unifica fuente de verdad) / Mantener localStorage como puente | Media | Documentada en TASKS.md |
| **P2** | ¿Persistir AST editable en manifiesto? | Persistir en `manifest.syntaxCanvas` / Estado local solo / Campo `savedClauseAST` dedicado | Baja | Documentada en TASKS.md |
| **P3** | ¿Limpiar errores tsc Neography*? | Limpiar (8 errores en NeographyModal + NeographyImageTracer) / Mantener (no bloquean build) | Baja | Backlog tsc |
| **P4** | ¿Exponer `typologicalProfile` en UI? | Pestaña de solo lectura / Campo en GrammarTab / No exponer (capa guía interna) | Baja | Pendiente |

**Criterio para resolver:** Escribir spec breve (1-2 páginas) antes de implementar cualquiera de estas decisiones.

---

## 7. Cumplimiento y auditoría

### 7.1 Cómo verificar que un cambio es SDD-compliant

1. **¿Hay un spec/plan/ADR asociado?** Si el cambio no se alinea a ningún spec, preguntar si debería tener uno (usar los umbrales de [§1.3](#13-cuándo-escribir-un-spec-umbrales)).
2. **¿El commit message referencia el spec/plan?** Buscar `docs/superpowers/specs/` y `docs/superpowers/plans/` en el mensaje.
3. **¿TASK.md tiene checkpoint?** Buscar `## [YYYY-MM-DD] Checkpoint:` en `TASKS.md`.
4. **¿La verificación pasó?** Correr localmente: `npm run build && npm run lint && npm run typecheck`.

### 7.2 Checklist de pre-commit (actualización del PROTOCOL.md)

Agregar al final de `docs/continuity/PROTOCOL.md`:

```markdown
## 📋 SDD Compliance Checklist (antes de cada commit)

- [ ] Todo cambio significativo tiene un spec/plan/ADR asociado en `docs/superpowers/`.
- [ ] El commit message referencia el spec y plan aplicables.
- [ ] `TASKS.md` tiene un checkpoint que describe el trabajo realizado.
- [ ] `SESSION_CACHE.json` refleja el estado actual de la UI (si aplica).
- [ ] `npm run build` pasa sin errores.
- [ ] `npm run lint` pasa sin warnings de escapes ilegales.
- [ ] `npm run typecheck` pasa sin errores nuevos.
- [ ] Tests unitarios pasan (si hay tests para el área tocada).
- [ ] Ningún archivo editado tiene llaves `{}`, paréntesis `()` o corchetes `[]` desbalanceados.
- [ ] No se tocaron archivos fuera del plan sin justificar en el checkpoint.
```

---

## 8. Apéndice: SDD y el video de referencia

### 8.1 Fuente

El usuario solicitó alinear LOXAR con las directrices del video:
**Spec-Driven Development: The Key to Building Software That Lasts**
URL: `https://www.youtube.com/watch?v=rZjEoes9HE4`

### 8.2 Acceso al contenido

El contenido del video no fue accesible directamente (el sitio devuelve solo navegación). La investigación realizada incluyó:
- Fetches directos a la URL del video (sin transcript disponible)
- Web search (no disponible en el entorno actual)

### 8.3 SDD aplicado a LOXAR

Este documento aplica los principios fundamentales de Spec-Driven Development reconocidos en la industria, adaptados al contexto específico de LOXAR:

| Principio SDD general | Adaptación LOXAR |
|----------------------|------------------|
| Specs como fuente de verdad | `docs/superpowers/specs/` — aprobados antes de implementar |
| ADRs para decisiones arquitectónicas | `docs/superpowers/specs/ADR-*.md` |
| Trazabilidad código↔spec | Commit messages + checkpoints en `TASKS.md` |
| Acceptance criteria ejecutables | Build, lint, typecheck, tests, runtime validation |
| Separación de preocupaciones | Specs (qué/por qué), Plans (cómo ejecutar), Código (materialización) |
| Iteración por fases | Fases en specs con handoffs y criterios de aceptación |
| Reducir "vibe coding" | Umbrales que fuerzan spec antes de código |

**Nota:** Si el usuario puede acceder a una transcripción o resumen del video, este documento puede refinarse para alinear más específicamente con las directrices exactas del autor.

---

## 9. Historial de cambios

| Fecha | Versión | Cambio | Autor |
|-------|---------|--------|-------|
| 2026-07-30 | 1.0 | Documento SDD inicial adaptado a arquitectura LOXAR + ADRs retrospectivos | ZCode/Victor Sidhe |
| 2026-08-01 | 1.1 | ADR-009: Pipeline de gramática con parser local + DeclarativeManifest + taxonomy resolver | ZCode/Victor Sidhe |

---

**Fin del documento SDD v1.0**

Este documento es la capa de verdad entre los requerimientos y el código. Todo cambio significativo en LOXAR debe alinearse a estas directrices antes de implementar.
