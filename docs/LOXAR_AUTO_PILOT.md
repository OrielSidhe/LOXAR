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
- Repo limpio, build/typecheck/lint verdes; vitest 918/918 (114 archivos) y `npm run test:gui`
  (6 specs / 8 tests): 8/8 en 2.0 min con 1 worker (en paralelo sigue
  sensible a la contencion del chunk lazy del importador)
- Gauntlet v3.13: FASE U, E, M, G y T cerradas; push `86f3e42..d6e653d` verificado, CI `45808270226` success (attempt 1, head `d6e653d`). FASE D (demo del usuario) y R final pendientes.
- Últimos bloques: `d6e653d` (Dropdown cierra al elegir opción, teclado y 0 `any`), `11ae2c9` (FASE T: probar sin guardar + hints), `3429a8d` y `6b54cb3` (CLN/P1).
- CI fijada a Node 24.15.0 (`d1a8e8e`): verificado en local contra el fallo previo de Node 20 (`undici@8.12.3` en 3 suites jsdom); typecheck/lint/build y vitest 865/865 en verde.
- Gauntlet v3.14: fases EX/CMP/NAV/FX/MY/FLU cerradas y publicadas; pendientes D (demo del
  usuario) y R (reporte final). Push al día: 0 commits locales sin publicar.
- `tauri:build` funcionando (Vite + Tauri 2.11.1 alineados)
- Git inicializado y con commits; último commit de código `a3c3efc` (pathUtils 9 `any` → 0 + 6 tests); antes `e0ac5ec` (runtimeValidation 1 `any` → 0), `7446e54` (EntryEditorForm 0 `any` + test de contrato); antes `a3230ad` (export MD agrupado por categoría, v3.14 D2, ya en `origin/master`), `ab925ad` (errores de IA acotados en Ollama: cuerpo truncado a 2000 caracteres y timeout en `testConnection`, criterio X1 de v3.9 extendido al adaptador Ollama); antes `9719ff8` de `audioService` y `aiProviderRegistry` (0 `any` reales en `services/`), `82da775` de `prompts`, `eecee83` de `geminiService`, `8fb648f` de `ftsSearch`, `5ec1da7` de `jsonWorker`, `0b380e9` de `sessionCache`, `f2021da` de `normalize` y `b2ecfca` de `sqlStorage` + transacciones SQLite
  explícitas, P1 God Component); todas publicadas en `origin/master`, sin commits locales sin
  push. CI verde en el tip: run `45816750895` attempt 1 `success` (head `0d6f443`).
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
- Corrección de preview (2026-11-19): `getDefaultPreviewEntries` (`src/utils/grammarPreview.ts`)
  excluía del objeto `byId(preview?.objectEntryId)` — siempre `undefined` cuando el preview no fija
  entradas — en vez del sujeto ya resuelto, así que el objeto de la cláusula de preview repetía al
  sujeto. Ahora `subject` y `verb` se resuelven una sola vez, el objeto excluye ambos y cae a la
  primera entrada libre. Tests nuevos: `grammarPreview.test.ts` (15). Validaciones: typecheck 0,
  lint OK, build OK, vitest 445/445 (50 archivos), audit:orphans 20.
- Schema de preview (2026-11-19): `GrammarManifestSchema` (`src/services/normalize.ts:92`) ahora
  declara `subjectEntryId`/`verbEntryId`/`objectEntryId` (`z.string().optional()`); antes Zod los
  descartaba en cada recarga y el preview caía en resolución automática. Tests nuevos:
  `normalizePreview.test.ts` (4). Validaciones: typecheck 0, lint OK, build OK, vitest 449/449
  (51 archivos), audit:orphans 20.
- Modelo de EntryEditor extraído (2026-11-19): la lógica de dominio de `EntryEditor.tsx`
  (completion de entrada, descripción de modos, detección de duplicados por significado/raíz/léxema,
  resolución de categoría nueva, mapeo tolerante de la respuesta de IA, datos base de la entrada con
  inferencia de raíz, toggle de modos, estado inicial del formulario y habilitación de botones) pasó a
  `src/utils/entryEditorModel.ts`; el `.tsx` quedó como orquestador de estado UI + render
  (494 → 396 líneas). Se eliminaron los props muertos `findDuplicateSignificados`/`onDuplicateFound`
  (de `EntryEditor`, `WorkbenchTab` y `App.tsx`) y el estado muerto `duplicateEntries`. Tests nuevos:
  `entryEditorModel.test.ts` (25). Validaciones: typecheck 0, lint OK, build OK, vitest 474/474
  (52 archivos), audit:orphans 20.
- Modelo de LexiconTable extraído (2026-11-19): la lógica de dominio de `LexiconTable.tsx`
  (normalización de texto, detección de entradas incompletas, color determinista por categoría,
  categorías únicas, filtrado por categoría/vista/búsqueda con intersección FTS, paginación,
  formato de afijos y aplicación de cambios del formulario en línea) pasó a
  `src/utils/lexiconTableModel.ts`; el `.tsx` quedó como orquestador de estado UI + render
  (693 → 603 líneas) y re-exporta los símbolos del modelo. Se eliminó el cast
  `as keyof Omit<LexiconEntry, ...>` a favor de ramas tipadas en `applyEditFormChange`.
  Tests nuevos: `lexiconTableModel.test.ts` (20). Validaciones: typecheck 0, lint OK, build OK,
  vitest 494/494 (53 archivos), audit:orphans 20. Cierra el P1 de God Components: no queda ningún
  componente grande pendiente de extracción.
- Limpieza de huérfanos (2026-11-19): borrados 7 archivos triviales sin importador y sin uso
  (`icons/HelpIcon`, `icons/LineIcon`, `icons/Header`, `ProgressModal`, `data/commonWords`,
  `data/swadeshList`, `utils/drawingUtils`); verificados con `audit:orphans` + grep de imports
  relativos y dinámicos. `audit:orphans` bajó de 20 a 13. Quedan 13: 10 features/componentes
  completos nunca montados (decisión de producto), `strategyBridge`/`typologyProfile` (con tests
  propios), `jsonWorker` (implementado, no cableable por CSP de Tauri) y `TabButton` (muerto tras la
  extracción a `App.tsx`). Validaciones: typecheck 0, lint OK, build OK, vitest 494/494.
- Validación runtime web (2026-11-19): smoke con `npm run dev` + navegador real. Hallazgo: el jingle
  lanzaba `RangeError` (tiempo negativo) con el `AudioContext` suspendido; corregido en `1f418e3`
  con test de regresión. Smoke re-ejecutado en verde (0 errores de consola).
- Notificaciones del importador (2026-11-20): `GrammarTabModals` dejaba un `showNotification` no-op
  y el importador tragaba todos sus toasts; ahora recibe la del `App` (`d10e3e6`). Nuevo E2E
  `tests-gui/grammar-import.spec.ts` (parser offline → SOV → guardar) y helper compartido
  `createLexiconFromSelector` (`8c4fc07`). `npm run test:gui` 6/6.
- Sound change persistente (2026-11-20): el botón "Aplicar al léxico" corría el lote sobre un
  snapshot interno y lo descartaba (`onApplyBatch` opcional, nunca cableado). Ahora
  `handleApplySoundChangeBatch` (`useAppHandlers.ts`) persiste las entradas vía
  `updateActiveLexicon` y el workbench exige la prop. Nuevo E2E
  `tests-gui/sound-change.spec.ts`. `npm run test:gui` 7/7.
- Higiene y puerta de calidad (2026-11-20): eliminado el estado muerto `showHomePanel` de `App.tsx`
  y el import sin uso `type Page` de `tests-gui/flow.spec.ts` (`be22301`); el CI ahora corre
  `npm run lint` además de typecheck/vitest/build (`a03e57a`).
- Smoke runtime web (2026-11-20): `npm run dev` + navegador real, 0 `error`/`unhandledrejection`;
  la bienvenida renderiza completa tras la recarga.
- God Component (2026-11-20): `App.tsx` 925 → 906 líneas al extraer `buildDashboardStats`
  (`src/utils/dashboardStats.ts`) con el tipo `DashboardStats` compartido con `LanguageHomeCanvas`;
  tests propios (4). `audit:orphans` se mantiene en 13.
- Switch de tabs (2026-11-21): `App.tsx` 865 → 790 líneas al extraer el bloque JSX de tabs
  (`src/components/AppTabContent.tsx`, 489 líneas) con `AppTabContentProps` tipado y los ocho
  hijos en el mismo orden de render; `table`/`workbench` siguen siempre montados (FASE NAV) y
  `ToolsTab.lexicon` cae a un lexico vacio sin `lexiconData`. Tests propios (8, hijos mockeados).
  `audit:orphans` 13 (baseline).
- Bienvenida + wizard (2026-11-21): `App.tsx` 762 → 756 líneas al extraer el bloque de bienvenida y
  el `FirstRunWizard` (`src/components/AppWelcomeLayer.tsx`) con `AppWelcomeLayerProps` tipado; la
  decision de "Siguiente" salio a `src/utils/welcomeLayerModel.ts` (`shouldCompleteWizardStep`) y
  `AppWelcomeSection` dejo de aceptar `any[]` (`TourStep[]` exportado desde `src/data/tourSteps.ts`).
  Tests propios (5 + 2). `audit:orphans` 13 (baseline).

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

