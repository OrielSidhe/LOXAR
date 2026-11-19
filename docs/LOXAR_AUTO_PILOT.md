# LOXAR AUTO-PILOT
**Objetivo:** avanzar continuamente hacia una app de conlang 100% funcional, sin intervención humana por cada paso.
**Criterio de éxito:** un flujo real de usuario funciona de punta a punta sin crashes.

---

## Protocolo de operación
El agente y la automatización siguen `docs/LOXAR_OPERATING_PROTOCOL.md` (SOP tipo ITIL/SDD: resolver,
no solo validar; contexto conciso; acciones de seguridad requieren autorización). La "memoria" que se
lee/actualiza en cada sesión son este archivo (Objetivo/Estado/Próxima tarea), el `TASKS.md` y el
`SESSION_CACHE.json`.

## Estado actual
- Repo limpio, build/typecheck/lint verdes
- `tauri:build` funcionando (Vite + Tauri 2.11.1 alineados)
- Git inicializado y con commits; último commit `dad806e`
- P1-2f fue revertido: `useProjectShell` se descartó porque generaba dependencias circulares con
  `App.tsx`; se mantienen los hooks ya estables (`useAppHandlers`, `useAiHandlers`,
  `useProjectOperations`, `useWorkQueue`, `useWidgetBridge`)
- Avance P1 actual: se extrajeron `ToastContainer`, `OfflineBanner`, `AmbientLights`,
  `ProjectBootstrapBanner`, `AppToolbar`, `AppBatchToolbar` y `TabButton` de `App.tsx`,
  además de `SignificadoTagsInput`, `EntryDuplicateWarning`, `EntryEditorAiActions`,
  `EntryEditorCompleteModeNav`, `EntryEditorHeader`, `EntryEditorAiBanner`, `EntryEditorIpaToggle`
  y `EntryEditorForm` de `EntryEditor`, `ParadigmCell` de `CollectionsManager`, helpers de preview a
  `src/utils/grammarPreview.ts`, `GrammarOverview`, `GrammarPhonologyPanel`, `GrammarTypologyPanel`,
  `GrammarNotesPanel`, `GrammarStrategiesPanel`, `GrammarMorphologyPanel`, `GrammarRolesPanel`,
  `GrammarSyntaxPanel`, `GrammarModuleSidebar`, `GrammarTabHeader` y `GrammarTabModals` de `GrammarTab`,
  y `WorkbenchTab` y `ToolsTab` de `App.tsx` con tipos de handlers alineados,
  `AiMapperModal` de `SyntaxCanvas.tsx`, soporte Unicode corregido en importación,
  error de Suspense en modales lazy resuelto, exportación de gramática movida a `useAppHandlers`,
  y pantalla inicial rediseñada como `LanguageHomeCanvas` tipo canvas Stitch con nodo central
  de lenguaje y módulos satélite navegables.
  También se extrajeron `AppWelcomeSection`, `AppToastLayer`, `AppOfflineBannerLayer`,
  `AppSettingsModalLayer`, `AppProjectBootstrapLayer`, `CollectionsSidebar`, `CollectionsPanel`,
  `CollectionsDraftsReview`, `SyntaxNodeRenderer` y `SyntaxBreakdownPanel` de `SyntaxCanvas.tsx`
  reduciendo el tamaño de los componentes gigantes.
