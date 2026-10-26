# GAUNTLET v3.10 — "LA APP REAL"

## CONTEXTO

- **Repo**: OrielSidhe/LOXAR, rama master. HEAD: a2decfa (CI #28 verde, ~8 min por run).
- **v3.9 completa** a nivel código. El usuario corrió la app REAL (`npm run tauri dev`) y reportó bugs verificados.
- **Stack**: Tauri 2.12.3 sincronizado, React 18 + TS, vitest, zustand, importStore (E1) con jobs fuera del modal, surfacing de errores HTTP con body (X1), AiSettingsModal existente.

## PRINCIPIO REECTOR

> NADA se pierde en el camino: ni datos, ni trabajo de IA, ni visibilidad. Un trabajo que corre sin que el usuario pueda verlo, pausarlo o cancelarlo, ES un trabajo perdido.

## REGLAS DURAS

1. **ANTI-AMNESIA**: Fase 0 commitea este spec en `docs/gauntlets/GAUNTLET_v3.10.md`. Si pierdes contexto, relee ese archivo y continúa según origin/master.
2. **VÁLVULA "NO LO SÉ"**: Si algo no está aquí, dilo y espera. PROHIBIDO inventar.
3. **DEMO RUNTIME POR FASE**: Cada fase termina con la app corriendo (`npm run tauri dev`) y reportando LO QUE VISTE, no lo que esperas. Un CI verde no sustituye la demo.
4. **CI VERDE O NO ES TERMINADO**: commit + push + run de CI esperado y verificado con número.

---

## ORDEN ESTRICTO: 0 → P → W → V → J → C

---

## FASE 0 — SPEC EN REPO

Crear `docs/gauntlets/GAUNTLET_v3.10.md` con este texto completo. Commit "0: Gauntlet v3.10 spec". Push + CI verde.

---

## FASE P — PERMISOS (causa raíz verificada en repo)

El archivo `src-tauri/capabilities/default.json` tiene dos huecos:

- **P1** — Falta `"sql:allow-execute"`: el plugin SQL de Tauri 2 NO incluye execute en `sql:default` (el usuario vio: "Failed to init pragmatic DB: sql.execute not allowed... sql:allow-execute" y "Failed to hydrate lexicons from SQLite"). Añádelo (y `sql:allow-select` si el log lo pide al correr).
- **P2** — `"windows": ["main"]` deja la ventana "widget" SIN NINGÚN permiso. Añade la ventana "widget" con los permisos mínimos que necesite (`core:default` + `event` si `widget.tsx` usa emit/listen).

### Criterio de aceptación

- App corriendo con CERO errores de permisos en consola
- Hydrate de SQLite exitoso
- Dar de alta una palabra → reiniciar app → la palabra sigue ahí

### Commit

`"P: Gauntlet v3.10 — capabilities sql + ventana widget"`

### Push + CI verde + demo runtime

(Adjuntar log limpio)

---

## FASE W — WIZARD (bug reportado por el usuario)

**Bug**: en la pantalla de primera ejecución, "Configurar ahora" NO hace nada: manda directo a la bienvenida sin abrir settings.

- **W1** — "Configurar ahora" debe ABRIR el AiSettingsModal EXISTENTE (prohibido crear un segundo modal). El wizard espera a que el usuario cierre el modal.
- **W2** — El flag de onboarding solo se marca cuando el usuario completa la decisión: cerró el modal tras configurar, o eligió "Más tarde".
- **W3** — "Más tarde" muestra la advertencia "Sin IA configurada, algunas funciones de análisis profundo podrían ser poco precisas" con acceso posterior a settings.

### Criterio

- Primera ejecución → Configurar ahora → modal de settings visible; completar o cerrar → wizard termina y NO reaparece

### Demo runtime paso a paso

---

## FASE V — VENTANA WIDGET BLANCA (bug reportado por el usuario)

**Síntoma**: el botón de la barra superior abre una ventana 320x420 BLANCA que no se puede mover. (El FloatingWidget in-app del botón circular SÍ funciona — no lo toques.)

**Datos ya verificados**: `widget.html` EXISTE y está como input de build en `vite.config.ts` — NO es un 404. Es un error runtime.

- **V1** — Diagnóstico primero: abre devtools de la ventana widget y reporta el error JS exacto. Hipótesis a verificar (no asumas): (a) `widget.tsx` usa `window.loxarBridge`, que SOLO se define en `main.tsx` cargado desde `index.html` — en la ventana widget no existe; (b) falta de permisos de la ventana widget (se arregló en Fase P — verifica).
- **V2** — Arreglo: el widget no debe depender del bridge de la ventana principal. Usa `@tauri-apps/api` directo o un mini-bridge propio del `widget.tsx`. La ventana debe renderizar la UI del widget (búsqueda + captura de portapapeles + alta).
- **V3** — Movilidad: sin decorations no se puede arrastrar; añade `data-tauri-drag-region` en el header del widget para poder mover la ventana.

### Criterio

- Botón de arriba → ventana con UI visible, arrastrable, Ctrl+Alt+K la togglea

### Demo runtime con lo que viste (incluido el error JS que encontraste en V1)

---

## FASE J — TRABAJO IA VISIBLE (bug + feature pedida por el usuario)

**Bug**: análisis de gramática sin AI configurada se cuelga en "chunk 1" para siempre: sin aviso, sin cancelar, sin progreso, sin log.

- **J1** — PRE-FLIGHT: al iniciar un análisis de gramática SIN proveedor IA configurado/key válida, NO arrancar el trabajo: mensaje claro "No hay IA configurada" con botón que abre el AiSettingsModal.
- **J2** — CANCELAR: botón Cancelar visible mientras el trabajo corre: aborta de verdad (`AbortController` del fetch), deja el estado consistente (job marcado cancelado, no "corriendo" para siempre) y se puede relanzar después.
- **J3** — BANNER SIMPLE (elección del usuario, NO un visor completo): en la pantalla principal, un banner visible SIEMPRE que haya un trabajo IA activo: estado (Analizando chunk X de Y / Completado / Fallido con el error superficiado de X1 — status + body), reutilizando el importStore de zustand. El banner no bloquea la navegación.

### Criterio

- Sin AI → ya no se cuelga en chunk 1
- Cancelar → estado limpio y relanzable
- Con key inválida → banner muestra el error con body

### Demo runtime de los tres casos

---

## FASE C — COSMÉTICA VERIFICADA

- **C1** — Título: reemplaza en TODAS las apariciones (grep "Tu sistema avanzado para la construcción de léxicos artificiales") por: "Tu sistema avanzado para la construcción de lenguas". Sin placeholder: exactamente ese texto.
- **C2** — Warning React NaN: `ModuleNodeComponent` (GraphCanvas.tsx ~línea 377) recibe una stat undefined/NaN y la renderiza como children de un span. Guarda con `Number.isFinite` y fallback limpio (0 o guón), no rompas el render.
- **C3** — Warnings de form fields sin id/name: añade ids/names a los inputs señalados por el navegador (busca los tres nodos del warning).

### Criterio

- Consola sin el warning NaN
- Título nuevo visible en la app
- Tests verdes

---

## PROTOCOLO DE REPORTE (por fase)

1. Evidencia file:line + salidas de `npx vitest run`, `npx tsc --noEmit`, `cargo check`.
2. Demo runtime por fase: qué corriste, qué viste. Si algo falla en runtime, repórtalo COMO FALLO, no lo maquilles.
3. Commit por fase, push verificado, CI verde con número de run ANTES de declarar terminada la fase.
4. Válvula "NO LO SÉ" activa siempre.
5. Reporte final: tabla 0/P/W/V/J/C con commit, run de CI, y resultado real de la demo runtime.

---

## LISTA DE VERIFICACIÓN

- [ ] Fase 0: spec en `docs/gauntlets/GAUNTLET_v3.10.md`
- [ ] Fase P: sql:allow-execute + ventana widget en capabilities; consola sin errores de permisos; palabra persiste tras reinicio
- [ ] Fase W: Configurar ahora abre AiSettingsModal; wizard no reaparece
- [ ] Fase V: ventana widget con UI visible, arrastrable, error JS de V1 reportado
- [ ] Fase J: pre-flight sin AI; cancelar funcional; banner simple con estado y errores con body
- [ ] Fase C: título nuevo exacto; sin warning NaN; form ids
- [ ] Todas las fases: push + CI verde verificado + demo runtime descrita