### Bloque D: Performance y escala (COMPLETADO; D2 pendiente)
- [x] D1. FTS5 en SQLite para búsqueda full-text
- [ ] D2. Web Worker para `JSON.stringify` de léxicos grandes — NO cableado: `jsonWorker.ts`
  está implementado pero `new Worker(blobURL)` queda fuera del CSP de Tauri (`script-src 'self'`);
  `sqlStorage.ts` serializa síncrono. Requiere decidir alternativa (worker en archivo estático o
  relajar el CSP) antes de marcarlo como hecho.
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
**[x] v3.13 T — probar conexión sin guardar + hints accionables (2026-11-26, commit `11ae2c9`).** Nuevo `src/services/connectionTestHints.ts`: `classifyConnectionError` cubre 400 con missing tag (añade tags en extraBody), 401/403 (key inválida), 404 (usa «Obtener modelos»), 429 (cuota/rate limit) y timeout/AbortError (sube `requestTimeoutMs`); `resolveTestReasoning` fuerza `medium` en OpenRouter free y `off` en Nous, también por nombre; `buildTestProviderConfig` devuelve una copia desacoplada del formulario, sin tocar `providers`. `AiSettingsModal.tsx` añade «Probar sin guardar» dentro del formulario (`:500`) y aplica los hints tanto a esa prueba como a la del proveedor activo. Tests nuevos: `connectionTestHints.test.ts` (21). Validaciones: typecheck 0, lint OK, build OK, vitest 918/918 (114 archivos), audit:orphans 13. CI verde: run `45808270226` `success` (head `d6e653d`, incluye `11ae2c9`); siguiente bloque: FASE D (demo runtime, la ejecuta el usuario).

**[x] v3.13 M+G — model discovery y geminiAdapter a REST (2026-11-26, commits `4443f88`, `7701fc8`).** FASE M añade `GET {base}/v1beta/models` con timeout/abort, normalización de respuestas OpenAI/Gemini, botón «Obtener modelos» con `datalist` en el formulario y preset Google AI Studio (3 modelos). FASE G elimina `require('@google/genai')`: el adaptador usa fetch REST, mapea `system`/`assistant` a `systemInstruction`/`model`, mergea `extraBody` en el body y acota errores HTTP; los tests de fábrica se sustituyeron por `fetch` mockeado. Validaciones: typecheck 0, lint OK, build OK, vitest 895/895 (112 archivos), audit:orphans 13. Push + CI pendientes.

**[x] CLN — tipado estricto de `InflectionView` y `ToolsTab` (P1, 2026-11-26, commits `3429a8d`, `6b54cb3`).** `InflectionView` pasa de 7 `any` a 0 con uniones derivadas del dominio (proceso paralelo); `ToolsTab` pasa de 5 `any` a 0 usando `React.ComponentProps` de sus hijos y un test de contrato (2 tests). Validaciones sobre el arbol combinado: typecheck 0, lint OK, build OK, vitest 875/875 (110 archivos), GUI 8/8 con 1 worker, audit:orphans 13 (baseline). No se hizo push por diseno del skill.


**[x] EX + CLN — export MD por categoría y tipado estricto de `EntryEditorForm` (2026-11-26,
commits `a3230ad`, `7446e54`).** `a3230ad` (proceso paralelo) agrupa el export MD por
categoría según v3.14 D2. `7446e54` elimina los 6 `any` de props de `EntryEditorForm` en favor
de `LexiconEntry[]`, `GenerationMode[]`, `GenerationModeOption[]` y el callback tipado;
test de contrato nuevo (2 tests). Validaciones sobre el árbol combinado: typecheck 0,
lint OK, build OK, vitest 867/867 (108 archivos), audit:orphans 13 (baseline).
CI del push paralelo en curso (run `45765573476`); `7446e54` queda local sin push.

**[x] CI — Node 24.15.0 fijado (2026-11-25, commit `d1a8e8e`).** El fallo rojo de CI era de entorno: `jsdom@30.1.3` exige Node `^22.22.2 || ^24.15.0 || >=26.0.0` y `undici@8.12.3` declara `>=22.19.0`, pero el workflow usaba Node 20. Reproducido con Node 20.20.2 (3 suites jsdom caen en `undici/.../decompress.js:78`) y verificado con Node 24.15.0: typecheck 0, lint OK, build OK, vitest 865/865 (107 archivos). Se declara además `engines.node >=24.15.0`. Sin cambios en tests ni código de aplicación.

**[x] CLN — errores de IA acotados en Ollama (GAUNTLET v3.9 X1, 2026-11-25, commit `ab925ad`).** Nuevo `truncateErrorBody` en `base.ts` (2000 caracteres + marcador) reutilizado por `openAIAdapter` y `ollamaAdapter`; `testConnection` de Ollama pasa a usar `AbortController` con `requestTimeoutMs` y limpia el temporizador en `finally`. Tests: `aiProviders.test.ts` (+4). Validaciones: typecheck 0, lint OK, build OK, vitest 865/865 (107 archivos), audit:orphans 13 (baseline).

**[x] CLN — tipado estricto de `audioService` y `aiProviderRegistry` (P1, 2026-11-25, commit `9719ff8`).** Los dos `any` reales restantes de `services/` pasan a 0: `LegacyAudioWindow` tipa el prefijo `webkitAudioContext` sin perder el fallback, y `unsupportedEndpointStyle(style: never)` conserva el valor inválido del mensaje de error mientras mantiene exhaustivo el switch. Tests: `audioService.test.ts` (+1, fallback legacy) y `aiProviderRegistry.test.ts` (+1, diagnóstico con estilo manipulado). Validaciones: typecheck 0, lint OK, build OK, vitest 861/861 (107 archivos), audit:orphans 13 (baseline).

**[x] CLN — tipado estricto de `prompts` (P1, 2026-11-25, commit `82da775`).** El único `any` de `src/services/prompts.ts` pasa a `EntryEditorFormPayload`, el tipo canónico que ya consumían `completeEntry`, `useAiHandlers` y `EntryEditor`. Sin cambio de comportamiento. Tests nuevos: `prompts.test.ts` (6): serialización del payload y del perfil, modo por defecto, afijos derivacionales, muestra etimológica, combinación de modos y esquema de raíz/léxema. Validaciones: typecheck 0, lint OK, build OK, vitest 859/859 (107 archivos), audit:orphans 13 (baseline).

**[x] CLN — tipado estricto de `geminiService` (P1, 2026-11-24, commit `eecee83`).** Los 2 `any` del archivo pasan a 0: `callAi(fallbackResult: unknown)` conserva la serialización del fallback y el lector tolerante de raíz/léxema sale al módulo puro `src/utils/aiResponseModel.ts` (`getNormalizedProp`, guard de registro y normalización accent-insensitive; mismo comportamiento para arreglos y valores falsy). Tests nuevos: `aiResponseModel.test.ts` (5). Validaciones: typecheck 0, lint OK, build OK, vitest 853/853 (106 archivos), audit:orphans 13 (baseline).

**[x] CLN — tipado estricto de `ftsSearch` (P1, 2026-11-24, commit `8fb648f`).** Las 2 anotaciones `any` de `src/services/ftsSearch.ts` pasan a 0: importación dinámica de `@tauri-apps/plugin-sql` con inferencia de tipos, fila `FtsRow` tipada en `db.select<FtsRow[]>()` y guard `isTauri` reutilizado desde `sqlStorage.ts` en lugar del chequeo inline de `window.__TAURI_INTERNALS__`. Sin cambios en el parseo ni en el fallback a búsqueda en memoria. Tests: `ftsSearch.test.ts` (4). Validaciones: typecheck 0, lint OK, build OK, vitest 848/848 (105 archivos), audit:orphans 13.


**[x] CLN — tipado estricto de `jsonWorker` (P1, 2026-11-24, commit `5ec1da7`).** Se cerró el
trabajo a medias del árbol: 4 `any` → 0, callbacks del worker tipados (`MessageEvent`, `ErrorEvent`),
guard de `id` y genérico por defecto `unknown`. Fix funcional: `space` se reenvía al worker, antes
ignorado (salida distinta frente al fallback nativo). Tests: `jsonWorker.test.ts` (3). Validaciones:
typecheck 0, lint OK, build OK, vitest 844/844 (104 archivos), audit:orphans 13.

**[x] CLN — tipado estricto de `sessionCache` (P1, 2026-11-23, commit `0b380e9`).** Los dos
`catch (e: any)` pasan a `catch (e: unknown)` y usan `getErrorMessage` de `entryEditorModel.ts`
para clasificar `not found`/`forbidden` al leer y `forbidden`/`permission` al escribir; el error se
rethrow si no aplica el fallback. Cubre también errores lanzados como string. Tests nuevos: 3 en
`sessionCache.test.ts`. Validaciones: typecheck 0, lint OK, build OK, vitest 841/841 (103 archivos),
audit:orphans 13. Próximo frente: `jsonWorker` (4 `any`), `geminiService` (2), `ftsSearch` (2).

**[x] CLN — tipado estricto de la API de `normalize` (P1, 2026-11-23, commit `f2021da`).** El frente del checkpoint anterior era `normalize.ts`: tres firmas `any` en la API de normalización. Nuevo `LegacyEntryInput` con las variantes históricas de campo y helper `toLegacyStringArray` que conserva el comportamiento exacto (array → array, string → `[string]`, vacío → `[]`); `normalizeGrammarManifest`/`normalizeLexiconData` pasan a `unknown` y entregan a `Schema.parse`. Los 19 `z.any()` se conservan (tolerancia legacy: cambiarlos alteraría el parseo en runtime) y los 2 `as any` de `.default()` quedan justificados por el desajuste campos opcionales de la interfaz vs. salida requerida por Zod. Tests: `normalizeLegacyEntry.test.ts` (2). `any` del archivo: 5 → 2. Validaciones: typecheck 0, lint OK, build OK, vitest 838/838 (103 archivos), audit:orphans 13. Próximo frente: `jsonWorker` (4 `any`) y los `z.any()` de `normalize.ts`.

