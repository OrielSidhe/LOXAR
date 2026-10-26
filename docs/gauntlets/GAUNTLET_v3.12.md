# GAUNTLET v3.12 — LOXAR: CI VERDE + ANTI-ABORT REAL + JOBS VISIBLES

=== CONTEXTO ===
- Repo: OrielSidhe/LOXAR, rama master. HEAD actual: 687ed98 (run de CI #40 FALLIDO).
- MASTER ESTÁ ROJO: los runs #37, #38, #39 y #40 de GitHub Actions fallaron. ESTE GAUNTLET NO AVANZA NADA HASTA QUE MASTER ESTÉ VERDE.
- Stack: Tauri 2.12.3 + React 18 + TypeScript + Vitest + Rust (cargo check).
- App de conlangs: importa gramáticas con IA proveedor por proveedor (openAIAdapter/geminiAdapter/ollamaAdapter), analiza por chunks (inductFromText.ts + chunker.ts), y los errores actuales son: AbortError en tormenta durante análisis, FK constraint al iniciar, session-cache fuera de scope (estos dos ya fueron atacados en v3.11).
- Principio rector: los nodos del canvas son vistas vivas sobre datos reales; nada se pierde en el camino. El trabajo de IA pagado NUNCA se pierde.
- Regla dura: cada bloque termina en commit + push + CI VERDE verificado con número de run ANTES de empezar el siguiente. Prohibido declarar "hecho" algo cuyo archivo no aparezca en `git show --stat` del commit. Válvula honesta: si no sabes algo, escribe "NO LO SÉ" — nunca inventes.

=== PASO 0 — FASE 0: SPEC ANTI-AMNESIA ===
1. Crea `docs/gauntlets/GAUNTLET_v3.12.md` con este spec completo (copy-paste fiel).
2. Commit "0: Gauntlet v3.12 spec" + push + verificar CI verde con número de run.

=== FASE R — CI VERDE PRIMERO (no especules: LEE los logs) ===
R1. Ejecuta `gh run list --limit 6` y luego `gh run view <run_id> --log-failed` para el run fallido más reciente. COPIA el error exacto en tu reporte. No asumas nada antes de leer el log.
R2. Arregla los tests rotos por v3.11 (causas probables, CONFIRMAR contra el log):
   - `sessionCache.test.ts`: el código de producción ahora usa `appDataDir()` de `@tauri-apps/api/path` y guarda en `session-cache.json`. El test debe mockear TAMBIÉN ese módulo y esperar la ruta nueva.
   - Tests de adapters (openAI/ollama/gemini): alinear expects con el comportamiento actual de los adapters (timeout, signal opcional). No cambies comportamiento de producción para complacer tests salvo que el log muestre un bug real de producción.
R3. Tests que requieren API key real (gemini): deben hacer SKIP LIMPIO cuando no hay key (ej. `const key = process.env.GEMINI_API_KEY; (key ? describe : describe.skip)(...)`). Un test que no puede correr sin credenciales NUNCA debe fallar el CI — debe saltarse con mensaje.
R4. Criterio de cierre R: `npx vitest run` TODO verde localmente (salida completa en el reporte), `npx tsc --noEmit` limpio, `cargo check` limpio. Commit "R: fix CI" + push + CI VERDE con número de run. SI EL CI SIGUE ROJO, REPITE R1 ANTES DE CONTINUAR. No pases a Fase A con master rojo.

=== FASE A-REAL — ANTI-ABORT DE VERDAD ===
Diagnóstico confirmado: el modelo responde cada chunk en ~10s (verificado manualmente), pero la app aborta decenas de peticiones con "signal is aborted without reason" (openAIAdapter). La cancelación/timeout del LADO CLIENTE destruye chunks enteros (se perdió el chunk 1 = fonología completa). Mapa EXACTO de trabajo — cada archivo listado DEBE aparecer en `git show --stat`:

A1. **Dueño único del AbortController**: `src/stores/importStore.ts` (o donde viva el job store). Cada job guarda su propio `AbortController` (mapa job_id → controller). `cancelJob(jobId)` llama `controller.abort()`. Esto DEBE existir en el diff de importStore.

A2. **Cablear la señal de punta a punta** — la cadena completa, archivo por archivo:
   `importStore.ts` (crea el controller) → `GrammarImporterModal.tsx` / quien llame a `inductFromText` (pasa el signal) → `inductFromText.ts` (`callLlmChunked`/`callLlmForChunk` lo reciben) → `geminiService.ts` (`callAi`/`completeWithProvider` lo propagan) → `provider.complete({signal})` → cada adapter (`openAIAdapter.ts`, `geminiAdapter.ts`, `ollamaAdapter.ts`) lo pasa al `fetch`. Si un eslabón no recibe el signal, el cable está cortado y la fase NO está hecha.

A3. **Timeout ≠ Cancelación**: cada adapter mantiene su controller local de timeout, PERO si además recibe un signal externo, debe respetarlo (puedes usar `AbortSignal.any([timeoutSignal, externalSignal])` si el runtime lo soporta, o listeners manuales). Al capturar un AbortError, CLASIFICA:
   - signal externo abortado → "cancelled por el usuario": NO es error, NO reintenta, estado del job = cancelled, silencioso.
   - timeout local → error recuperable → va a A4.

A4. **Retry con backoff a nivel chunk**: en fallo de timeout/red de un chunk, reintentar ESE chunk hasta 3 veces con backoff (5s, 15s). El progreso del retry visible en el estado del job (chunkStatus por chunk: pending/done/failed/retrying).

A5. **Chunks fallidos reintentables individualmente**: el job guarda estado por chunk. Acción `retryFailedChunks(jobId)` que reintenta SOLO los fallidos sin repetir el documento. La UI del modal se conecta en Fase J.

A6. **StrictMode safety**: el efecto de React que arranca/observa jobs NO debe abortar fetches en curso por doble-invocación de efectos (React 18 StrictMode monta/desmonta efectos dos veces en dev). Patrón: cleanup solo cancela SUSCRIPCIONES, nunca el trabajo del job (el trabajo vive en el store, fuera del ciclo de vida del componente).

Criterio de cierre A: unit tests NUEVOS (mock de fetch) que verifiquen: (1) que `cancelJob` efectivamente aborta el signal que llega al fetch, (2) que un timeout se clasifica distinto de una cancelación, (3) que un chunk que falla 2 veces y logra a la 3ra termina done, (4) que `retryFailedChunks` solo repite los fallidos. `npx vitest run` verde, `npx tsc --noEmit` limpio. Commit "A: anti-abort real (signal de punta a punta)" + push + CI VERDE con número de run. En el commit SOLO los archivos de esta fase.

=== FASE J — JOBS VISIBLES Y CANCELABLES (código + tests, SIN GUI) ===
J1. **Botón "Configurar IA"**: el aviso "No hay IA configurada" (pre-flight de v3.11 en GrammarImporterModal.tsx) incluye un botón que abre AiSettingsModal. El modal de importación NO se cierra solo: espera el cierre del settings (mismo patrón que el wizard de v3.10). Usa un callback/prop explícito desde App — no hacks globales.
J2. **Cancelar real**: botón "Cancelar" visible mientras el análisis corre → llama `cancelJob` (Fase A1) → job pasa a 'cancelled' → la UI lo muestra y NO hay toast de error (cancelar no es error).
J3. **Banner simple** en la pantalla principal (NO dentro del modal): estado del trabajo IA — "Analizando gramática: chunk X/Y" con contadores de fallidos, botón Cancelar cuando corre, "Completado" o "Cancelado" al final. Data-driven desde el store; se oculta cuando no hay job.
J4. **Tests unitarios sin GUI**: store (transiciones running→cancelled, conteo de chunks), banner (React Testing Library: renderiza estados idle/running/done/cancelled, botón cancel dispara cancelJob).
Criterio de cierre J: tests verdes, tsc limpio, commit "J: cancelar + banner + botón settings" + push + CI VERDE con número de run.

=== DEMO RUNTIME (DELEGADA AL USUARIO — documentarla, NO fingirla) ===
En el spec, deja una sección "DEMO PENDIENTE" con esta checklist SIN marcar, para que el usuario pruebe en su máquina:
[ ] Arrancar app: NO aparece "Failed to init pragmatic DB" en consola (Fase K de v3.11)
[ ] NO aparece "forbidden path: loxar-session-cache" (Fase S de v3.11)
[ ] Analizar QUAVANOL con IA de Nous: SIN tormenta de AbortError en consola; el chunk 1 (fonología) llega completo; progreso avanza 1/15 → 15/15
[ ] Botón Cancelar detiene el análisis de verdad y el banner dice "Cancelado"
[ ] Botón "Configurar IA" desde el aviso abre los ajustes sin cerrar el importador
[ ] Banner visible en pantalla principal durante el trabajo

=== PROTOCOLO DE REPORTE (OBLIGATORIO) ===
1. Por bloque: evidencia file:line de CADA cambio + salidas completas de `npx vitest run`, `npx tsc --noEmit`, `cargo check`.
2. Por bloque: sha del commit, confirmación de `git push`, y **número del run de CI con su estado**. Si no verificaste el run, escribe "CI: SIN VERIFICAR" — no digas "verde" sin el número.
3. Mensajes de commit honestos: solo lo que está en el diff. Si un archivo del mapa (A2) no fue tocado, el commit no puede decir que la fase está hecha.
4. Válvula "NO LO SÉ" activa en todo momento.
5. Orden obligatorio: 0 → R → A → J. Fase R es la única puerta: master verde o no hay gauntlet.
