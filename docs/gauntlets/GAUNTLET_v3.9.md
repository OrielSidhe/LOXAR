# GAUNTLET v3.9 — "LO QUE SE PROMETE, SE CUMPLE"

## CONTEXTO

- Repo: OrielSidhe/LOXAR, rama master. HEAD esperado: 29281f4 (CI verde, runs #14–19 de GitHub Actions, ~7–8 min cada uno).
- Stack: Tauri 2 + React 18 + TypeScript, vitest (environment node, SIN @testing-library), zustand 5, mammoth, papaparse, xlsx, zod, reactflow.
- Ya en master desde v3.8 (SE QUEDA, no lo deshagas):
  - GrammarImporterModal con banner de onboarding IA (commit 234bd2a).
  - FloatingWidget.tsx in-app con dock a bordes + localStorage (commit e412968). Es un COMPLEMENTO, pero NO cumple la Fase F de este gauntlet.
  - SyntaxFlowline.tsx reescrito: bloques por rol desde manifest, preview con realizeClause, persistencia, 17 tests (commit 29281f4). Es la BASE de la Fase G de este gauntlet.
- Modelos vía Nous Portal: base URL https://inference-api.nousresearch.com/v1. Slugs free vigentes (oct 2026): poolside/laguna-s-2.1:free, poolside/laguna-xs-2.1:free, stepfun/step-3.7-flash:free, meituan/longcat-2.5-preview:free, upstage/solar-mini4:free, reflection/beam-1.0-501b-a23b:free.
- Hecho conocido: los modelos free de Nous rechazan con HTTP 400 (invalid_request) los requests que llevan parámetros de reasoning/effort; sin ellos responden 200.

## PRINCIPIO RECTOR

Los nodos del canvas son vistas vivas sobre datos reales; las pantallas son botones dentro de su nodo padre; NADA se pierde en el camino. Ningún dato se descarta al cerrar, minimizar, navegar o fallar.

## REGLA ANTI-AMNESIA (LA MÁS IMPORTANTE DE ESTE GAUNTLET)

En v3.8 perdiste el texto del gauntlet a mitad de sesión e INVENTASTE los specs de tres fases. Eso no se repite:

1. La Fase 0 commitea ESTE documento completo en docs/gauntlets/GAUNTLET_v3.9.md.
2. Si tu contexto se pierde, se reinicia el IDE, o dudas de lo que toca: RELEE docs/gauntlets/GAUNTLET_v3.9.md del repo ANTES de escribir una sola línea.
3. Si un detalle del spec NO está en este documento: di exactamente "NO LO SÉ" y termina tu turno esperando aclaración. PROHIBIDO inventar, inferir o "reconstruir" specs de memoria.

## ORDEN ESTRICTO

0 → X → I → G → F. Cada fase termina en commit + push + CI verde ANTES de empezar la siguiente. Si el CI falla, se arregla antes de avanzar. Este gauntlet tiene EXACTAMENTE 5 fases: 0, X, I, G, F.

## FASE 0 — SPEC EN REPO

Crear docs/gauntlets/GAUNTLET_v3.9.md con el TEXTO COMPLETO de este gauntlet (copiarlo íntegro, sin resumir), para que sobreviva a cualquier reinicio del IDE. Commit con subject "0: Gauntlet v3.9 spec — anti-amnesia", push, CI verde.

## FASE X — DIAG 400 DE NOUS: SUPERFICIAR EL ERROR + EFFORT

X1 — Superficiar el body del error. Hoy un 400 del proveedor llega al usuario como "Bad Request" sin cuerpo. En TODOS los caminos de llamada a IA de la app (aiProviderRegistry, geminiService/callAi, y el llmCall del importador de gramática), cuando el proveedor responde HTTP >= 400, el error visible (toast/log/estado del job) debe incluir: status, endpoint, y el CUERPO de la respuesta truncado a 2000 caracteres. Criterio: mockear un 400 con body conocido y verlo completo en el mensaje final.

X2 — reasoning effort por proveedor. Campo reasoningEffort: 'off' | 'low' | 'medium' | 'high' en la config de proveedor (default 'off'). Al armar el payload para proveedores OpenAI-compatibles: si es 'off', NO incluir NINGUNA key de razonamiento (reasoning, reasoning_effort, thinking, effort ni similar); si es distinto de 'off', enviarla en el formato que espere el proveedor. Persistir en la config y editable en el modal de settings EXISTENTE.

X3 — Tests: (a) mock 400 → el body aparece en el error visible; (b) con effort 'off' el payload serializado NO contiene ninguna key de razonamiento; (c) round-trip de config de proveedor con reasoningEffort.

X4 — Commit con subject "X: Gauntlet v3.9 Phase X — DIAG 400 (surfacing + effort)", push, CI verde.

## FASE I-REAL — WIZARD DE PRIMERA EJECUCIÓN

I1 — Detección de primera ejecución. Flag persistido (p.ej. localStorage "loxar_onboarding_v1_done" o equivalente en app data). Sin flag → wizard al abrir la app. Con flag → nunca más aparece.

I2 — Paso IA. El wizard pregunta "¿Configurar la IA ahora?" con dos botones: "Configurar ahora" → abre el AiSettingsModal EXISTENTE (prohibido crear un segundo modal de settings); "Más tarde" → I3.

I3 — Advertencia. Si "Más tarde": advertencia visible y persistente donde corresponda: "Sin IA configurada, algunas funciones de análisis profundo podrían ser poco precisas", con acción para abrir settings después (el banner v3.8 del importador queda como recordatorio).

I4 — Paso carpeta de datos. En el mismo wizard, un paso muestra/confirma la carpeta de guardado del proyecto: default = app data local del SO; botón "Cambiar" que abre el file dialog de Tauri; la elección se persiste y el mecanismo de guardado la respeta. Si el mecanismo actual no soporta carpeta custom, implementa la redirección mínima posible y documenta en el reporte qué quedó soportado y qué no.

I5 — Cierre e instalación limpia. Marcar el flag al terminar (configure o no). Verificar instalación limpia: datos vacíos → wizard aparece; segunda ejecución → no aparece.

I6 — Tests del flag, la no-reaparición, la advertencia y la persistencia de carpeta (los que se puedan sin DOM). Commit "I: Gauntlet v3.9 Phase I — wizard primera ejecución", push, CI verde.

## FASE G-BIS — LEGO DE MORFEMAS (sobre SyntaxFlowline.tsx existente)

G5 — Piezas con propiedades. Cada pieza, además de rol/lexema, tiene propiedades morfológicas EDITABLES: clic abre un popover con las propiedades aplicables (número, género, persona, tiempo, modo, caso — las que apliquen según el manifiesto). Editar una propiedad actualiza el preview en vivo vía realizeClause.

G6 — Inventario REAL. Las propiedades y sus valores salen del inventario REAL de grammarDb (categorías/valores/afijos declarados en el manifiesto), NO hardcodeadas. Sin manifiesto → fallback a las propiedades mínimas actuales, sin romperse.

G7 — Slots y no-pérdida. La línea expone slots de encaje; arrastrar una pieza FUERA de todo slot la DEVUELVE al inventario (la pieza nunca se destruye: reaparece en la paleta). Criterio manual: arrastrar una pieza fuera → está de vuelta en el inventario.

G8 — Tests: piezas con propiedades desde manifiesto; edición de propiedad cambia el preview (realizeClause con features actualizadas); el handler de drop-fuera devuelve la pieza (lógica testeable sin DOM).

G9 — Commit "G: Gauntlet v3.9 Phase G — Lego de morfemas", push, CI verde.

## FASE F-REAL — WIDGET TAURO ALWAYS-ON-TOP (la F que no se hizo)

Aclaración: FloatingWidget.tsx in-app SE QUEDA, pero NO cumple esta fase. Esta fase es una VENTANA TAURO SECUNDARIA. Extiende el widget.tsx EXISTENTE (ya tiene búsqueda + captura de clipboard + lookup de inflección) y el openWidget existente del backend Tauri — no dupliques.

F1 — Ventana mini. Ventana Tauri secundaria, always-on-top, tamaño compacto (~320x420), decoración mínima.

F2 — Tray icon. Icono en la bandeja del sistema con menú: "Mostrar widget", "Mostrar app", "Salir". Usa el plugin oficial de Tauri 2 para tray (verifica el nombre exacto del plugin en la versión de Tauri del proyecto; si no sabes cuál es, di NO LO SÉ).

F3 — Atajo global. Ctrl+Alt+K togglea el widget aunque la app esté minimizada o el foco esté en otra aplicación (plugin global-shortcut de Tauri 2).

F4 — Alta/búsqueda directa a lexiconDb. Desde el widget se puede dar de alta una palabra y buscar en el lexicon SIN abrir la ventana principal (escritura directa a la DB).

F5 — Criterio DURA de aceptación: con la app MINIMIZADA: Ctrl+Alt+K abre el widget → se da de alta una palabra → restaurar la app → la palabra aparece en el léxico. Si no puedes demostrar esto, la fase NO está terminada. Innegociable.

F6 — Rust + tests. cargo check limpio, npx tsc --noEmit limpio, vitest completo verde; tests de la lógica de bridge/comandos que corran en CI.

F7 — Commit "F: Gauntlet v3.9 Phase F — widget Tauri always-on-top", push, CI verde.

## PROTOCOLO DE REPORTE (por fase)

1. Evidencia file:line + salidas de comandos: npx vitest run, npx tsc --noEmit, y para F además cargo check.
2. Commit por fase, PUSH verificado en origin/master, CI verde ANTES de pasar a la siguiente. Prohibido afirmar "commiteado" sin push.
3. Válvula "NO LO SÉ": si algo no está en este documento, dilo y espera. Nunca inventar.
4. Si pierdes contexto: relee docs/gauntlets/GAUNTLET_v3.9.md y continúa por la fase que toque según los commits ya en origin/master.
5. Reporte final: tabla por fase (0, X, I, G, F) con commit, tests pasados, CI. Nada de "all N phases" sin verificar.

## LISTA DE VERIFICACIÓN FINAL

- [ ] Fase 0: spec commiteado en docs/gauntlets/GAUNTLET_v3.9.md
- [ ] Fase X: body del 400 visible + reasoningEffort configurable (default off)
- [ ] Fase I: wizard de primera ejecución (AiSettingsModal reutilizado, advertencia, carpeta de datos, no reaparece)
- [ ] Fase G: piezas con propiedades del inventario real, slots, pieza fuera → vuelve al inventario
- [ ] Fase F: ventana always-on-top + tray + Ctrl+Alt+K global + alta con app minimizada