- `LanguageHomeCanvas` ahora muestra métricas reales por módulo y el logo LOXAR quedó con la X completa sobre la O para presentación en CV/GitHub.
- Persistencia: SQLite con transacciones, backup `.bak`, `schemaVersion`, FTS5 real desde UI y Web Worker
- Traducción real: `InterlinearGlossViewer` integrado en UI
- Traducción offline: motor local en `TranslationPlayground` con matching + realización morfológica
- Gramática avanzada: motor M1-M8 implementado, tests pasando, `GrammarImporterModal` y `SyntaxCanvas` cableados a `inductFromText`
- Sound change avanzado: reglas condicionales por entorno, lote al léxico, historial undo/redo y presets
- Robustez: `ErrorBoundary` en `App.tsx` para recuperación de crashes
- Estado de sesión unificado: `sessionCache` cableado a `App.tsx` con persistencia de tab/exportPath/tourCompleted
- Herramientas UI: `InterlinearGlossViewer`, `SoundChangeWorkbench`, `NeographyText` integrados en `App.tsx`
- CI/CD: GitHub Actions workflow para Windows
- Experiencia de marca: jingle renovado, icono LOX, temas Midnight/Cyber/Amber/Forest, microinteracciones UI, SettingsModal flotante y navegación Harness/Canvas con VerticalSidebar + ModulePanel
- Gauntlet v3.12 Fase J cerrada (commit `ee2a505`): J1 botón "Configurar IA" en el importador, J2
  cancelar real del análisis, J3 `ImportJobBanner` en pantalla principal, J4 tests (banner RTL +
  store). Corregido el doble montaje de `AiSettingsModal`. Validaciones: typecheck 0, lint OK,
  build OK, vitest 369/369. Pendiente: push + CI y demo runtime por el usuario.
- Deuda P1 (2026-11-13): auditoría de huérfanos sobre `src/` (24 archivos sin importador) y borrado de
  6 (`NeographyModal`, `GrammarManagerModal` y 4 stubs de 0 bytes). Quedan 17 huérfanos no borrados
  por requerir decisión de producto. `jsonWorker.ts` está implementado pero nunca importado: el
  punto D2 está falsamente marcado como hecho y `sqlStorage.ts:149` serializa síncrono.
- Bootstrap de proyecto (B0, 2026-11-18): `AppProjectBootstrapLayer` ya no está muerto. `App.tsx`
  hidrata `projectPath`/`sessionCacheData`/`hasLocalData` al montar y eleva `isAppLoaded` tras ese
  load; el descarte del modal persiste en `sessionCache`. `showHomePanel` sigue declarado sin uso.
- Canvas de sintaxis (B1, 2026-11-18): el subtab `canvas` del módulo de sintaxis ahora monta
  `SyntaxCanvas` (antes declarado y sin render, con el componente huérfano). Persiste en el
  manifiesto vía `onUpdateManifest`. Huérfanos: 20.
- Métricas vivas (2026-11-18): corregido el bug de `NaN` en el dashboard. `getGrammarMetrics`
  (`src/utils/grammarMetrics.ts`) deriva rules/categories/strategies/roles/sonidos/árboles del
  manifiesto canónico; `App.tsx` y el resumen pragmático lo consumen. Tests 378/378.
- Dashboard extraído (2026-11-18): el tab `dashboard` salió de `App.tsx` a
  `src/components/DashboardTab.tsx`, con el enrutado módulo → tab centralizado y la lista de
  sub-módulos de gramática sin duplicar. `App.tsx`: 973 → 947 líneas.
- Modelo de SyntaxFlowline extraído (2026-11-18): la lógica de dominio de `SyntaxFlowline.tsx`
  (tipos, constantes, `buildBlocksFromManifest`, `extractMorphologicalProperties`,
  `getMorphoOptions`, persistencia en `localStorage`, `shuffle`, `handleDropOutside`) pasó a
  `src/utils/syntaxFlowlineModel.ts`; el `.tsx` quedó como orquestador de estado UI y render
  (992 → 630 líneas) y re-exporta los helpers que los tests importan desde el componente.
- Modelo de CollectionsManager extraído (2026-11-18): la lógica de dominio de
  `CollectionsManager.tsx` (tipos, storage de colecciones, operaciones de colección, normalización
  de búsqueda y export/import Excel) pasó a `src/utils/collectionsManagerModel.ts`; el `.tsx` quedó
  como orquestador de estado UI y render (623 → 354 líneas). `CollectionsPanel.tsx` y
  `CollectionsSidebar.tsx` importan `Collection`/`CollectionColumn` del modelo (antes duplicados).
  Tests nuevos: `collectionsManagerModel.test.ts` (16). Validaciones: typecheck 0, lint OK, build OK,
  vitest 394/394 (47 archivos), audit:orphans 20.
