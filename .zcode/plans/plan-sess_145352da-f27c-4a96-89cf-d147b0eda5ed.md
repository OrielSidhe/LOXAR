# Plan: Gramática — UX asistente + claridad Estrategias/Roles (Fase 1) y Perfil Tipológico YAML como guía de extracción (Fase 2)

## Contexto y decisiones del usuario
- **Ventana asistente:** modal normal (centrado, cierre por clic fuera) **+** botón para desacoplar a ventana libre movible/redimensionable.
- **YAML = base/ontología, NO input del usuario:** el YAML define el vocabulario controlado y la información mínima que la app debe poder EXTRAER de **cualquier** file que el usuario importe (excel/md/doc/txt). No hay botón "pegar YAML". El importador existente (`GrammarImporterModal` → `parseGrammarAdvanced`) es quien usa el YAML como guía de extracción.
- **Alcance guardado en LOXAR:** Solo motor + escritura (fonología, morfología, sintaxis, nominal, verbal, nexos/modificadores + sistema de escritura). Pragmática y léxico se descartan.
- **Roles:** catálogo típico (`syntactic_role_catalog`) **+ `customRoles` abierto** (el prompt de IA y el usuario añaden los que aparezcan, ej. Quavanol).
- **Estrategias:** se unifican con `marking_strategy_legend` del YAML (15) ↔ `StrategyType` actual (7). El legend es superconjunto; se mapea a los 7 del motor y se conservan los extra.

---

## FASE 1 — UX inmediata (ejecutable ya; no depende del YAML nuevo)

### 1A. Ventana modal + libre movible — `FloatingModal` (NUEVO `src/components/FloatingModal.tsx`)
- Render vía `createPortal(document.body)` → rompe el contexto de apilamiento `z-0` de `<main>` (App.tsx:852) → nunca queda "atrás".
- Props: `open`, `title`, `onClose`, `headerRight?` (slot botón desacoplar), `children`, `defaultMode?: 'modal'|'free'`, `width?/height?`.
- **Modo modal:** overlay `fixed inset-0 bg-black/70 z-[60]` + panel centrado + cierre al clic en scrim + `Esc`.
- **Modo libre:** estado `x/y/w/h` + `dragging`; arrastre desde cabecera (`onPointerDown`+listeners documento), redimensionado esquina inferior-derecha. Sin librerías.
- Botón "desacoplar/acoplar" en cabecera alterna modo. Reutilizable por otros modales después.
- **CAMBIO** `src/components/GrammarWizard.tsx`: reemplaza `<div fixed inset-0 z-50>` (líneas 62-67, 273) por `<FloatingModal open={open} title="Asistente de gramática" onClose={onClose} headerRight={botónDesacoplar}>`. Conserva los 3 pasos y `onApply`/`onClose`.

### 1B. Claridad en Estrategias y Roles — `GrammarTab.tsx`
- **CAMBIO** `src/components/MultiSelectDropdown.tsx`: extender `options` a `string[] | { value: string; label: string }[]` (normaliza internamente); `selected` sigue `string[]` de values. No rompe usos actuales (categorías).
- **CAMBIO** `src/components/GrammarTab.tsx` → `renderStrategies()`:
  - **Tipo de estrategia (líneas 654-669):** `InfoHint` en la etiqueta "Tipo" con `STRATEGY_TYPE_HELP` (texto plano de los 7 tipos) + mantener `<select>` con las 7 opciones (cada una clara al hover).
  - **"Aplica a Roles" (líneas 671-682):** reemplazar `<select multiple>` nativo por `MultiSelectDropdown` con `options={roles.map(r => ({ value: r.id, label: r.name }))}`, `selected={strategy.appliesTo}`. `InfoHint`: "Elige qué roles afecta; vacío = ninguno (no 'todos'). Igual que categorías."
  - "Aplica a Categorías" ya usa `MultiSelectDropdown`; sin cambios.
- **CAMBIO** `src/components/GrammarManagerModal.tsx` (líneas ~328-352): mismo `MultiSelectDropdown` por-ID para roles, por consistencia.
- **InfoHint.tsx:** sin cambios. Añadir `InfoHint` en `renderStrategies` explicando el vínculo con el canvas (Árbol AST colorea por rol vía `ROLE_COLORS` ASTEditor.tsx:38-46; Canvas Sintáctico muestra rol+color). Hoy estrategias son descriptivas (el motor usa `paradigms`/`typology.wordOrder`); se conecta en Fase 2.
- **NUEVO** `src/data/markingStrategies.ts`: `MARKING_STRATEGY_LEGEND` (15 del YAML con descripción) — reutilizable en Fase 1 (InfoHints) y Fase 2 (prompt). Centraliza el vocabulario.

---

## FASE 2 — YAML como guía de extracción (NO como input)
El usuario trae CUALQUIER file; el YAML define qué extraer.