**[x] CLN — tipado estricto de `sqlStorage` + transacciones SQLite explícitas (P1, 2026-11-22, commit `b2ecfca`).** El siguiente cluster de `any` de `services/` era `src/services/sqlStorage.ts` (5 anotaciones). Ahora `import type Database` de `@tauri-apps/plugin-sql` y `db.select<Row[]>` / `BackupRow[]` / `{ id: number }[]` en los seis sitios, sin casts. El tipado destapó un bug real: `Database` no expone `transaction()`, así que el `db.transaction(...)` anterior (sobre un `any`) habría lanzado `db.transaction is not a function` en runtime Tauri; nuevo `runInTransaction` con BEGIN/COMMIT/ROLLBACK explícitos. Tests: `src/services/__tests__/sqlStorageTransaction.test.ts` (4). `any` de `services/`: 45 → 40. Validaciones: typecheck 0, lint OK, build OK, vitest 836/836 (102 archivos), audit:orphans 13. Próximo frente: `normalize.ts` (19 `z.any()` + firmas `any`).

**[x] CLN — tipado estricto de la frontera `DeclarativeManifest` → `GrammarManifest` → motor (P1, 2026-11-22, commit `edf2239`).** El frente documentado eran los `any` de `services/`; el siguiente cluster era la cadena de conversión de gramática. `grammarParser.convertToLegacy` tenía un `mapStrategyType` que devolvía claves de catálogo (`suffix`, `tone_change`, `positional`, `auxiliary_periphrastic`) incompatibles con el `StrategyType` canónico y lo salvaba con `as any`: ahora `STRATEGY_TYPE_MAP` (`suppletion` → `affix`). La realización declarativa pasaba con `kind`/`position` en `as any`: nueva `toSlotRealization` que narrows por `kind`. En `morphology.ts`, `chooseRealization` se tipa con `InflectionSlot`/`AllomorphCondition` y la forma sale al helper `realizationForm` (narrows `SlotRealization`: `form`/`replace`/`ruleId`). En `syntax.ts`, el fallback `{} as any` pasa al nuevo `EngineLexemeLike` y `exceptions` se tipa como `GrammarException[]`. Tests: `grammarParser.test.ts` (4). `any` de `services/`: 52 → 45 (anotaciones). Validaciones: typecheck 0 · lint OK · build OK · vitest 832/832 (101 archivos).

**[ ] CLN — frente siguiente del God Component (P1).** El frente restante en `services/` es `normalize.ts` (19 `z.any()` de tolerancia legacy y 2 `.default(... as any)` justificados: no tocar sin alterar el parseo en runtime). `prompts`, `audioService` y `aiProviderRegistry` quedaron en 0 `any` (`82da775`, `9719ff8`), al igual que `sessionCache`, `jsonWorker`, `ftsSearch` y `geminiService`. El flujo de auditoría muerto de `useWorkQueue` sigue como decisión de producto (cablear o borrar). Pendiente por autorización: `git push` + CI con número de run.

**[x] CLN — tipado estricto de `grammarDb` (P1, 2026-11-22, commit `48bcad5`).** El frente
documentado eran los `any` de `services/`; el mayor cluster restante era `grammarDb.ts` (8): el
`Database` del plugin SQL viajaba como `Promise<any>`, las filas como `Record<string, any>` y las
columnas JSON se leían con `JSON.parse(...) as any`. `import type Database` (se borra en
compilación: el bundle web sigue sin resolver el plugin; el `import()` dinámico de `getDb` es el
único acceso runtime) + `db.select<XRow[]>` con un tipo de fila por tabla + guards exportados
(`parseStringArray`, `parseBlockIds`, `parseClauseTypeIds`, `parseBlockRefs`, `parseTemplates`,
`isPragmaticClauseType`). Fuera el `as any` de `getTemplates`. Tests:
`grammarDbSerialization.test.ts` (12). `any` de `services/`: 38 → 32 (anotaciones, excluyendo
`__tests__`). Validaciones: typecheck 0 · lint OK · build OK · vitest 828/828 (100 archivos) ·
audit:orphans 13 · `npm run test:gui` 8/8 (1 worker, 3.4 min).

**[ ] CLN — frente siguiente del God Component (P1).** Los `any` que quedan en `services/`
(`sqlStorage` 5, `normalize` 5, `jsonWorker` 4, `grammarParser` 3, `sessionCache` 2,
`grammar/syntax` 2, `grammar/morphology` 2, `geminiService` 2, `ftsSearch` 2, `prompts` 1,
`audioService` 1, `aiProviderRegistry` 1) y el flujo de auditoría muerto de `useWorkQueue`
(decisión de producto: cablear o borrar). `App.tsx` queda en 651 líneas y su `return` ya solo
contiene capas (`AppWelcomeLayer`, `AppOverlayLayers`, `AppHeaderLayer`, `AppBodyLayer`,
`AppFloatingLayers`).

**[x] CLN — tipado estricto del árbol AST editable (P1, 2026-11-22, commit `8a56728`).** El
frente documentado eran los `any` de `services/`; el mayor cluster era `ast-view.ts` (17) más
`ast-builder.ts` (4), y la frontera `any` se propagaba a `GrammarTab` (`useState<any>`),
`GrammarSyntaxPanel` (`editableAst`/`onSetEditableAst`) y `GrammarPragmaticPanel` (`let ast: any`).
Nuevos `EditableSyntaxNode`/`EditableClauseAST` en `engineTypes.ts` (mismo shape que
`SyntaxNode`/`ClauseAST` pero con `role`/`category` como `string`: el editor acepta roles
arbitrarios del usuario y el motor los lee como cadena); `buildClauseAST` devuelve
`EditableClauseAST` y `ast-view` queda con 0 `any`. Único cast documentado en la frontera del
motor: `toClauseAST()` (`ast-builder.ts`), consumido por `realizeEditedTree`, `GrammarPragmaticPanel`
y `grammarTabModel`. `GrammarManifest.clauseTree` pasa a `EditableClauseAST`; fuera `GenericNode`.
`any` de `services/`: 59 → 42. Validaciones: typecheck 0 · lint OK · build OK · vitest 819/819
(99 archivos) · audit:orphans 13.

**[ ] CLN — frente siguiente del God Component (P1).** Los `any` que quedan en `services/`
(`grammarDb` 8, `sqlStorage` 5, `normalize` 5, `jsonWorker` 4, `grammarParser` 3, `sessionCache` 2,
`grammar/syntax` 2, `grammar/morphology` 2, `geminiService` 2, `ftsSearch` 2, `prompts` 1,
`audioService` 1, `aiProviderRegistry` 1) y el flujo de auditoría muerto de `useWorkQueue`
(decisión de producto: cablear o borrar). `App.tsx` queda en 651 líneas y su `return` ya solo
contiene capas (`AppWelcomeLayer`, `AppOverlayLayers`, `AppHeaderLayer`, `AppBodyLayer`,
`AppFloatingLayers`).

**[x] CLN — tipado estricto del validador post-import (P1, 2026-11-22, commit `880488a`).** El
frente documentado eran los `any` de `services/`. `validatePostImport` acepta
`DeclarativeManifest | GrammarManifest` y los tres `as any` salvaban el acceso a la fonología y a
la realización de slots, con formas distintas en cada formato. Nuevos tipos estructurales
`PhonologyLike` (`{ consonants, vowels }` | `{ inventory: {...} }`) y `RealizationLike`
(`{ kind, form?, position? }`), a los que ambos miembros de la unión son asignables, y helper
`realizationForm()` para leer `form` sin cast. Cero `any`/casts en el archivo. Validaciones:
typecheck 0 · lint OK · build OK · vitest 819/819 (99 archivos) · audit:orphans 13.

**[ ] CLN — frente siguiente del God Component (P1).** `App.tsx` queda en 651 líneas y su `return`
ya solo contiene capas (`AppWelcomeLayer`, `AppOverlayLayers`, `AppHeaderLayer`, `AppBodyLayer`,
`AppFloatingLayers`). Los `any` de `WorkbenchTab` y del validador post-import quedaron resueltos
(`5806782`, `880488a`); el frente siguiente es el flujo de auditoría muerto de `useWorkQueue`
(decisión de producto: cablear o borrar) y los `any` que quedan en `services/`
(`grammar/ast-view` 17, `grammarDb` 8, `sqlStorage` 5, `normalize` 5, `grammarParser` 3,
`grammar/ast-builder` 4).

**[x] CLN — tipado estricto del parser de importación (P1, 2026-11-22, commit `efb03fc`).** El
frente documentado eran los `any` fuera de la cadena `App → AppTabContent → WorkbenchTab`. El
hook central `useLexicon.ts` guardaba `rawData?: any[]` y tres `catch (e: any)`; el origen real
del tipo era `src/services/parser.ts`, con 12 `any` (CSV/JSON de importación, `processMappedData`
y el type guard del backup). Nuevos `LexiconRow` (`Record<string, unknown>`) y
`RejectedLexiconRow` (`_rejectIndex`) exportados; `ParseResult.successfulData` es `LexiconRow[]`
y `backupData` es `Partial<LexiconData>` (type guard `isLexiconBackup`), que es justo lo que
acepta `createImportedLexicon`. `JSON.parse` pasa a `unknown` + `toRows` con `isRecord`; los
`catch` usan `getErrorMessage` de `entryEditorModel.ts`; fuera los `(res: any)` de
`batchDetermineCategory`. `lexiconCompareFile.entriesFromRows` acepta `LexiconRow[]`. Tests:
`src/services/__tests__/parser.test.ts` (12). Deuda `any` de `src/`: 198 → 178. Validaciones:
typecheck 0 · lint OK · build OK · vitest 819/819 (99 archivos) · audit:orphans 13.

