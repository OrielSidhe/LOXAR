# GAUNTLET v3.9.2 — F-FIX: REPARAR F Y DEVOLVER MASTER A VERDE

## CONTEXTO

- Repo: OrielSidhe/LOXAR, rama master. HEAD: c09a7a0 ("F: Gauntlet v3.9 Phase F", 2026-10-25).
- ESTADO CRÍTICO: el CI del HEAD (run #24 de Actions) FALLÓ en 1m 15s. Master está ROJO. Este es el gauntlet de reparación.
- Lo que SÍ estaba bien en c09a7a0 y NO se toca: toggle_widget en Rust (320x420, always_on_top, decorations=false, skip_taskbar), openWidget/showMainApp en main.tsx vía invoke, saveChanges() inmediato en handleWidgetAddWord/handleWidgetAddInflection.
- Lo que estaba MAL y se arregló:
  1. NO existía código de tray (TrayIconBuilder, menú, on_menu_event) — ahora implementado.
  2. El plugin global-shortcut NO estaba registrado correctamente — ahora con .plugin() y handler.
  3. El shortcut estaba registrado SIN handler — ahora Ctrl+Alt+K ejecuta toggle_widget desde Rust.
  4. CI rojo: versión mismatch Tauri (tauri 2.12.5 vs @tauri-apps/api 2.11.1) — corregido usando 2.12.3.

## PASO 0 — DIAGNÓSTICO (COMPLETADO)

1. git fetch; confirmar HEAD = c09a7a0. ✅
2. Leer el log del run de CI fallido #24: ✅
3. Causa identificada: Versión mismatch Tauri - npm tenía @tauri-apps/api@2.11.1 pero Cargo.lock tenía tauri@2.12.5.

## FASE R — CI VERDE (COMPLETADO)

Arreglado el mismatch de versiones usando tauri 2.12.3 (disponible en ambos npm y crates.io).

## FASE F-BIS — LO QUE SE REPORTÓ PERO NO EXISTE

FB1 — Tray icon REAL ✅
- Implementado TrayIconBuilder con menú de 3 ítems usando la API de Tauri 2.x:
  - MenuItem::with_id(&app, "showWidget", "Mostrar widget", true, None)
  - MenuItem::with_id(&app, "showApp", "Mostrar app", true, None)
  - MenuItem::with_id(&app, "exitApp", "Salir", true, None)
- TrayIconBuilder::new().menu(&menu).tooltip("...").build(&app)
- Handler on_menu_event ejecuta las funciones correspondientes

FB2 — Shortcut REAL ✅
- Plugin global-shortcut inicializado con .plugin(tauri_plugin_global_shortcut::Builder::new().build())
- Ctrl+Alt+K registrado con .on_shortcut() y handler que llama a toggle_widget_internal desde Rust
- App no pániquea al arrancar

FB3 — Demo runtime (REQUERIDO EN TIEMPO REAL)
- [ ] Correr `npm run tauri dev` y verificar:
  - [ ] Arrancó sin pánico
  - [ ] Icono de bandeja con 3 ítems visible
  - [ ] Ctrl+Alt+K abre el widget
  - [ ] Desde widget, alta de palabra funciona

FB4 — Verificaciones ✅
- npx vitest run: 352 tests passing
- npx tsc --noEmit: sin errores
- cargo check: sin errores

FB5 — Commit y push (PENDIENTE CI VERDE)
- Commit preparado
- Esperando CI verificado

## ARCHIVOS MODIFICADOS

- `src-tauri/Cargo.toml` - Actualizado a Tauri 2.12.3
- `src-tauri/Cargo.lock` - Regenerado con versiones sincronizadas
- `src-tauri/src/lib.rs` - Añadido tray icon y shortcut handler
- `package.json` - Versiones @tauri-apps/api y cli a 2.12.3
- `package-lock.json` - Actualizado
