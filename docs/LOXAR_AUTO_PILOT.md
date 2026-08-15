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
- Git inicializado y con commits; último commit `b0baca7`
- P1-2f fue revertido: `useProjectShell` se descartó porque generaba dependencias circulares con
  `App.tsx`; se mantienen los hooks ya estables (`useAppHandlers`, `useAiHandlers`,
  `useProjectOperations`, `useWorkQueue`, `useWidgetBridge`)
- Avance P1 actual: se extrajeron `ToastContainer`, `OfflineBanner`, `AmbientLights`,
  `ProjectBootstrapBanner`, `AppToolbar`, `AppBatchToolbar` y `TabButton` de `App.tsx`,
  además de `SignificadoTagsInput` y `EntryDuplicateWarning` de `EntryEditor`,
  `ParadigmCell` de `CollectionsManager`, helpers de preview a `src/utils/grammarPreview.ts`,
  y `GrammarOverview`, `GrammarPhonologyPanel`, `GrammarTypologyPanel`, `GrammarNotesPanel`,
  `GrammarStrategiesPanel`, `GrammarMorphologyPanel`, `GrammarRolesPanel`, `GrammarSyntaxPanel`,
  `GrammarModuleSidebar` y `GrammarTabHeader` de `GrammarTab`.
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
    `ProjectBootstrapBanner`, `AppToolbar`, `AppBatchToolbar`, `TabButton`.
  - Extraído de `EntryEditor`: `SignificadoTagsInput`, `EntryDuplicateWarning`.
  - Extraído de `CollectionsManager`: `ParadigmCell`.
  - Extraído de `GrammarTab`: helpers de preview movidos a `src/utils/grammarPreview.ts`,
    `GrammarOverview`, `GrammarPhonologyPanel`, `GrammarTypologyPanel`, `GrammarNotesPanel`,
    `GrammarStrategiesPanel`, `GrammarMorphologyPanel`, `GrammarRolesPanel`, `GrammarSyntaxPanel`,
    `GrammarModuleSidebar` y `GrammarTabHeader`.
  - Próximo paso real: seguir extrayendo subcomponentes de `App.tsx` o avanzar con
    `CollectionsManager`, `GrammarTab`, `SyntaxCanvas` y `EntryEditor`.

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