**[ ] CLN — frente siguiente del God Component (P1).** `App.tsx` queda en 651 líneas y su
`return` ya solo contiene capas. El frente siguiente son los `any` de `services/`
(`grammar/ast-view` 17, `grammarDb` 8, `sqlStorage` 5, `normalize` 5, `grammarParser` 3,
`grammar/ast-builder` 4, `grammar/postImportValidator` 3) y el flujo de auditoría muerto de
`useWorkQueue` (decisión de producto: cablear o borrar).

**[x] CLN — tipado estricto de `WorkbenchTab` (P1, 2026-11-22, commit `5806782`).** Los `any`
restantes de la capa que pasa props a `EntryEditor`/`WorkbenchRightPanel`: `entryToEdit`,
`onAddWord`, `onUpdateWord`, `activeMetadata`, `activeLexicon`, `suggestions`, `onAddManually`,
`onGenerateAI`, `generativeProfile`, `onSaveGenerativeProfile`, `manifest` y `onSyncPhonology`
quedaron alineados con los tipos canónicos de `AppTabContent`/`WorkbenchRightPanel`
(`LexiconEntry | null` normalizado a `undefined` en la frontera, `LexiconEntry | NewLexiconEntry`,
`LexiconMetadata | null`, `MissingWord[]`, `GenerativeProfile`, `Partial<GenerativeProfile>`).
`App.tsx` se mantiene en 651 líneas. Validaciones: typecheck 0, lint OK, vitest 807/807
(98 archivos), audit:orphans 13.

**[x] CLN — modelo de completitud del léxico + limpieza de estado muerto (P1, 2026-11-21, commit
`3b85470`).** `App.tsx` guardaba inline el criterio de "pendiente de completar" (el predicado del
modo completar, que exige `Significado` además de raíz/léxema/categoría), el `useMemo` de
`completionStats` y el acote del índice de entrada. Nuevo `src/utils/lexiconCompletion.ts`
(`isEntryPendingCompletion`, `filterPendingCompletion`, `buildLexiconCompletionStats`,
`clampIncompleteIndex`, tipo `LexiconCompletionStats`); el predicado se movió verbatim, SIN
unificarlo con `isEntryIncomplete` de `lexiconTableModel.ts` (el de tabla no exige `Significado`:
son criterios distintos para consumidores distintos). Se eliminó el estado muerto
`searchColumn`/`setSearchColumn`, el import sin uso `WORD_LISTS` y el `goToStep` del destructure del
wizard. `App.tsx`: 756 → 746 líneas. Tests: `lexiconCompletion.test.ts` (12). Validaciones:
typecheck 0, lint OK, build OK, vitest 712/712 (85 archivos), audit:orphans 13.

**[x] CLN — bienvenida + wizard del `return` a `AppWelcomeLayer` (P1, 2026-11-21, commit
`267a27e`).** `App.tsx` montaba inline el `AppWelcomeSection` (splash + pantalla de bienvenida +
tour) y el `FirstRunWizard` del primer arranque, ~35 líneas con ~20 props. Nuevo
`src/components/AppWelcomeLayer.tsx` con `AppWelcomeLayerProps` tipado y el mismo orden de render;
la unica decision de la zona (el boton "Siguiente" del wizard completa el asistente solo en el
paso `data-folder`) salio a `src/utils/welcomeLayerModel.ts` (`shouldCompleteWizardStep`).
`AppWelcomeSection` dejo de aceptar `tourSteps: any[]` (ahora `TourStep[]`, exportado desde
`src/data/tourSteps.ts`). Los efectos de la bienvenida (jingle + cierre de pantalla) siguen en
`App.tsx` como `onImport`/`onStartTour`. `App.tsx`: 762 → 756 líneas. Tests:
`appWelcomeLayer.test.tsx` (5, hijos mockeados) y `welcomeLayerModel.test.ts` (2). Validaciones:
typecheck 0, lint OK, build OK, vitest 700/700 (84 archivos), audit:orphans 13, `npm run test:gui`
8/8 (48s).

**[x] CLN — limpieza de código muerto de `App.tsx` (P1, 2026-11-21, commit `a0fd7cc`).** Las
extracciones de P1 dejaron ~40 imports sin uso (componentes que hoy viven en `AppTabContent`, los siete
iconos, `Papa`, `plugin-fs`, `projectFile`, `phonologySync`, servicios y tipos), el estado muerto
`visibleColumns`/`setVisibleColumns` y cinco entradas de destructure sin uso. `App.tsx`: 746 → 710
líneas. Se verificó con `tsc --noEmit --noUnusedLocals` (el typecheck normal no los marca porque
`noUnusedLocals: false`). Se descartó agrupar las props de `AppTabContent` por tab: medido sobre el
árbol real, el call site **aumenta** (105 → 115 líneas) sin ganancia funcional. Validaciones:
typecheck 0, lint OK, build OK, vitest 712/712 (85 archivos), audit:orphans 13, `npm run test:gui` 8/8.

**[x] CLN — cuerpo principal del return a AppBodyLayer (P1, 2026-11-21, commit `df10e77`).** El
bloque de barra lateral + `AppNavigationBar` + `main` + `AppTabContent` (~126 líneas) salió a
`src/components/AppBodyLayer.tsx` (`AppBodyLayerProps = AppTabContentProps & { onSidebarTabChange,
onOpenWidget, onOpenSettings, onGoHome, onNavBack, onQuickNav }`), con el mismo orden de render y
`AppNavigationBar` condicional a `activeTab !== 'dashboard'`. `App.tsx`: 707 → 691 líneas. Tests:
`appBodyLayer.test.tsx` (5, con los tres hijos mockeados). Validaciones: typecheck 0, lint OK, build
OK, vitest 717/717 (86 archivos), audit:orphans 13; `npm run test:gui` 5/8 y 7/8 en dos corridas
(flake documentado del chunk lazy) con el spec fallido pasando 1/1 en aislamiento.

**[x] CLN — `Header` + `AppToolbar` a `AppHeaderLayer` (P1, 2026-11-22, commit `259e840`).** El
`return` de `App.tsx` montaba el `Header` (marca, widget, ajustes y tema) y el `AppToolbar`
(selector de léxico, archivo, proyecto y sesión) en dos bloques con ~36 props. Nuevo
`src/components/AppHeaderLayer.tsx` con `AppHeaderLayerProps = HeaderProps & AppToolbarProps` y el
destructure exhaustivo de las seis props de `Header` (el resto va íntegro al toolbar, sin
solapamiento de nombres); `HeaderProps` pasó a exportarse desde `Header.tsx`. `App.tsx`: 691 → 687
líneas. Tests: `appHeaderLayer.test.tsx` (4, ambos hijos mockeados). Validaciones: typecheck 0,
lint OK, build OK, vitest 721/721 (87 archivos), audit:orphans 13, `npm run test:gui` 7/8 con
`grammar-import.spec.ts` 1/1 en aislamiento (flake del chunk lazy).

**[x] CLN — editor de morfología (`InflectionModule`) cableado al léxico (P1, 2026-11-22, commit
`c7813f1`).** Trabajo de una sesión previa cortada, verificado y cerrado: el `InflectionProfile` se
persistía por léxico pero no tenía editor en la UI, porque `InflectionModal`/`InflectionView` estaban
escritos y nunca montados. Nuevo `src/components/InflectionModule.tsx` (paradigmas anidados, reglas
simples/condicionales y reglas fonológicas con previsualización) con la lógica pura en
`src/utils/inflectionModuleModel.ts`. Cableado de punta a punta: `AppModalId` + `inflection_module`,
`useModalCoordination.openInflectionModule`, `ModalManager` (con `activeInflectionProfile`),
`ToolsDashboard` (tarjeta "Morfología"), `LexiconToolsModal`, `ToolsTab`, `AppTabContent` y `App.tsx`
(`onUpdateInflectionProfile`). Se eliminó la prop muerta `onOpenInflectionWorkshop`. Tests:
`InflectionModule.test.tsx` (7) e `inflectionModuleModel.test.ts` (28). Validaciones: typecheck 0,
lint OK, build OK, vitest 756/756 (89 archivos), audit:orphans 13, `npm run test:gui` 8/8 (1 worker,
dev server caliente; con 6 workers la suite cae por contención del chunk lazy, no por regresión).

**[x] CLN — estado del modo "completar" a `useEditorCompletion` (P1, 2026-11-22, commit
`ef6b390`).** El cuerpo de `App.tsx` resolvía inline las entradas pendientes
(`filterPendingCompletion`), el índice acotado (`clampIncompleteIndex`) y la entrada objetivo del
modo "completar", con dos `useEffect`. Nuevo `src/utils/editorCompletionModel.ts`
(`resolveEntryToComplete`, `resolveEntryToCompleteForMode`, tipo `EditorMode`) y
`src/hooks/useEditorCompletion.ts`, que memoiza `incompleteEntries` y expone `editorMode`/
`setEditorMode`, `incompleteIndex`/`setIncompleteIndex`, `incompleteEntries` y `entryToComplete`
con los setters en la firma `Dispatch<SetStateAction<T>>` que reciben `useAppHandlers` y
`AppBodyLayer`. `App.tsx`: 672 → 658 líneas. Tests: `editorCompletionModel.test.ts` (5) y
`useEditorCompletion.test.tsx` (7). Validaciones: typecheck 0, lint OK, build OK, vitest 782/782
(93 archivos), audit:orphans 13, `npm run test:gui` 8/8 (1 worker, dev server caliente).

