# LOXAR AUTO-PILOT
**Objetivo:** avanzar continuamente hacia una app de conlang 100% funcional, sin intervención humana por cada paso.
**Criterio de éxito:** un flujo real de usuario funciona de punta a punta sin crashes.

---

## Estado actual
- Repo limpio, artefactos en `_ARTIFACTS_NO_GIT/`, build/typecheck OK
- `tauri:dev` reparado (Vite + Tauri alineados)
- Git: NO inicializado todavía
- Persistencia: funciona pero SIN transacciones, SIN backup `.bak`, SIN `schemaVersion`
- Traducción real: NO existe
- Gramatización real: PARCIAL (motor determinista, pero sin glosas Leipzig ni sound changer)

---

## Cola de ejecución (modo auto)
Cada elemento tiene criterio de aceptación binario: hecho o no hecho.

### Bloque A: Cimientos (URGENTE, sin aprobación)
- [ ] A1. Inicializar git + commit inicial + tag `v0.1.0`
- [ ] A2. Implementar `schemaVersion` en `LexiconData`
- [ ] A3. Crear `src/services/schemaMigrations.ts` con pipeline de migraciones
- [ ] A4. Implementar backup `.bak` automático pre-escritura en `sqlStorage.ts`
- [ ] A5. Cerrar runtime `tauri:dev` confirmado por el usuario

### Bloque B: Traducción real
- [ ] B1. `src/services/interlinearGlossService.ts` (segmentación morfémica + glosas Leipzig)
- [ ] B2. `src/components/InterlinearGlossViewer.tsx`
- [ ] B3. Mejorar `TranslationPlayground.tsx` con pipeline grounded + confianza

### Bloque C: Gramática avanzada
- [ ] C1. `src/services/soundChanger.ts`
- [ ] C2. `src/components/SoundChangeWorkbench.tsx`
- [ ] C3. `src/components/NeographyText.tsx` (render dinámico de glifos)

### Bloque D: Performance y escala
- [ ] D1. FTS5 en SQLite para búsqueda full-text
- [ ] D2. Web Worker para `JSON.stringify` de léxicos grandes
- [ ] D3. Transacciones SQLite + escritura atómica en Rust

### Bloque E: Release
- [ ] E1. `tauri build` + installer
- [ ] E2. Documentación de usuario final
- [ ] E3. CI/CD básico

---

## Reglas de ejecución
1. No pedir aprobación para bloques A-D sin riesgo de pérdida de datos
2. Cada tarea terminada = commit + criterio de aceptación verificado
3. Si un bloque requiere decisión de producto, pausar y reportar; si no, seguir
4. No hacer investigación sin implementación paralela
5. El usuario NO debe tener que preguntar "cómo vas"; el estado se reporta solo por cambios concretos

---

## Próxima tarea activa
**A1. Inicializar git + commit inicial + tag `v0.1.0`**