### 2A. Tipos — `src/types.ts`
- `MarkingStrategy` = unión de las 15 del legend (extiende `StrategyType`).
- `TypologicalProfile` (secciones motor+escritura): `meta`, `morphology`, `syntax`, `nominal`, `verbal`, `modifiers`, `writing`. Campos con `active?/mandatory?` donde aplique y `inventory: string[]` (ABIERTO: conserva los 20+ casos de Quavanol, roles custom, etc.). `syntacticRoles: { catalog: string[]; custom: string[] }`.
- `GrammarManifest` gana `typologicalProfile?: TypologicalProfile` (opcional, no rompe lo existente).

### 2B. Servicio — `src/services/typologyProfile.ts`
- Re-exporta/usa `MARKING_STRATEGY_LEGEND`.
- `typologyToManifest(profile): Partial<GrammarManifest>` — mapea:
  - `syntax.basic_word_order`→`typology.wordOrder`; `alignment`→`typology.alignment`; `morphology`→`typology.morphology`; `headDirection`→`typology.headDirection`.
  - `nominal.case_system.inventory` + `number_system` → `paradigms` (CategoryParadigm 'sustantivo' con `InflectionSlot[]` por rasgo caso/número).
  - `verbal.tense/aspect/mood` → `paradigms` ('verbo') con slots.
  - estrategias del legend → `strategies: MorphosyntacticStrategy[]`.
  - `syntacticRoles` (catalog+custom) → `roles: SyntacticRole[]`.
  - `writing` → se guarda en `typologicalProfile` (LOXAR ya tiene Neography; no tiene motor hoy).
- `manifestToTypology` opcional para exportar.

### 2C. Integrar el YAML como GUÍA en el importador existente (no botón nuevo)
- **CAMBIO** `src/services/geminiService.ts` → `parseGrammarAdvanced`: el prompt del sistema se enriquece con la estructura de `TypologicalProfile` + `marking_strategy_legend` como **guía de extracción mínima** (qué campos buscar en CUALQUIER documento, con vocabulario controlado y permitiendo valores abiertos/custom). Conserva el formato `FlexibleGrammar` actual.
- **CAMBIO** `src/types/grammar-flexible.ts` (`FlexibleGrammar`) + `src/components/GrammarTab.tsx` `handleSaveFlexibleGrammar` (líneas 183-212): ampliar el mapeo para que los campos del perfil (casos abiertos, roles catalog+custom, estrategias del legend, escritura) se conserven al prellenar el manifiesto. El usuario sigue trayendo su .txt/.md/.doc; la app extrae el perfil según la guía.

### 2D. Plantilla de prompt — `docs/typology-profile-prompt.md`
- Guardar el prompt sugerido del usuario, adaptado: indica a la IA usar `marking_strategy_legend` como vocabulario controlado y listar casos/roles/estrategias **nuevos** como abiertos (no force el template). Referencia las secciones motor+escritura. Es documentación de referencia, no un botón.

### 2E. Normalizar vocabulario (limpieza previa)
- Arreglar discrepancia inglés/español en `renderTypology` (GrammarTab.tsx:559-562) vs perfiles (`languageProfiles.ts`): unificar valores a enum compartido para que `buildGrammarManifest` importe sin fallback "Seleccionar...".

---

## Archivos a tocar
**Fase 1:** NUEVO `FloatingModal.tsx`; NUEVO `src/data/markingStrategies.ts`; `GrammarWizard.tsx`; `MultiSelectDropdown.tsx`; `GrammarTab.tsx`; `GrammarManagerModal.tsx`.
**Fase 2:** `src/types.ts`; NUEVO `src/services/typologyProfile.ts`; `src/services/geminiService.ts` (prompt guía); `src/types/grammar-flexible.ts`; `src/components/GrammarTab.tsx` (mapeo saveFlexible); NUEVO `docs/typology-profile-prompt.md`; `languageProfiles.ts` (vocabulario).

## Documentación de continuidad (al cerrar cada fase)
- Actualizar `docs/continuity/TASKS.md`: nuevos checkpoints (Fase 1 y Fase 2), tareas `[x]`, próximo paso.
- Actualizar `docs/continuity/SESSION_CACHE.json`: `uiState.activeTab:'grammar'`, `syntaxSubTab`, y `aiContext.lastPrompt` con el resumen del trabajo.
- `npm run lint` + `npm run typecheck` + `npm run build` antes de cada cierre; commit en `feature/sql-migration-clean`.

## Verificación
- Fase 1: typecheck (0 nuevos; 8 Neography* fuera de alcance), build, lint OK. Smoke (`tauri dev`): asistente siempre arriba, cierra al clic fuera, se desacopla/arrastra/redimensiona; Tipo con tooltip; "Aplica a Roles" = dropdown checkboxes por rol.
- Fase 2: tests tsx `typologyProfile.ts` (mapeo perfil→manifiesto; caso abierto 20+ conservado; roles catalog+custom). typecheck/build/lint OK.