**[x] CLN — notificaciones a `useAppNotifications` (P1, 2026-11-22, commit `370f28b`).** El cuerpo
de `App.tsx` guardaba el estado `notifications`, el `useCallback` de `showNotification` (con
auto-dismiss a 5 s) y el `setNotifications` inline del `onDismissNotification`. Nuevo
`src/hooks/useAppNotifications.ts` (`AppNotification`, `AppNotificationType`, `NOTIFICATION_DURATION_MS`,
`useAppNotifications`) que memoiza `showNotification` (misma identidad entre renders, porque
`useLexicon` y `useProjectOperations` la reciben como dependencia) y expone `dismissNotification`.
El `id` pasa de `Date.now()` a un contador monótono por montaje: dos notificaciones creadas en el
mismo milisegundo compartían `id` y el auto-dismiss o el descarte manual se llevaba las dos.
`App.tsx`: 658 → 655 líneas. Tests: `useAppNotifications.test.tsx` (8). Validaciones: typecheck 0,
lint OK, build OK, vitest 790/790 (94 archivos), audit:orphans 13, `npm run test:gui` 8/8 (51 s,
1 worker, dev server caliente).

**[x] CLN — tema a `useAppTheme` (P1, 2026-11-22, commit `91da2b5`).** El cuerpo de `App.tsx`
guardaba el estado `themeId` (`useState(getStoredTheme())`) y el `useEffect` que aplicaba
`applyTheme(themes[themeId])` y persistía con `saveTheme`. Nuevo `src/hooks/useAppTheme.ts`
(`UseAppThemeResult`, `useAppTheme`) que conserva el contrato verbatim y mantiene `setThemeId` con la
firma `Dispatch<SetStateAction<ThemeId>>` que consume `AppHeaderLayer` vía `onThemeChange`.
`App.tsx`: 655 → 653 líneas; fuera el `useState`, el efecto y el import de `themeService`. Tests:
`useAppTheme.test.tsx` (6, jsdom manual: default aplicado al DOM, hidratación persistida, tema
inválido, `setThemeId` aplica y persiste, updater, identidad del setter). Validaciones: typecheck 0,
lint OK, build OK, vitest 796/796 (95 archivos), audit:orphans 13.

**[x] CLN — tipado estricto de `canvasState` y tour steps (P1, 2026-11-22, commit `22aed12`).**
`App.tsx` arrastraba dos `any[]` de frontera: el estado `canvasState`
(`{ nodes: any[]; edges: any[] }`) y `setCurrentTourSteps` (`Dispatch<SetStateAction<any[]>>`).
`LoxarProject.canvas` pasa al tipo exportado `LoxarCanvasState` (`unknown[]`: JSON persistido sin
productor tipado) y `canvasState`/`setCanvasState` se tipan con él en `App.tsx`,
`useProjectOperations` y `useAppHandlers`; la lista de pasos del tour se tipa con `TourStep[]` y la
selección por tab sale al modelo puro `src/utils/tourStepsModel.ts` (`resolveTourSteps`). Se retiró
el handler muerto `handleCanvasChange` (sin consumidor en `src/` ni `tests-gui/`) y con él las
opciones `setCanvasState`/`markProjectDirty`, que quedaron sin uso. `App.tsx` se mantiene en 653
líneas (entran 2 imports de tipos, salen 2 props). Tests: `tourStepsModel.test.ts` (4). Validaciones:
typecheck 0, lint OK, build OK, vitest 800/800 (96 archivos), audit:orphans 13, `npm run test:gui`
8/8 (3.1 min, 1 worker, dev server gestionado por el config).

**[x] CLN — efectos de arranque a `usePragmaticDbInit` y `useWidgetDataSync` (P1, 2026-11-22, commit
`82bc5d3`).** Últimos dos `useEffect` inline del cuerpo de `App.tsx`: la sincronización del léxico
con el widget y la inicialización de la base pragmática. Nuevos `src/hooks/usePragmaticDbInit.ts` y
`src/hooks/useWidgetDataSync.ts` (`UseWidgetDataSyncOptions`), con el contrato verbatim (envía solo
si existen entradas, perfil de inflexión y metadatos; la DB degrada en silencio). `App.tsx`: 653 →
652 líneas. Tests: `usePragmaticDbInit.test.tsx` y `useWidgetDataSync.test.tsx`. Validaciones:
typecheck 0, lint OK, build OK, vitest 807/807 (98 archivos), audit:orphans 13.

**[x] CLN — tipado estricto de `useProjectOperations` (P1, 2026-11-22, commit `5f99137`).** El mayor
cluster de `any` del cuerpo de `App.tsx`: `activeGrammar`, `activeProfile`, `activeCustomFunctions`,
`themeId`, `activeTab`, `lexicons` y seis firmas de `lexiconHook`. Tipados con `GrammarManifest`,
`GenerativeProfile`, `NeographyProfile`, `InflectionProfile`, `LexiconData`, `CorpusEntry`, `ThemeId`
y `AppTabId`; el cast `project.session.activeTab as any` pasa a `as AppTabId` y se elimina el import
muerto `GenerationMode`. `App.tsx` sin cambios. Validaciones: typecheck 0, lint OK, vitest 807/807
(98 archivos), audit:orphans 13.

**[x] CLN — tipado estricto de la frontera IA/handlers (P1, 2026-11-22, commit `1a8ad1b`).** Los
`any` restantes de `useAppHandlers` (`activeGrammar`, `activeMetadata`, `activeCustomFunctions`,
`handleWidgetSearch`, `handleInflectRequest`), de `useAiHandlers` (`generativeProfile`,
`setActiveTab`, `setInitialDataForAdd`, `partialEntry`) y de `useWidgetBridge`/`useWorkQueue`,
tipados con `GrammarManifest`, `LexiconMetadata | null`, `string[]`, `GenerativeProfile`,
`AppTabId`, `EntryEditorFormPayload` y `EntryEditorInitialData`; el tipo se propagó por
`AppTabContent` → `WorkbenchTab` → `EntryEditor`. Nuevo `InflectedParadigmResult`
(`inflectionService.ts`) y `SuggestionWord` (`MissingWord & { Función?: string }`), fuera los
`(word as any).Función`. Se eliminó el estado muerto `lastAiResult` (desde el commit inicial solo
se escribía). Hallazgo: el flujo de auditoría de `useWorkQueue` llamaba `setActiveTab('audit')`,
un tab inexistente; ahora navega a `workbench`. `App.tsx`: 652 → 651 líneas. Validaciones:
typecheck 0, lint OK, build OK, vitest 807/807 (98 archivos), audit:orphans 13.

**[ ] CLN — frente siguiente del God Component (P1).** `App.tsx` queda en 651 líneas y su `return`
ya solo contiene capas (`AppWelcomeLayer`, `AppOverlayLayers`, `AppHeaderLayer`, `AppBodyLayer`,
`AppFloatingLayers`). Los `any` de `WorkbenchTab` y del validador post-import quedaron resueltos
(`5806782`, `880488a`); el frente siguiente es el flujo de auditoría muerto de `useWorkQueue`
(decisión de producto: cablear o borrar) y los `any` que quedan en `services/`
(`grammar/ast-view` 17, `grammarDb` 8, `sqlStorage` 5, `normalize` 5, `grammarParser` 3,
`grammar/ast-builder` 4).

**[x] CLN — capas superpuestas del `return` (P1, 2026-11-21, commit `e654fe4`).** `App.tsx`
montaba inline seis capas antes del `Header` (luces ambientales, overlay de carga, banner offline,
banner del trabajo de importación, capa de modales con ~40 props y capa de ajustes) y cuatro después
del área de contenido (toolbar de lote, toasts, widget flotante y bootstrap). Nuevos
`src/components/AppOverlayLayers.tsx` (`AppOverlayLayersProps = AppModalLayerProps & {...}`) y
`src/components/AppFloatingLayers.tsx` (`AppFloatingLayersProps = AppProjectBootstrapLayerProps &
{...}`), ambos con el mismo orden de render y las dos condicionales preservadas (`table` + selección;
`!showWelcome && !showWizard`). No se reordenaron las capas en flujo (`OfflineBanner`,
`ImportJobBanner`): moverlas alteraría el layout. `App.tsx`: 790 → 762 líneas. Tests:
`appOverlayLayers.test.tsx` (7, con los diez hijos mockeados). Validaciones: typecheck 0, lint OK,
build OK, vitest 693/693 (82 archivos), audit:orphans 13, `npm run test:gui` 8/8.

**[x] CLN — switch de tabs a `AppTabContent` (P1, 2026-11-21, commit `6ef5337`).** Trabajo de
una sesion previa cortada, verificado y cerrado: el `return` de `App.tsx` guardaba ~393 de JSX
con ocho ramas de tab y ~30 props por rama. Nuevo `src/components/AppTabContent.tsx` (489
lineas) con `AppTabContentProps` tipado estrictamente y el mismo orden de render; preserva los
contratos (table/workbench siempre montados con `hidden` + `aria-hidden` y `active`; `stats` ya
calculado; `onSearch` propagado; `ToolsTab.lexicon` con fallback a un lexico vacio).
`App.tsx`: 865 → 790 lineas. Tests: `appTabContent.test.tsx` (8, con los ocho hijos mockeados).
`.gitignore`: `scratch/` fuera del repo. Validaciones: typecheck 0, lint OK, build OK, vitest
686/686 (81 archivos), audit:orphans 13.

