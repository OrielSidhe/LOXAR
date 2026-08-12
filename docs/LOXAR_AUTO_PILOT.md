# LOXAR AUTO-PILOT
**Objetivo:** avanzar continuamente hacia una app de conlang 100% funcional, sin intervención humana por cada paso.
**Criterio de éxito:** un flujo real de usuario funciona de punta a punta sin crashes.

---

## Estado actual
- Repo limpio, artefactos en `_ARTIFACTS_NO_GIT/`, build/typecheck OK
- `tauri:dev` y `tauri:build` funcionando (Vite + Tauri 2.11.1 alineados)
- Git inicializado y con commits; último commit `0402834`
- Persistencia: SQLite con transacciones, backup `.bak`, `schemaVersion`, FTS5 y Web Worker
- Traducción real: `InterlinearGlossViewer` integrado en UI
- Gramatización real: motor M1-M8 implementado, tests pasando, `GrammarImporterModal` y `SyntaxCanvas` cableados a `inductFromText`
- Herramientas UI: `InterlinearGlossViewer`, `SoundChangeWorkbench`, `NeographyText` integrados en `App.tsx`
- CI/CD: GitHub Actions workflow para Windows

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

### Bloque F: Validación runtime + pulido (próximo en ejecutar)
- [ ] F1. Validar en runtime `npm run tauri:dev` que FTS5 search, InterlinearGlossViewer y SoundChangeWorkbench funcionan sin crashes
- [ ] F2. Añadir feedback visual de búsqueda FTS5 (loading/empty/result count) en `LexiconTable`
- [ ] F3. Añadir ejemplo precargado en `InterlinearGlossViewer` para demostración inmediata
- [ ] F4. Añadir ejemplo precargado en `SoundChangeWorkbench` para demostración inmediata
- [ ] F5. Verificar que `GrammarImporterModal` muestra `ImportValidationReport` correctamente tras importar gramática de ejemplo

### Bloque G: Estabilidad y QA (siguiente)
- [ ] G1. Ejecutar suite completa de tests y reportar cobertura actual
- [ ] G2. Correr `npm run lint` + `npm run typecheck` + `npm run build` en CI local y corregir cualquier regresión
- [ ] G3. Probar flujo completo: crear lexicón → agregar palabras → buscar por FTS5 → glosar interlineal → aplicar sound change → guardar

---

## Reglas de ejecución
1. No pedir aprobación para bloques A-D sin riesgo de pérdida de datos
2. Cada tarea terminada = commit + criterio de aceptación verificado
3. Si un bloque requiere decisión de producto, pausar y reportar; si no, seguir
4. No hacer investigación sin implementación paralela
5. El usuario NO debe tener que preguntar "cómo vas"; el estado se reporta solo por cambios concretos

---

## Próxima tarea activa
**Bloque F — Validación runtime + pulido**
- F1. Validar runtime de FTS5, InterlinearGlossViewer y SoundChangeWorkbench
- F2. Feedback visual de búsqueda FTS5 en `LexiconTable`
- F3-F5. Ejemplos precargados y validación de `GrammarImporterModal`

---
