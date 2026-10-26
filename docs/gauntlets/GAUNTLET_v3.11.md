# GAUNTLET v3.11 — PIPELINE SANO: DB + SCOPE + ADAPTER ANTI-ABORT + J + V (rev.2)

## CONTEXTO

- **Repo**: OrielSidhe/LOXAR, rama master. HEAD: 1c63a12 (CI #34 verde).
- La app REAL corrió el documento QUAVANOL completo (191,775 caracteres) end-to-end por primera vez. El análisis terminó con AGUJEROS causados por bugs reales. Este gauntlet repara el pipeline. NO toques nada fuera de lo listado.
- Hallazgos verificados en runtime por el usuario:
  1. "Failed to init pragmatic DB: (code: 787) FOREIGN KEY constraint failed" (App.tsx:486) — los permisos sql ya funcionan; el error es de la DB pragmática (orden de inserción o filas padre faltantes).
  2. "forbidden path: loxar-session-cache ... allow-read-text-file" (SettingsModal.tsx:88) — sessionCache escribe a una ruta relativa FUERA del scope fs.
  3. Tormenta de "AI Provider Error: signal is aborted without reason AbortError at openAIAdapter.ts:17" — decenas durante el análisis; el resultado quedó con fonología y roles vacíos.
- PRUEBA DE LABORATORIO (hecha por el usuario, chunk 1 exacto de la app): el MISMO prompt enviado por chat a tres modelos devolvió JSON válido en todos los casos, y poolside/laguna-xs-2.1:free respondió en ~10 SEGUNDOS. CONCLUSIÓN OBLIGATORIA: el modelo NO es lento; el abort viene del LADO CLIENTE (ciclo de vida), no del proveedor y probablemente no de un timeout largo. Tu diagnóstico A1 debe encontrar al culpable real.
- Además, en la prueba de laboratorio laguna-xs ALUCINÓ valores del template: devolvió en "exceptions" el ejemplo "ir → fue" del prompt, y slots con "-k"/"prevVowel" del ejemplo del formato. El template induce copias: hay que endurecerlo.
- Ya existe y NO se toca: importStore (jobs fuera del modal), surfacing con body (X1), capabilities corregidos, reasoningEffort off para Nous.

## PRINCIPIO RECTOR

> NADA se pierde en el camino: ni datos, ni trabajo de IA, ni visibilidad. Un trabajo que corre sin que el usuario pueda verlo, pausarlo o cancelarlo, ES un trabajo perdido.

## REGLAS DURAS

1. **ANTI-AMNESIA**: Fase 0 commitea este spec en docs/gauntlets/GAUNTLET_v3.11.md. Si pierdes contexto, relee ese archivo.
2. **VÁLVULA "NO LO SÉ"**: Si algo no está aquí, dilo y espera. PROHIBIDO inventar.
3. **CI VERDE O NO ES TERMINADO**: commit + push + run esperado con número.
4. **COMMINT MESSAGES HONESTOS**: solo lo que está en el diff.
5. Si no puedes correr la app con GUI, declánalo — no simules demos.

## ORDEN ESTRICTO: 0 → K → S → A → J → V

---

## FASE 0 — SPEC EN REPO

Crear `docs/gauntlets/GAUNTLET_v3.11.md` con este texto completo. Commit "0: Gauntlet v3.11 spec". Push + CI verde.

---

## FASE K — DB PRAGMÁTICA (FK constraint)

K1 — Reproduce y diagnostica: la sentencia exacta que falla con 787 al inicializar la DB pragmática (App.tsx:486 la reporta). Reporta tabla, FK y filas implicadas.

K2 — Arreglo: padres antes que hijos (o la migración no crea los padres). NO uses PRAGMA foreign_keys=off como "solución" — arregla el dato.

K3 — Criterio: app corriendo con CERO errores de FK; la DB pragmática inicializa.

Commit "K: Gauntlet v3.11 — FK constraint en DB pragmática". Push + CI verde.

---

## FASE S — SESSION CACHE (scope)

S1 — sessionCache usa la ruta relativa "loxar-session-cache", fuera del scope fs. Resuélvela al directorio de datos de la app (dentro de $APPDATA/*). No amplíes el scope a rutas relativas.

S2 — Criterio: consola sin "forbidden path"; la caché persiste entre reinicios.

Commit "S: Gauntlet v3.11 — session cache en app data". Push + CI verde.

---

## FASE A — ADAPTER ANTI-ABORT (la fase más importante; diagnóstico refinado por prueba de laboratorio)

A1 — DIAGNÓSTICO OBLIGATORIO Y PRIMERO. El modelo responde este prompt en ~10 segundos (verificado). Un abort no puede ser "lentitud del proveedor". Encuentra y reporta file:line de TODOS los puntos donde se llama .abort() o se crea AbortController en el camino del análisis (openAIAdapter.ts, geminiService.ts, inductFromText.ts, GrammarImporterModal.tsx), y para cada uno QUIÉN lo dispara. Sospechosos concretos a verificar (no los assumes — verifícalos y reporta lo que encuentres):
  (a) React.StrictMode ejecuta los efectos dos veces en desarrollo: si el AbortController vive en un useEffect y el cleanup hace abort(), el primer montaje se aborta solo.
  (b) El progreso del análisis actualiza estado del modal → el efecto se re-ejecuta → abort del fetch anterior y relanzamiento (tormenta de aborts con el análisis avanzando a saltos).
  (c) Lanzamiento de chunks en paralelo donde el arranque de uno aborta al anterior.
  (d) Un timeout corto (< 10s) en algún AbortSignal.timeout.

A2 — Arquitectura: el fetch de un chunk NO debe vivir atado al ciclo de vida del componente ni del modal (el trabajo ya vive en importStore — E1: cerrar el modal NO mata el trabajo; re-renderizar TAMPOCO debe matarlo). Un solo dueño del AbortController: el job en el store, cancelable solo por el usuario (J2) o por el sistema de reintentos (A3).

A3 — Retry con backoff: ante timeout o error transitorio, reintenta el chunk hasta 2 veces (5s, 15s). Un chunk se marca fallido solo tras agotar reintentos. AbortError de CANCELACIÓN del usuario (J2) NO se reintenta.

A4 — Timeout configurable por proveedor: requestTimeoutMs en la config (default 180000 ms), editable en settings — margen de seguridad, no el fix principal (el fix es A2).

A5 — Streaming: el curl verificado del usuario usa stream:true con éxito. Si el adapter llama en modo no-streaming, evalúa pasar a streaming para evitar timeouts de proxy; reporta qué modo usa hoy y qué decidiste.

A6 — PROMPT ENDURECIDO: en LLM_PROMPT_TEMPLATE (inductFromText.ts), los valores del ejemplo inducen alucinaciones en modelos free (verificado: laguna-xs devolvió "ir → fue" en exceptions y "-k"/"prevVowel" en slots, copiando el formato). Añade una instrucción explícita: los valores entre comillas del FORMATO son ILUSTRATIVOS; prohibido incluirlos si no aparecen en el DOCUMENTE; exceptions/roles solo con contenido real del documento. Criterio: re-test del chunk 1 con un modelo free → exceptions NO contiene "ir → fue" y el plural no es "-k" salvo que esté en el documento.

A7 — Chunks fallidos reintentables individualmente: el importador ofrece re-ejecutar SOLO los chunks fallidos; los exitosos se conservan (nada se pierde ni se repite).

A8 — Tests: abort no ligado a unmount/re-render (simulación del store); retry ante timeout; no-retry ante cancelación; re-intento selectivo; prompt contiene la advertencia anti-copia.

A9 — Criterio final: análisis de un documento grande SIN tormenta de AbortErrors en consola; chunks fallidos marcados y reintentables; resultado con fonología presente cuando el documento la tiene (chunk 1 de QUAVANOL contiene la pronunciación completa).

Commit "A: Gauntlet v3.11 — adapter anti-abort (dueño único del signal + retry + prompt endurecido)". Push + CI verde.

---

## FASE J-REAL — TRABAJO IA VISIBLE

J1a — El aviso "No hay IA configurada" con BOTÓN "Configurar IA" que abre el AiSettingsModal EXISTENTE; al volver, el texto no se pierde (importStore).

J2 — Cancelar: botón durante el análisis, AbortController real (el del job en el store, A2), job "cancelado", relanzable.

J3 — Banner simple en pantalla principal: "Analizando chunk X de Y" con progreso; "Completado" o "Fallido: status + body" (X1); visible aunque se cierre el modal. NO visor completo.

Commit "J: Gauntlet v3.11 — botón settings + cancelar real + banner simple". Push + CI verde.

---

## FASE V — VENTANA WIDGET (alcance según re-test)

Si el botón de la barra superior YA renderiza el widget tras la Fase P: solo data-tauri-drag-region en el header.
Si sigue BLANCA: devtools de la ventana, error JS EXACTO reportado, arreglo, y movilidad.

Commit "V: Gauntlet v3.11 — ventana widget operativa". Push + CI verde.

---

## PROTOCOLO DE REPORTE

1. Evidencia file:line + salidas de `npx vites