**[x] CLN — banner offline restaurado (P1, 2026-11-21, commit `7299386`).** Segundo cableado
perdido por el revert de P1-2f (`7767f8b`), mismo patrón que `a804a8c`: `showOfflineBanner` se
leía en `AppOfflineBannerLayer` pero su setter nunca se invocaba, así que el banner "Grammar
engine running offline" nunca aparecía. `grammarOk` quedó sin lector y `App.tsx` importaba
`isAiAvailable`/`validateGrammarEngine` sin uso. Nuevo `src/utils/offlineBannerModel.ts`
(`shouldShowOfflineBanner`) + `src/hooks/useOfflineBannerStatus.ts` (valida el motor y consulta
IA una vez al montar, con guard de desmontaje y degradación a `false`). `App.tsx`: 866 → 865
lineas, fuera los dos `useState` y los dos imports. Tests: modelo (5) y hook (4). Validaciones:
typecheck 0, lint OK, build OK, vitest 678/678 (80 archivos), audit:orphans 13.

**[x] CLN — handlers de comparacion/merge a `useLexiconMerge` (P1, 2026-11-21, commit `7026051`).**
Trabajo de una sesion previa cortada, verificado y cerrado: `handleLoadLexiconEntries` y
`handleMergeLexiconEntries` salieron de `App.tsx` a `src/utils/lexiconMergeModel.ts`
(`buildLexiconMerge`) + `src/hooks/useLexiconMerge.ts`. `App.tsx`: 881 → 866 lineas. Tests:
modelo (5) y hook (6). Validaciones: typecheck 0, lint OK, build OK, vitest 669/669
(78 archivos), audit:orphans 13.

**[x] CLN — capas superpuestas del `return` de `App.tsx` (P1).** Resuelto en `e654fe4`: nuevas
`AppOverlayLayers` y `AppFloatingLayers` con props tipadas estrictamente; `App.tsx` 790 → 762 lineas.

**[x] CLN — tipado estricto de navegación (`AppTabId` + `dashboardNavigation`, 2026-11-20).** La
unión de tabs estaba duplicada en `App.tsx`, `DashboardTab.tsx` y `useAppHandlers.ts`, y los casts
`as any` de la barra lateral/filtro/tema y el `moduleId as AppTabId` de `DashboardTab` dejaban
pasar ids inválidos: los nodos del nivel léxico del canvas (`wordtypes`, `roots`, `entries`,
`import`) colaban un tab inexistente y la app quedaba en blanco. Nuevos `src/utils/appTabs.ts`
(`AppTabId` + `isAppTabId`) y `src/utils/dashboardNavigation.ts` (`resolveDashboardNavigation`),
con `GRAMMAR_MODULES`/`isGrammarModule` en `grammarTabModel.ts`; `VerticalSidebar` y `Header`
tipados en la frontera (`AppTabId`/`ThemeId`). Tests: `appTabs.test.ts` (3) y
`dashboardNavigation.test.ts` (6, recorre todos los nodos del canvas). Validaciones: typecheck 0,
lint OK, build OK, vitest 595/595 (68 archivos), audit:orphans 13, `test:gui` 8/8, smoke
`vite preview` (navegación a Léxico y tema `midnight → cyber`). Commit `7d53813`.

**[x] CLN — capa de modales del God Component (P1, 2026-11-20, commit `4ba2515`).** Extraído el
bloque `Suspense` + `ModalManager` (lazy) + `AiSettingsModal` (~54 líneas de JSX con ~40 props) a
`src/components/AppModalLayer.tsx`, siguiendo el patrón de `AppSettingsModalLayer`/`AppToastLayer`;
`ModalManagerProps` y `ModalState` quedaron exportados desde `ModalManager.tsx`, `ImportState` se
exporta desde `useLexicon.ts` (antes duplicada) y `ModalState = AppModalId`. `App.tsx`: 937 → 933
líneas. Tests: `modalLayerModel.test.ts` (3) y `appModalLayer.test.tsx` (3, con `vi.mock` de los
chunks lazy). Validaciones: typecheck 0, lint OK, vitest 601/601 (70 archivos), audit:orphans 13.

**[x] CLN — coordinacion de modales a `useModalCoordination` (P1, 2026-11-20, commit `f526fd0`).**
`App.tsx` tenia dos estados sueltos (`activeModal`, `showSettings`) y 13 flechas inline que
resolvian aperturas/cierres; `useAppHandlers` duplicaba la union de modales y `handleOpenModal` era
`(modal: any) => void`. Nuevo `src/utils/modalCoordinationModel.ts` (estado + reducer puro) y
`src/hooks/useModalCoordination.ts` (acciones memoizadas, incluidas `openFunctions`/`openHyphens`/
`openProfile`/`openCompare`/`openRestore`/`openAbout`/`openAiSettings`); `openAiSettingsFromSettings`
conserva el contrato original (cierra ajustes y abre el modal de IA). `useAppHandlers` y
`useFirstRunWizardActions` reciben `openModal: (modal: AppModalId) => void`; se elimina el `any` y
la union duplicada. `App.tsx`: 933 → 947 lineas (el destructure del hook aporta 15). Tests:
`modalCoordinationModel.test.ts` (7) y `useModalCoordination.test.tsx` (5). Validaciones: typecheck 0,
lint OK, build OK, vitest 613/613 (72 archivos), audit:orphans 13.

**[x] CLN — hidratacion de sesion a `useAppSessionHydration` (P1, 2026-11-21).** Los dos
`useEffect` grandes (bienvenida + bootstrap, ~55 lineas) que hidrataban
`showWelcome`/`sessionCacheData`/`projectPath`/`exportPath`/`exportFormats`/`bootstrapDismissed`/
`hasLocalData`/`isAppLoaded` pasaron al hook `src/hooks/useAppSessionHydration.ts`, con el
decision-making en el modelo puro `src/utils/sessionHydrationModel.ts`
(`shouldShowWelcomeOnStart`, `shouldOfferProjectBootstrap`, `buildSessionHydrationPlan`,
`DEFAULT_SESSION_HYDRATION`, `SessionCacheLike` sin imports de Tauri). El hook mantiene el
contrato: `isAppLoaded` se eleva tambien en el camino de error (con guard `cancelled`) y los
setters se exponen como `Dispatch<SetStateAction<T>>` para no tocar `useProjectOperations` ni
`useAppHandlers`. `App.tsx`: 947 → 905 lineas; fuera 9 `useState` y los imports sin uso
(`loadSessionCache`, `saveSessionCache`, `listLexiconNames`, `normalizeExportFormats`,
`DEFAULT_EXPORT_FORMATS`, `ExportFormat`). Tests: `sessionHydrationModel.test.ts` (11) y
`useAppSessionHydration.test.tsx` (8, con `vi.mock` del cache y de `sqlStorage`). Validaciones:
typecheck 0, lint OK, build OK, vitest 632/632 (74 archivos), audit:orphans 13.

**[x] CLN — navegacion por tabs a `useTabNavigation` (P1, 2026-11-21, commit `4f89276`).**
`App.tsx` guardaba el tab activo como un historial (`AppTabId[]`) resuelto por flechas inline
(`setActiveTab` que apilaba sin duplicar, `goBack`, `goHome`, `handleOpenGrammarModule`,
`handleQuickNav`) y repetía `() => setActiveTab('writing'|'grammar'|'translator'|'dashboard')`
en los modales y en `ToolsTab`. Nuevo `src/utils/tabNavigationModel.ts` (`DEFAULT_TAB`,
`resolveActiveTab`, `pushTab`, `popTab`, `resetTabHistory`, `isAtHome`, `QuickNavTarget` +
`isQuickNavTarget`) y `src/hooks/useTabNavigation.ts`, que expone ademas los atajos
`openDashboard`/`openWriting`/`openGrammar`/`openTranslator` y mantiene la firma
`Dispatch<SetStateAction<AppTabId>>` que reciben `useProjectOperations`, `useAppHandlers`,
`useAiHandlers` y `useWorkQueue`. `App.tsx`: 905 → 883 lineas. Tests:
`tabNavigationModel.test.ts` (10) y `useTabNavigation.test.tsx` (10). Validaciones: typecheck 0,
lint OK, build OK, vitest 652/652 (76 archivos), audit:orphans 13; `test:gui` con el dev server
caliente: `flow.spec.ts` y `workbench-lexicon-jump.spec.ts` pasan en aislamiento (la suite
completa en paralelo es inestable por contencion del chunk lazy, igual que en el arbol limpio).

**[x] CLN — handlers de comparacion/merge inline (P1).** Resuelto en `7026051`: salieron a
`src/utils/lexiconMergeModel.ts` + `src/hooks/useLexiconMerge.ts`; ya no quedan inline en `App.tsx`.

**[x] CLN — handlers del wizard de primer arranque a `useFirstRunWizardActions` (P1, 2026-11-20).**
Los cinco handlers inline de `App.tsx` (`handleWizardConfigureAi`, `handleAiSettingsModalClose`,
`handleWizardSkip`, `handleWizardComplete`, `handleChooseDataFolder`) pasaron al modelo puro
`src/utils/wizardActionsModel.ts` (`buildWizardActions` + `AppModalId`) y al hook
`src/hooks/useFirstRunWizardActions.ts`, que los memoiza y cablea el dialogo real de carpetas.
El state `activeModal` se movió arriba y la union inline de literales pasó a `AppModalId`; se
eliminó el import `open`/`save` de `@tauri-apps/plugin-dialog`, sin uso tras la extracción.
`App.tsx`: 962 → 935 líneas. Tests nuevos: `wizardActionsModel.test.ts` (9). Validaciones:
typecheck 0, lint OK, build OK, vitest 586/586 (66 archivos), audit:orphans 13, smoke runtime web
con el flujo completo del wizard en verde y 0 errores de consola. Commit `f8043f8`.