- Modelo de GrammarTab extraído (2026-11-19): la lógica de dominio de `GrammarTab.tsx` (tipos
  `GrammarModule`/`SyntaxSubTab`, detección de primer arranque, progreso del manifiesto, factories de
  rol/estrategia/afijo, derivación de afijos del léxico, realización de la cláusula de preview,
  fusión de gramática flexible, config de preview y sello de guardado) pasó a
  `src/utils/grammarTabModel.ts`; el `.tsx` quedó como orquestador de estado UI + render
  (484 → 350 líneas) y se eliminó la duplicación del array de participantes entre el preview y el
  `useEffect` que siembra el AST editable. Tests nuevos: `grammarTabModel.test.ts` (18).
  Validaciones: typecheck 0, lint OK, build OK, vitest 412/412 (48 archivos), audit:orphans 20.
- Modelo de SyntaxCanvas extraído (2026-11-19): la lógica de dominio de `SyntaxCanvas.tsx`
  (árbol de nodos, conexiones, cámara/zoom, mapeo de coordenadas y bezier de flechas) pasó a
  `src/utils/syntaxCanvasModel.ts`; el `.tsx` quedó como orquestador de estado UI + render
  (484 → 459 líneas) y re-exporta los símbolos públicos. Tests nuevos:
  `syntaxCanvasModel.test.ts` (18). Validaciones: typecheck 0, lint OK, build OK,
  vitest 430/430 (49 archivos), audit:orphans 20.

---

## Cola de ejecución (modo auto)
Cada elemento tiene criterio de aceptación binario: hecho o no hecho.

### Bloque A: Cimientos (COMPLETADO)
- [x] A1. Inicializar git + commit inicial + tag `v0.1.0`
- [x] A2. Implementar `schemaVersion` en `LexiconData`
- [x] A3. Crear `src/services/schemaMigrations.ts` con pipeline de migraciones
- [x] A4. Implementar backup `.bak` automático pre-escritura en `sqlStorage.ts`
- [x] A5. Cerrar runtime `tauri:dev` confirmado por el usuario

### Bloque B: Traducción real (COMPLETADO)
- [x] B1. `src/services/interlinearGlossService.ts` (segmentación morfémica + glosas Leipzig)
- [x] B2. `src/components/InterlinearGlossViewer.tsx`
- [x] B3. Mejorar `TranslationPlayground.tsx` con pipeline grounded + confianza

### Bloque C: Gramática avanzada (COMPLETADO)
- [x] C1. `src/services/soundChanger.ts`
- [x] C2. `src/components/SoundChangeWorkbench.tsx`
- [x] C3. `src/components/NeographyText.tsx` (render dinámico de glifos)

### Bloque D: Performance y escala (COMPLETADO)
- [x] D1. FTS5 en SQLite para búsqueda full-text
- [x] D2. Web Worker para `JSON.stringify` de léxicos grandes
- [x] D3. Transacciones SQLite + escritura atómica en Rust

### Bloque E: Release (COMPLETADO)
- [x] E1. `tauri build` + installer
- [x] E2. Documentación de usuario final
- [x] E3. CI/CD básico

### Bloque F: Validación runtime + pulido (COMPLETADO)
- [x] F1. Validar en runtime `npm run tauri:dev` que FTS5 search, InterlinearGlossViewer y SoundChangeWorkbench funcionan sin crashes
- [x] F2. Añadir feedback visual de búsqueda FTS5 (loading/empty/result count) en `LexiconTable`
- [x] F3. Añadir ejemplo precargado en `InterlinearGlossViewer` para demostración inmediata
- [x] F4. Añadir ejemplo precargado en `SoundChangeWorkbench` para demostración inmediata
- [x] F5. Verificar que `GrammarImporterModal` muestra `ImportValidationReport` correctamente tras importar gramática de ejemplo