**[x] CLN — `AppNavigationBar` extraído de `App.tsx` (P1, 2026-11-20).** La barra "Volver / Panel"
del área principal era el último bloque inline de navegación del God Component. Nuevo
`src/components/AppNavigationBar.tsx` con props tipadas (`onBack`/`onHome`), tests propios
(`appNavigationBar.test.tsx`, 3) y `App.tsx` 945 → 925 líneas. Validaciones: typecheck 0, lint OK,
build OK, vitest 506/506 (56 archivos), audit:orphans 13. Commit `e4d5dee`.

**[x] CLN — `buildDashboardStats` extraído del dashboard (P1, 2026-11-20).** El objeto `stats` del
tab `dashboard` era un bloque inline de ~24 líneas que mezclaba tres fuentes (manifiesto de gramática,
léxico activo y entradas incompletas) con el render. Nuevo `src/utils/dashboardStats.ts` con el tipo
`DashboardStats` (importado por `LanguageHomeCanvas`, antes duplicado inline), `DashboardStatsInput` y
`buildDashboardStats({ grammar, lexicon, incompleteCount })`; las métricas derivan de
`getGrammarMetrics` (canon canónico, nunca `NaN`). Tests nuevos: `dashboardStats.test.ts` (4).
`App.tsx` 925 → 906 líneas. Validaciones: typecheck 0, lint OK, build OK, vitest 510/510 (57 archivos),
audit:orphans 13. Commit `357744d`.

**[x] v3.14 FASE EX — exportador real de léxico + dropdown unido a Settings (2026-11-20).** El
gauntlet v3.14 detectó que `SettingsModal` ofrecía `xlsx`/`docx` sin exportador, que `md` tampoco
tenía exportador, que el dropdown de `FileControls` estaba hardcodeado a CSV/JSON y que
`handleFileExport` construía el contenido inline. Nuevo `src/utils/lexiconExport.ts` con los cuatro
formatos reales (`json`/`csv`/`md`/`txt`), TXT con cabecera (léxico/idioma/fecha) y MD con tabla;
`FileControls`/`AppToolbar` reciben `exportFormats`; `SettingsModal` persiste los formatos y
`saveSessionCache` fusiona con el cache previo (antes pisaba `activeTab`/`projectPath`). `App.tsx`
hidrata `exportPath`/`exportFormats` del cache. Tests `lexiconExport.test.ts` (12). Validaciones:
typecheck 0, lint OK, build OK, vitest 522/522 (58 archivos), audit:orphans 13. Commit `919fee1`.

**[x] v3.14 FASE CMP — comparación y merge de léxicos (2026-11-20).** Nuevo
`src/components/LexiconCompareModal.tsx` + `src/utils/lexiconCompareFile.ts`: compara el léxico activo
contra otro léxico guardado o contra un archivo (backup JSON, JSON de filas o CSV con mapeo
automático de columnas), muestra faltantes en cada lado y diferencias campo a campo, y fusiona
"todas las faltantes" o solo las seleccionadas. Cableado desde `LexiconToolsModal` → `ModalManager`;
`useLexicon` expone `updateActiveLexiconEntries` para el merge. Tests: `lexiconCompareFile.test.ts`
(7) y `lexiconCompareModal.test.tsx` (5). Validaciones: typecheck 0, lint OK, build OK, vitest
534/534 (60 archivos), audit:orphans 13. Commit `db9587d`.

**[x] v3.14 FASE NAV — paso rápido Workbench ↔ Léxico (2026-11-20).** `LexiconTable` y
`WorkbenchTab` quedan siempre montados (se ocultan con `hidden` + `aria-hidden`) y un botón
"Ir al Léxico" / "Ir al Workbench" alterna entre ellos sin perder el borrador del `EntryEditor`
ni el término de búsqueda. E2E `tests-gui/workbench-lexicon-jump.spec.ts`. Validaciones:
typecheck 0, lint OK, build OK, vitest 537/537 (60 archivos), audit:orphans 13, `test:gui` 8/8.
Commit `719a33c`.

**[x] v3.14 FASE FX — extracción fonológica del léxico (2026-11-20).** Botón "Extraer del
léxico" en `GrammarPhonologyPanel`: infiere consonantes, vocales, estructuras silábicas, clusters y
`maxConsonantClusters` de las formas superficiales del léxico activo y los fusiona con la fonología
actual por unión de conjuntos (reintentar NO duplica). Nuevo modelo puro
`src/utils/phonologyExtraction.ts` (con evidencia por frecuencia) y helpers exportados desde
`services/grammar/phonology.ts` (`segmentWordGraphemes`, `syllabifyGraphemes`,
`syllableStructureOf`). Tests: `phonologyExtraction.test.ts` (15) y
`grammarPhonologyPanel.test.tsx` (3). Validaciones: typecheck 0, lint OK, build OK, vitest
554/554 (62 archivos), audit:orphans 13, smoke runtime web con 0 errores de consola y extracción
doble sin duplicados. Commit `094eee9`.

**[x] v3.14 FASE MY — extracción morfológica con evidencia por regla (2026-11-20).** Botón
"Extraer del léxico" en `GrammarMorphologyPanel`: infiere afijos de los pares `Raíz` → `Léxema`
con umbral por frecuencia y fusiona por `affixInventoryKey` (reintentar NO duplica). Cada afijo
inferido lleva `evidence` (pares base → forma, hasta 5) y se muestra en la UI. Nuevo modelo puro
`src/utils/morphologyExtraction.ts` + `GrammarAffix.evidence?` y `MorphologyPairEvidence`/
`MorphologyRuleEvidence` en `src/types.ts`. Tests: `morphologyExtraction.test.ts` y
`grammarMorphologyPanel.test.tsx`. Validaciones: typecheck 0, lint OK, build OK, vitest 573/573
(64 archivos), audit:orphans 13. Commit `a5f5c3a`.

**[x] v3.14 FASE FLU — léxico/gramática primero, sin modal fonológico (2026-11-20).** El checklist
demo ítem 8 pedía que un proyecto nuevo "empiece por léxico, no por fonología". Se eliminó el
auto-open de `GrammarWizard` con manifiesto "first run" (antes el asistente exigía elegir un perfil
con fonología antes de existir entradas) y se sustituyó por un banner NO bloqueante en
`GrammarOverview` (`isFirstRun`/`onOpenWizard`) que explica que la fonología/morfología se extraen
del léxico y ofrece el asistente como acción opcional; el header del tab ya tenía su propio botón.
Tests: `grammarOverview.test.tsx` (4). Validaciones: typecheck 0, lint OK, build OK, vitest 577/577
(65 archivos), audit:orphans 13, `npm run test:gui` 8/8. Commit `9921103`.

**[ ] v3.14 FASE D — checklist demo (lo ejecuta el usuario, NO el agente).** 8 ítems en
`docs/gauntlets/GAUNTLET_v3.14.md` (MD/TXT en Settings, exportable legible, diff/merge, extracción
de fonología y morfología, salto Workbench↔Léxico, arranque por léxico). Pendiente: `git push` + CI
con número de run (requiere autorización).

**[x] CLN — frente siguiente del God Component (P1).** Resuelto en dos pasadas: el bloque de
bienvenida + wizard salio a `AppWelcomeLayer` (`267a27e`) y el modelo de completitud del lexico +
limpieza de estado muerto (`3b85470`). `App.tsx`: 762 a 746 lineas.

**[x] CLN — higiene de código muerto y puerta de calidad (2026-11-20).** Cerrado el árbol de
trabajo sucio: `tests-gui/flow.spec.ts` arrastraba un `type Page` sin uso y `App.tsx` conservaba
el estado `showHomePanel` (declarado en el rediseño del dashboard, nunca consumido; ni el valor
ni el setter se referencian en `src/`). Además, el CI no ejecutaba `npm run lint` pese a que el
Bloque G2 lo exige como puerta de calidad; ahora el workflow lo corre entre typecheck y vitest.
Validaciones: typecheck 0, lint OK, build OK, vitest 503/503 (55 archivos), audit:orphans 13,
smoke runtime web con 0 errores de consola. Commits `be22301` y `a03e57a`.

**[x] CLN — el Sound Change Workbench persiste el lote en el léxico (2026-11-20).** El botón
"Aplicar al léxico" ejecutaba las reglas sobre un snapshot interno y descartaba el resultado:
`onApplyBatch` era opcional y `ToolsTab` no lo cableaba (la prop no existía en `ToolsTabProps`).
Ahora es requerida de punta a punta, `useAppHandlers.handleApplySoundChangeBatch` persiste las
entradas en el léxico activo vía `updateActiveLexicon` (marca dirty) y notifica el conteo. Nuevo
E2E `tests-gui/sound-change.spec.ts` (crear léxico → registrar `pata` → previsualizar `phada` →
aplicar → el lexema transformado aparece en la tabla). Validaciones: typecheck 0, lint OK, vitest
503/503, audit:orphans 13, `test:gui` 7/7. Ojo: el importador es un chunk lazy de 348 kB y con 4
workers su aparición supera los 10s por defecto; el spec ya usa `timeout: 30000`.

**[x] CLN — E2E del importador de gramática + notificaciones reales (2026-11-20).** El spec
`grammar-import.spec.ts` (trabajo cortado de una sesión previa) fallaba en el toast de guardado:
`GrammarTabModals.tsx` pasó `showNotification={() => {}}` al importador, un no-op que tragaba
éxito/errores/"análisis completado". Se propagó la `showNotification` real de `App` → `GrammarTab`
→ `GrammarTabModals` → `GrammarImporterModal` (`d10e3e6`); `createLexiconFromSelector` pasó a
`tests-gui/helpers.ts` y el nuevo spec cubre crear léxico → importador → analizar offline → SOV →
guardar (`8c4fc07`). Validaciones: typecheck 0, lint OK, vitest 503/503, audit:orphans 13,
test:gui 6/6. Ojo: con Vite frío los specs pueden dar timeout de 60s en el lazy chunk; con el
servidor caliente son 6/6.

**[x] CLN — suite E2E Playwright en verde (2026-11-20).** El wizard de onboarding
(`FirstRunWizard`, overlay `fixed inset-0 z-[100]`) dejó al arranque de la app distinto al que
asumían los specs: `palette-drag.spec.ts` tenía un `enterDashboard` local que no lo descartaba y el
overlay interceptaba los clics; `smoke.spec.ts` resolvía "Crear Nuevo Léxico" a dos botones; y
`flow.spec.ts` creaba el léxico por una vía inexistente (el selector de léxico abre un inline cuyo
`onCreate` es `handleCreateNewLexicon`, que a su vez abre el modal). Nuevo helper único en
`tests-gui/helpers.ts` (`enterWelcome`/`dismissProjectBootstrap`/`enterDashboard`/`sidebarButton`)
y los tres specs alineados. `npm run test:gui` 5/5. Commit `bfc6018`.

**[x] CLN — el objeto del preview ya no repite al sujeto (2026-11-19).** `getDefaultPreviewEntries`
(`src/utils/grammarPreview.ts`) resolvía el objeto con `entry.ID !== byId(preview?.objectEntryId)?.ID`;
como `preview.objectEntryId` está vacío en el flujo por defecto, `byId(...)` devolvía `undefined` y
la comparación era siempre `true`: el objeto de la cláusula quedaba igual al sujeto (el fallback
`lexicon[2]` confirmaba la intención). Ahora el sujeto y el verbo se resuelven una sola vez y el
objeto excluye ambas entradas, con fallback a la primera entrada libre. Tests nuevos:
`src/utils/__tests__/grammarPreview.test.ts` (15). Validaciones: typecheck 0, lint OK, build OK,
vitest 445/445 (50 archivos), audit:orphans 20.

**[x] CLN — el schema Zod de `preview` conserva las entradas fijadas (2026-11-19).**
`GrammarManifestSchema` (`src/services/normalize.ts:92`) definía `preview` como
`z.object({ useLexiconAffixes })` y Zod descartaba las claves desconocidas:
`subjectEntryId`/`verbEntryId`/`objectEntryId`, que escribe `GrammarSyntaxPanel.tsx:167` vía
`onUpdatePreview`, se perdían al recargar el lexicón (`useLexicon.ts:120` normaliza el manifiesto).
Ahora el schema los declara como `z.string().optional()` y `normalizePreview.test.ts` (4) cubre la
preservación y el round-trip por `normalizeLexiconData`. Validaciones: typecheck 0, lint OK, build OK,
vitest 449/449 (51 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `EntryEditor.tsx` (P1, 2026-11-19).** Era el último God
Component grande pendiente. Nuevo `src/utils/entryEditorModel.ts` con tipos (`GenerationModeOption`,
`EntryEditorFormData`, `EntryBaseData`, `AiEntryResult`, `EntryEditorInitialData`, `InitialFormState`,
`EntryEditorActionState`, `EntryEditorFormPayload`), constantes (`generationModeOptions`,
`EMPTY_FORM_DATA`) y lógica pura (`isEntryComplete`, `getActiveModeDescription`,
`findDuplicateSignificados`/`findDuplicateRaices`/`findDuplicateLexemas`, `splitLexemas`,
`resolveNewCategory`, `pickNormalizedField`, `mapAiEntryResult`, `buildEntryBaseData`,
`toggleGenerationMode`, `isActionDisabled`, `isAiButtonDisabled`, `buildInitialFormState`,
`getErrorMessage`). `EntryEditor.tsx` quedó en 396 líneas como orquestador de estado UI + render; se
eliminaron los props muertos `findDuplicateSignificados`/`onDuplicateFound` y el estado muerto
`duplicateEntries`. Tests nuevos: `entryEditorModel.test.ts` (25). Validaciones: typecheck 0, lint OK,
build OK, vitest 474/474 (52 archivos), audit:orphans 20.

**[x] CLN — extraer el modelo puro de `LexiconTable.tsx` (693 líneas, 2026-11-19).** Último
componente de tabla grande: mezclaba filtrado/ordenamiento/búsqueda, selección múltiple, paginación,
formato de afijos y edición en línea con render. Nuevo `src/utils/lexiconTableModel.ts` con
constantes (`ITEMS_PER_PAGE`, `DEFAULT_VISIBLE_COLUMNS`, `INCOMPLETE_CATEGORY_CANONICAL`,
`CATEGORY_PALETTE`), lógica pura (`normalizeText`, `isEntryIncomplete`, `getCategoryColor`,
`getUniqueCategories`, `filterLexiconData`, `getTotalPages`, `paginateEntries`,
`formatLexemeDisplay`, `splitCommaSeparated`, `applyEditFormChange`) y el tipo
`LexiconFilterOptions`. `LexiconTable.tsx` quedó en 603 líneas como orquestador de estado UI +
render y re-exporta los símbolos del modelo; el cast `as keyof Omit<LexiconEntry, ...>` fue
reemplazado por ramas tipadas. Tests nuevos: `lexiconTableModel.test.ts` (20). Validaciones:
typecheck 0, lint OK, build OK, vitest 494/494 (53 archivos), audit:orphans 20. Cierra el P1 de God
Components.

**[x] CLN — validación runtime web (2026-11-20).** La suite Playwright (`npm run test:gui`) quedó
5/5 en verde tras alinear los tres specs al arranque real (wizard de onboarding → bienvenida → capa
de ubicación de proyecto). `flow.spec.ts` cubre el flujo completo con un léxico creado: crear
léxico → registrar `bask/boskel` → buscarlo en FTS → glosarlo (`SUSTANTIVO`), sin errores de
consola. Commit `bfc6018`. Pendiente: la demo `npm run tauri dev` (GUI nativa) y el push + CI.

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

**[x] CLN — estado presentacional derivado a `useAppDerivedState` (P1, 2026-11-22).** Los cuatro
`useMemo` inline del cuerpo de `App.tsx` (`grammarMetrics`, `pragmaticEngine`, `completionStats`,
`entryBeingEdited`) salieron a `src/utils/appDerivedState.ts` (`deriveAppState`,
`buildPragmaticEngineSummary`, tipo `PragmaticEngineSummary`) y `src/hooks/useAppDerivedState.ts`.
El resumen pragmático es un subconjunto presentacional, no `PragmaticEngineState`; `typologyLabel`
sigue derivándose de `morphologyToTypologyProfile` y `rulesCount` reutiliza `getGrammarMetrics`.
`App.tsx` quedó en 672 líneas. Tests nuevos: `appDerivedState.test.ts` (10) y
`useAppDerivedState.test.tsx` (4). Validaciones: typecheck 0, lint OK, build OK, vitest 770/770
(91 archivos), audit:orphans 13, `npm run test:gui` 8/8 (1 worker, dev server caliente).
Commit `f536f27`.

**[x] CLN — empujar el trabajo local y cerrar CI (2026-11-26).**
Sin commits locales sin publicar (`git rev-list --count origin/master..master` = 0). Último push
`d6e653d..0d6f443`; CI run `45816750895` attempt 1 `success` (head `0d6f443`). El requisito de
push + CI de la Fase J del GAUNTLET v3.12 queda satisfecho; su demo sigue pendiente del usuario.

**[ ] CLN — decidir destino de los 13 huérfanos de `src/`.** Inventario reproducible con
`npm run audit:orphans` (creado en `aeea62a`; baseline después de `e26145c`). Ya borrados en
`e26145c`: 7 triviales sin uso. Quedan 13: 8 features completas nunca montadas (`InflectionModal`,
`InflectionView`, `WritingWorkshop`, `CategoryManagerModal`, `LexiconAuditPanel`,
`CompletionDashboard`, `GrammarGuidedTour`, `AiStatusIndicator`, `Button`, `TabButton` son los
candidatos de producto), `strategyBridge`/`typologyProfile` (con tests propios, no borrar sin
re-cablear), `jsonWorker` (implementado, no cableable por CSP de Tauri). Ver checkpoint en
`docs/continuity/TASKS.md`.

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
  - Próximo paso real: `LexiconTable` (693); `EntryEditor` (494 → 396), `GrammarTab` (484) y
    `SyntaxCanvas` (484) ya fueron extraídos a `src/utils/entryEditorModel.ts`,
    `src/utils/grammarTabModel.ts` y `src/utils/syntaxCanvasModel.ts`; `GraphCanvas.tsx` y
    `CollectionsManager.tsx` ya fueron extraídos a `src/utils/graphCanvasModel.ts` y
    `src/utils/collectionsManagerModel.ts`.

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