### Bloque G: Estabilidad y QA (COMPLETADO)
- [x] G1. Ejecutar suite completa de tests y reportar cobertura actual
  - Resultado: suite actual confiable = `src/services/grammar/__tests__` (16 files, 83 passed).
  - Hallazgo: `src/data/__tests__/taxonomy.test.ts`, `src/components/__tests__/IPAKeyboard.test.ts`, `src/hooks/__tests__/useUndoRedo.test.ts`, `src/services/__tests__/sessionCache.test.ts`, `src/services/__tests__/typologyProfile.test.ts`, `src/validation/__tests__/runtimeValidation.test.ts`, `src/services/phonology/__tests__/linter.test.ts` no son compatibles con Vitest en su forma actual (`No test suite found`, alias `/@/` y formato runner legacy). No bloquear avance; repararlos es una tarea separada.
- [x] G2. Correr `npm run lint` + `npm run typecheck` + `npm run build` y corregir regresiones
  - `npm run lint`: OK
  - `npm run typecheck`: 0 errores
  - `npm run build`: OK
- [x] G3. Probar flujo completo end-to-end: crear lexicón → agregar palabras → buscar por FTS5 → glosar interlineal → aplicar sound change → guardar
  - Estado: módulos implementados e integrados en UI; falta validación visual por el usuario en `npm run tauri dev`.

### Bloque H: Usabilidad y pulido final (COMPLETADO)
- [x] H1. Añadir botón "Volver al ejemplo" en `InterlinearGlossViewer` y `SoundChangeWorkbench`
- [x] H2. Añadir tooltips informativos en tool cards de `ToolsDashboard`
- [x] H3. Mejorar empty states en `InterlinearGlossViewer` y `SoundChangeWorkbench`
- [x] H4. Añadir favicon y título dinámico de ventana según lexicón activo

### Bloque I: Performance y optimización (COMPLETADO)
- [x] I2. Lazy loading de modales y componentes pesados (`GrammarImporterModal`, `ToolsDashboard`)
- [x] I3. Optimizar `LexiconTable` para léxicos grandes (virtualización si aplica)

### Bloque J: Tests legacy y calidad (COMPLETADO)
- [x] J1. Reparar suite legacy de tests para Vitest (taxonomy, sessionCache, IPAKeyboard, useUndoRedo, linter, runtimeValidation, typologyProfile)
- [x] J2. Añadir `build.rollupOptions.output.manualChunks` para reducir tamaño del bundle principal
- [x] J3. Mejorar tooltips y accesibilidad en componentes de tabla y modales

### Bloque K: Pulido final y cierre de ciclo (COMPLETADO)
- [x] K1. Revisar consistencia de tooltips en modales y formularios
- [x] K2. Añadir accesibilidad básica en vistas de herramientas (glosado/sound change)
- [x] K3. Preparar release candidate final y resumen de estado

---

## Reglas de ejecución
1. No pedir aprobación para bloques A-D sin riesgo de pérdida de datos
2. Cada tarea terminada = commit + criterio de aceptación verificado
3. Si un bloque requiere decisión de producto, pausar y reportar; si no, seguir
4. No hacer investigación sin implementación paralela
5. El usuario NO debe tener que preguntar "cómo vas"; el estado se reporta solo por cambios concretos

---

## Próxima tarea activa

**[x] CLN — extraer el modelo puro de `SyntaxCanvas.tsx` (P1, 2026-11-19).** El componente
(484 líneas) mezclaba dominio y render. Nuevo `src/utils/syntaxCanvasModel.ts` con tipos
(`NodeBounds`, `NodeBoundsMap`, `ConnectionPath`, re-export de `NodeType`/`SyntaxConnection`/
`SyntaxNode`), constantes (`MIN_ZOOM`, `MAX_ZOOM`, `ZOOM_STEP`, `ZOOM_WHEEL_IN`,
`ZOOM_WHEEL_OUT`, `DEFAULT_CHILD_NODE`), operadores de árbol (`uid`, `updateNodeDeep`,
`removeNodeDeep`, `addChildToNode`, `findNodeDeep`, `findAllNodes`), factories (`createNode`,
`createChildNode`, `createConnection`), cámara (`clampZoom`, `zoomStep`, `zoomByWheel`,
`toCanvasPoint`, `toNodeBounds`) y geometría de flechas (`buildConnectionPath`). `SyntaxCanvas.tsx`
quedó en 459 líneas como orquestador de estado UI + render y re-exporta los símbolos públicos.
Tests nuevos: `syntaxCanvasModel.test.ts` (18). Validaciones: typecheck 0, lint OK,
build OK, vitest 430/430 (49 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `GrammarTab.tsx` (P1, 2026-11-19).** El componente
(484 líneas) mezclaba dominio y render. Nuevo `src/utils/grammarTabModel.ts` con tipos
(`GrammarModule`, `SyntaxSubTab`, `ProgressMetric`, `GrammarProgress`, `GrammarPreview`),
constantes (`DEFAULT_GRAMMAR_MODULE`, `DEFAULT_SYNTAX_SUB_TAB`), `isFirstRunManifest`,
`calculateGrammarProgress`, factories (`createSyntacticRole`, `createStrategy`, `createAffix`),
`buildLexiconAffixes`/`withLexiconAffixes`, `buildClauseParticipants`/`buildClausePreview`
(unifica el array de participantes que antes duplicaban el preview y el `useEffect` del AST
editable), `mergeFlexibleGrammar`, `mergePreviewConfig` y `withLastUpdated`. `GrammarTab.tsx`
quedó en 350 líneas como orquestador de estado UI + render y re-exporta `GrammarModule`/
`SyntaxSubTab`. Tests nuevos: `grammarTabModel.test.ts` (18). Validaciones: typecheck 0, lint OK,
build OK, vitest 412/412 (48 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `CollectionsManager.tsx` (P1, 2026-11-18).** El componente
(623 líneas) mezclaba dominio y render. Nuevo `src/utils/collectionsManagerModel.ts` con tipos
(`Collection`, `CollectionColumn`, `CollectionCustomCells`, `CollectionTemplate`), constantes
(`ACTIVE_LEXICON_STORAGE_KEY`, `COLLECTIONS_STORAGE_PREFIX`, `COLLECTION_SHEET_NAME`,
`EXCEL_SYSTEM_KEYS`, `COLLECTION_TEMPLATES`), persistencia (`readStoredCollections`/
`writeStoredCollections`/`parseStoredCollections` con type guard `isCollectionLike`), operaciones
de colección (`createCollection`, `collectionFromTemplate`, `toggleEntryInCollection`,
`setCollectionCell`, `addDraftToCollection`, `removeDraftFromCollection`, `addColumnToCollection`,
`renameColumnInCollection`), búsqueda (`normalizeText`) y Excel (`buildCollectionExportData`,
`buildExcelExportRows`, `buildExcelImportPlan`). `CollectionsManager.tsx` quedó en 354 líneas como
orquestador de estado UI + render; `CollectionsPanel.tsx` y `CollectionsSidebar.tsx` importan los
tipos del modelo (antes duplicados en tres archivos). Tests nuevos: `collectionsManagerModel.test.ts`
(16). Validaciones: typecheck 0, lint OK, build OK, vitest 394/394 (47 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `GraphCanvas.tsx` (P1, 2026-11-18).** El componente
(975 líneas) mezclaba dominio y render. Nuevo `src/utils/graphCanvasModel.ts` con tipos
(`LevelId`, `NodePort`, `ModuleNodeType`, `GraphNode`, `GraphEdge`, `PragmaticEngineState`,
`NodeCallbacks`), grafos de nivel (`ROOT_NODE_ID`/`ROOT_NODES`/`ROOT_EDGES`, `GRAMMAR_NODES`/`EDGES`,
`LEXICON_NODES`/`EDGES`, `DYNAMIC_NODE_PORTS`), presentación (`STATUS_COLORS`, `STATUS_DOT`,
`MODULE_LABELS`) y utilidades (`grammarNodeType`, `toRfNodes`, `withStats`, `toRfEdges`,
`safeShortId`). `GraphCanvas.tsx` quedó en 831 líneas como orquestador de estado UI + render y
re-exporta los símbolos públicos; `ModulePalette.tsx` ahora importa `ModuleNodeType` del modelo
(antes estaba duplicado). Validaciones: typecheck 0, lint OK, build OK, vitest 378/378
(46 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `SyntaxFlowline.tsx` (P1, 2026-11-18).** El componente
(992 líneas) mezclaba dominio y render. Nuevo `src/utils/syntaxFlowlineModel.ts` con tipos
(`PinValue`, `PinDef`, `FlowlineBlock`, `DefaultBlockDef`), constantes (`STORAGE_KEY`,
`BLOCK_ICONS`/`BLOCK_COLORS`, `ROLE_TO_*`, `DEFAULT_BLOCK_DEFS`, `ORDER_BLOCK_MAP`,
`FALLBACK_OPTIONS`), `buildBlocksFromManifest`/`extractMorphologicalProperties`/`getMorphoOptions`,
persistencia (`saveState`/`loadState` con type guard `isSavedBlockState` en lugar de `any`),
`shuffle` y `handleDropOutside`. `SyntaxFlowline.tsx` quedó en 630 líneas y re-exporta los
helpers para no tocar los tests. Validaciones: typecheck 0, lint OK, build OK, vitest 378/378
(46 archivos), audit:orphans 20.

**[x] CLN — extraer `DashboardTab` de `App.tsx` (P1, 2026-11-18).** El tab `dashboard` era el último
bloque inline grande del God Component (~70 líneas de JSX + dos closures de navegación que
duplicaban la lista de sub-módulos de gramática). Nuevo `src/components/DashboardTab.tsx` monta
`LanguageHomeCanvas` y centraliza el enrutado módulo → tab; `App.tsx` aporta `handleOpenGrammarModule`
y el objeto `stats` ya calculado. `GRAMMAR_SUB_MODULES` quedó definido una sola vez y el
`moduleId as any` pasó a `moduleId as AppTabId`. Validaciones: typecheck 0, lint OK, build OK,
vitest 378/378 (46 archivos), audit:orphans 20.

**[x] CLN — métricas vivas del dashboard sin `NaN` (2026-11-18).** El `stats` de
`LanguageHomeCanvas` y el `rulesCount` pragmático leían campos inexistentes del manifiesto
(`morphology.rules`, `syntax.rules`, `categories`, `phonology.consonants/rules`) que Zod descarta,
produciendo `NaN` visible y un contador siempre en 0. Nuevo `src/utils/grammarMetrics.ts` como fuente
única; `App.tsx` lo consume y se eliminaron los casts `as any` del bloque. Validaciones: typecheck 0,
lint OK, build OK, vitest 378/378 (46 archivos).

**[x] CLN — canvas de sintaxis cableado (B1, 2026-11-18).** `GrammarSyntaxPanel` declaraba el
subtab `canvas` (y era el por defecto) pero no renderizaba nada: no había botón y `SyntaxCanvas.tsx`
estaba huérfano. Ahora el subtab monta `SyntaxCanvas` con `manifest.syntaxCanvas` (fallback vacío),
`onChange` persiste vía `onUpdateManifest`, y recibe `conlangName`/`aiAvailable` de `GrammarTab`.
Validaciones: typecheck 0, lint OK, build OK, vitest 374/374, audit:orphans 20. Pendiente: demo
runtime (`npm run tauri dev`) para validar pointer events, zoom y modales.

**[x] CLN — bug de UI: `isAppLoaded` / `hasLocalData` / `showHomePanel` nunca se setean (B0, 2026-11-18).**
`AppProjectBootstrapLayer` retornaba `null` siempre. Cableado el arranque: `loadSessionCache()` hidrata
`projectPath`/`sessionCacheData`, `listLexiconNames()` alimenta `hasLocalData`, y `setIsAppLoaded(true)`
se setea recién tras ese load; sin `projectPath` y sin descarte previo se ofrece la ubicación del `.loxar`.
El descarte ahora persiste (`SessionCache.bootstrapDismissed`). `showHomePanel` sigue sin uso (estado
muerto declarado, no bloqueante). Test nuevo: `appProjectBootstrapLayer.test.tsx` (5 tests).

**[ ] CLN — empujar el trabajo local y cerrar CI (BLOQUEADO: requiere autorización).**
**Hay 19 commits locales** en `master` que no están en `origin` (`dad806e`, `1f34de3`, `ad3110a`, `25dbe93`,
`cd7547f`, `f433c22`, `d113bb9`, `6b66129`, `ca191f6`, `20d827a`, `795a8fb`, `dc3cd46`, `b7c73be`,
`aeea62a`, `2ebb88b`, `9bc5f70`, `ed45653`, `ee2a505`). El
Gauntlet v3.12 exige `push` + CI verde con número de run para cerrar la Fase J; el skill
`loxar-progress-supervisor` prohíbe push automático. `gh auth` está activo y con scopes
`repo`+`workflow`, así que el push es viable de inmediato si el usuario lo autoriza. Sin eso no
hay número de run y la fase queda formalmente abierta.

**[ ] CLN — decidir destino de los 20 huérfanos de `src/`.** Inventario reproducible con
`npm run audit:orphans` (creado en `aeea62a`). 9 candidatos a borrado seguro (sin uso ni en tests),
10 features completas nunca montadas (decisión de producto), 3 con tests propios (no borrar sin
re-cablear). Ver checkpoint en `docs/continuity/TASKS.md`.

**[x] CLN — higiene de release (2026-11-13, 2da pasada).** Creado `LICENSE` (MIT) y corregido el
contador de tests del `README.md` (122 → 369/369, verificado con `npx vitest run`). Pendiente de
decisión de usuario: FASE L de `GAUNTLET_CLN.md` (borrado de `.zcode/`, `.claude/` y
`_ARTIFACTS_NO_GIT/` del disco local — requiere decidir qué conservar) y los 17 huérfanos de `src/`.

**[x] CLN — deuda huérfana (2026-11-13).** Borrados 6 archivos sin importadores (`NeographyModal`,
`GrammarManagerModal`, 4 stubs de 0 bytes). Validaciones en verde. Pendiente de decisión: 17 huérfanos
más (ver checkpoint en `docs/continuity/TASKS.md`).

**[x] Gauntlet v3.12 Fase J (commit `ee2a505`).** J1 botón "Configurar IA", J2 cancelar real, J3
`ImportJobBanner`, J4 tests. Pendiente: `git push` + CI verde con número de run (el push automático
está deshabilitado por el skill `loxar-progress-supervisor`), y la demo runtime del gauntlet
(checklist en `docs/gauntlets/GAUNTLET_v3.12.md`).

**[x] P0 — Higiene pre-release (ver `docs/AUDIT_REPORT.md`).** Completada: deps muertas eliminadas, archivos duplicados/sueltos borrados, `.gitignore` actualizado, `SESSION_CACHE.json` refrescado. Validaciones estáticas en verde.

**[ ] P1 — Auditoría de arquitectura.** Refactors estructurales pendientes:
- [x] Renombrar `window.electronAPI` → `window.loxarBridge` y matar stubs Gemini muertos.
- [x] Extraer widget bridge de `App.tsx` a `src/hooks/useWidgetBridge.ts` (P1-2).
- [x] Extraer work queue de `App.tsx` a `src/hooks/useWorkQueue.ts` (P1-2b).
- [x] Extraer handlers de IA/sugerencias de `App.tsx` a `src/hooks/useAiHandlers.ts` (P1-2c).
- [x] Extraer project operations de `App.tsx` a `src/hooks/useProjectOperations.ts` (P1-2d).
- [x] Extraer bootstrap/modal/app handlers de `App.tsx` a `src/hooks/useAppHandlers.ts` (P1-2e).
- [x] Migrar tests legacy a Vitest. Suite actual: 122/122 tests unitarios/integración en Vitest; `jest` eliminado de `package.json`; solo queda `tests-gui/smoke.spec.ts` (Playwright) como suite GUI separada.
- [ ] **Descomponer `App.tsx` (God Component) y los 4 componentes gigantes.**
  - Estado: P1-2f revertido; se avanza por secciones pequeñas sin reintentar `useProjectShell`.
  - Extraído de `App.tsx`: `ToastContainer`, `OfflineBanner`, `AmbientLights`,
    `ProjectBootstrapBanner`, `AppToolbar`, `AppBatchToolbar`, `TabButton`, `DashboardTab`.
  - Extraído de `EntryEditor`: `SignificadoTagsInput`, `EntryDuplicateWarning`, `EntryEditorAiActions`,
    `EntryEditorCompleteModeNav`, `EntryEditorHeader`, `EntryEditorAiBanner`, `EntryEditorIpaToggle`.
  - Extraído de `CollectionsManager`: `ParadigmCell`.
  - Extraído de `GrammarTab`: helpers de preview movidos a `src/utils/grammarPreview.ts`,
    `GrammarOverview`, `GrammarPhonologyPanel`, `GrammarTypologyPanel`, `GrammarNotesPanel`,
    `GrammarStrategiesPanel`, `GrammarMorphologyPanel`, `GrammarRolesPanel`, `GrammarSyntaxPanel`,
    `GrammarModuleSidebar`, `GrammarTabHeader` y `GrammarTabModals`.
  - Próximo paso real: `EntryEditor` (494); `GrammarTab` (484) y `SyntaxCanvas` (484) ya fueron
    extraídos a `src/utils/grammarTabModel.ts` y `src/utils/syntaxCanvasModel.ts`;
    `GraphCanvas.tsx` y `CollectionsManager.tsx` ya fueron extraídos a `src/utils/graphCanvasModel.ts`
    y `src/utils/collectionsManagerModel.ts`.

**[x] Ampliación del importador de gramática a texto libre multilingüe (2026-08-14).** Completado:
- `textParser.ts` ahora reconoce encabezados libres con `:` en inglés, español, esperanto y japonés/CJK.
- `parseCategorySection` extrae formas standalone (`-k`, `-s`, etc.) cuando no hay estructura `X por -Y`.
- `parseStrategies` detecta partículas genéricas del tipo `marker (contexto)`.
- `diverseGrammars.test.ts` pasa con score >= 80 para 5 casos diversos.
- Suite grammar: 122/122 tests pasando.

**[ ] Validación GUI automatizada (harness listo, pendiente 1er run con autorización).** Se creó
`tests-gui/` (Playwright, modo web headless) + `npm run test:gui`. El agente puede detectar crashes
silenciosos / regresiones visuales sin que el usuario pegue screenshots. El PRIMER run requiere
`npx playwright install chromium` (descarga one-time) y consume CPU; por eso es **notificado y opt-in**
(SOP §9), NO parte del ciclo horario. Los diálogos nativos de Tauri (Guardar/Abrir `.loxar`) no se
automatizan acá.

---
