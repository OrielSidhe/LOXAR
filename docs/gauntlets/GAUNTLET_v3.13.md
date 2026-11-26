# GAUNTLET v3.13 — PROVIDERS (FASES 0, U, E, M, G, T, D)

Especificación anti-amnesia. Repo GitHub `OrielSidhe/LOXAR`, Tauri 2 + React 18 +
TS. Principio rector: los nodos del canvas son vistas vivas sobre datos reales,
no decoración; nada se promete que no se parsea de verdad.

**Regla dura:** cada fase termina en commit + push + CI **VERDE** (con número de
run) antes de la siguiente. Prohibido declarar terminado con «CI: a ejecutar».

**ADVERTENCIA:** los bugs listados fueron verificados el 5-nov y desde entonces
hubo ~40 commits de refactor (tipado estricto, extracción de God Components).
Cada bug se RE-VERIFICA en el HEAD actual antes de tocar; si ya está arreglado,
no se reprocesa, solo se documenta.

---

## PRECONDICIONES REALES (re-verificación 2026-11-26)

| Dato | Valor verificado | Evidencia |
|---|---|---|
| HEAD local | `b0c22a7` (`docs: checkpoint InflectionView + ToolsTab y cache 2026-11-26 02:00`) | `git log -1` |
| `origin/master` | `a3230ad` (`EX: export MD agrupa entradas por categoría (spec v3.14 D2)`) | `git log origin/master -1` |
| Divergencia | rama local **9 commits adelante**, 0 atrás | `git status -sb` |
| CI del tip remoto | run `45765573476`, `success`, push master | `gh run list --limit 3` |
| Árbol de trabajo | limpio al arrancar | `git status --short` |
| Node local | v26.4.0 (satisface `engines.node >= 24.15.0`) | `node -v` |
| Autenticación GitHub | `OrielSidhe`, scopes `repo`, `workflow` | `gh auth status` |

El push de la FASE 0 publica los 9 commits locales acumulados más el commit de
esta spec; CI se ejecuta sobre el tip resultante, no una vez por fase.

---

## RE-VERIFICACIÓN DE BUGS EN HEAD `b0c22a7`

Método: grafo Graft primero (`graft ask`, `graft skeleton`, `graft grep`), luego
lectura únicamente de los rangos señalados por el grafo.

| Bug de la spec | Estado real en HEAD | Evidencia file:line | Acción |
|---|---|---|---|
| U-1: `editingProvider` se setea pero nunca se muestra | **CONFIRMADO**. El JSX renderiza lista de proveedores, presets y editor del proveedor *activo*; no hay rama de render condicionada por `editingProvider`/`isCreating`. | `src/components/AiSettingsModal.tsx:55`, `:118-136`, `:228-270`, `:270-368` | FASE U |
| U-2: `saveEditingProvider` y `handleReasoningEffortChange` son código muerto | **CONFIRMADO**. `graft grep` reporta 0 in-edges para ambos; `updateEditingProvider` solo es llamado por el primero de ellos en cadena muerta. | `AiSettingsModal.tsx:138-149`, `:151-157`, `:205-208` | FASE U |
| U-3: `Editar` borra `extraBody` y `requestTimeoutMs` | **CONFIRMADO**. `startEditProvider` construye `ProviderFormData` sin esos campos y `ProviderFormData` no los declara. | `AiSettingsModal.tsx:28-38`, `:123-134`; contraste con `base.ts:27`, `:37` | FASE U + E |
| U-4: `Editar` debe ser distinto de activar | **CONFIRMADO**: `startEditProvider` no toca `activeProviderId`, pero al no existir formulario el comportamiento es inobservable. | `AiSettingsModal.tsx:123-136` | FASE U |
| E-1: `extraBody` llega al adapter pero no desde la UI | **PARCIAL**: el merge `...extraBody` ya existe en el adapter OpenAI y el campo existe en el tipo; no hay UI ni persistencia desde el formulario. | `base.ts:27`; `openAIAdapter.ts:102`, `:116`; `AiSettingsModal.tsx:28-38` | FASE E |
| E-2: preset Nous desactualizado | **CONFIRMADO**: base `https://inference-api.nousresearch.com/v1`, modelo `poolside/laguna-s-2.1:free`, sin `extraBody` con tags. | `src/services/aiProviderRegistry.ts:53-81` | FASE E |
| E-3: presets gratuitos OpenAI-compatibles | **PARCIAL**: existen Groq, StepFun y OpenRouter; faltan Cloudflare Workers AI, NVIDIA y Ollama OpenAI-compatible/preset actualizado. Ninguno con `extraBody`. | `aiProviderRegistry.ts:83-119` | FASE E |
| M-1: botón «Obtener modelos» / `GET {baseUrl}/v1/models` | **CONFIRMADO AUSENTE**: `graft grep` sin hits para «Obtener modelos» ni «v1/models» en 439 archivos indexados. | búsqueda exhaustiva Graft, 0 hits | FASE M |
| M-2: presets Google AI Studio gemini-3.8-flash / 3.6-flash / 3.5-flash-lite | **CONFIRMADO AUSENTE**: el preset Gemini usa `gemini-2.5-flash` y modelos 2.5/2.0/1.5. | `aiProviderRegistry.ts:25-35` | FASE M |
| G-1: `{...contents, ...extraBody}` sobre array | **CONFIRMADO**: `contents` es array y se convierte en objeto al hacer spread dentro de `generateContent`. | `geminiAdapter.ts:46`, `:69-75` | FASE G |
| G-2: roles `system`/`assistant` sin mapear | **CONFIRMADO**: `messages.map(({role, content}) => ({role, content}))` reenvía roles tal cual; no hay `systemInstruction` ni mapeo `assistant → model`. | `geminiAdapter.ts:46` | FASE G |
| G-3: `require('@google/genai')` en ESM del navegador | **CONFIRMADO**: llamada `require` directa sin factory en el bundle web. | `geminiAdapter.ts:31-41` | FASE G |
| T-1: probar conexión sin guardar desde el formulario | **CONFIRMADO AUSENTE**: `handleTest` usa `activeProvider` guardado; no existe `Probar` dentro de un formulario de edición. | `AiSettingsModal.tsx:85-111`, `:370-382` | FASE T |
| T-2: hints accionables por error (400/401/404/429/timeout) | **CONFIRMADO AUSENTE**: el mensaje es `result.error` crudo o `Error: ${e.message}`; sin clasificación. | `AiSettingsModal.tsx:92-107`; `geminiService.ts:264-343` | FASE T |
| D-1: demo runtime con checklist vacía | **PENDIENTE** por definición; se ejecuta al cierre de FASE D. | esta spec | FASE D |

Ninguno de los bugs listados estaba ya resuelto en `b0c22a7`: los 15 puntos
siguen vigentes y se reprocesan por fase.

---

## BASELINE DE VERIFICACIÓN (HEAD `b0c22a7`, antes de tocar código)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | exit 0 |
| `npx vitest run --reporter=dot` | 110 archivos, 875 tests, 0 fallos (exit 0) |
| `npm run lint` | escape validation passed (exit 0) |
| `npm run build` | ✓ built in 10.12s (exit 0); warning de chunk >500 kB, no bloqueante |

---

## FASE 0 — Spec anti-amnesia

Escribir `docs/gauntlets/GAUNTLET_v3.13.md` con la spec completa y el resultado
de la re-verificación. Commit + push + CI verde.

**Checklist FASE 0**
- [x] Spec completa escrita con datos reales de HEAD.
- [x] Re-verificación de los 15 puntos con evidencia file:line.
- [x] Baseline typecheck / vitest / lint / build registrada.
- [x] Commit `0aebf84` + push + CI verde: run `45785326733` (`success`, 7m8s, `headSha=0aebf84`).

---

## FASE U — Formulario real de proveedor

`AiSettingsModal.tsx`: al pulsar «+ Agregar proveedor» (y «Editar») se renderiza
el formulario de verdad. Hoy `editingProvider` se setea pero nunca se muestra;
`saveEditingProvider` y `handleReasoningEffortChange` son código muerto.
`ProviderFormData` debe incluir `extraBody` y `requestTimeoutMs` (hoy Editar
borra esos campos). Editar ≠ activar: se edita sin cambiar el proveedor activo.

**Checklist FASE U**
- [x] Render condicional del formulario para crear y editar.
- [x] `ProviderFormData` con `extraBody` y `requestTimeoutMs`.
- [x] `saveEditingProvider` cableado; `handleReasoningEffortChange` cableado.
- [x] Editar no modifica `activeProviderId`.
- [x] Tests del formulario (crear/editar/preservar campos) con mocks de storage.
- [ ] Commit + push + CI verde con número de run.

---

## FASE E — extraBody punta a punta + preset Nous

Persistencia de `extraBody` desde el form hasta `base.ts` / `openAIAdapter.ts`
(el merge `...extraBody` ya existe; falta UI/persistencia).

Preset Nous ACTUALIZADO: base `https://api.nousresearch.com/v1`, modelo
`stepfun/step-3.7-flash:free`, `extraBody` con
`tags: ["user=<UID configurable>"]` (sin el tag, Nous responde 400
«missing user tag»); `reasoningEffort` default OFF para Nous.

Añadir también presets OpenAI-compatibles gratuitos: Groq (`gpt-oss-120b`),
Cloudflare Workers AI, NVIDIA y Ollama localhost (sin key, offline).

**Checklist FASE E**
- [x] `extraBody` y `requestTimeoutMs` sobreviven crear → editar → guardar → recargar.
- [x] Preset Nous con base/modelo/tags correctos y reasoning OFF.
- [x] Presets Groq (gpt-oss-120b), Cloudflare, NVIDIA y Ollama.
- [x] Tests de persistencia y de merge en adapter.
- [ ] Commit + push + CI verde con número de run.

---

## FASE M — Model discovery

Botón «Obtener modelos» = `GET {baseUrl}/v1/models`, filtrado/ordenado, llena un
`datalist`/picker. Presets Google AI Studio: `gemini-3.8-flash`, `3.6-flash`,
`3.5-flash-lite` (free tier, verificable vía `GET v1beta/models` con
`x-goog-api-key`).

**Checklist FASE M**
- [x]Servicio de discovery con manejo de errores HTTP/timeout y normalización de `{data:[{id}]}`.
- [x]Botón y picker cableados al formulario (y al proveedor activo).
- [x]Presets Google AI Studio con modelos indicados.
- [x]Tests con `fetch` mockeado (éxito, vacío, 401/429).
- [ ] Commit + push + CI verde con número de run.

---

## FASE G — geminiAdapter a REST

Tres bugs confirmados en `b0c22a7`:
1. `{...contents, ...extraBody}` sobre un ARRAY es inválido.
2. roles `system`/`assistant` sin mapear (`system → systemInstruction`, `assistant → model`).
3. `require('@google/genai')` no existe en ESM del navegador → migrar a REST
   directo (`generateContent`, `contents/parts`).

Con tests con `fetch` mockeado.

**Checklist FASE G**
- [x]`generateContent` REST con `contents: [{role:'user'|'model', parts:[{text}]}]`.
- [x]`systemInstruction` derivado de mensajes `system`.
- [x]`extraBody` mergeado en el body del request, no en `contents`.
- [x]Sin `require` en el adapter; factory de test eliminada o adaptada.
- [x]Tests con `fetch` mockeado para roles, extraBody, errores y abort.
- [ ] Commit + push + CI verde con número de run.

---

## FASE T — Probar conexión sin guardar + hints accionables

Botón «Probar» en el form que lanza una llamada mínima SIN guardar, con mensajes
según el error:

| Error | Hint |
|---|---|
| 400 missing user tag | «añade tags en extraBody» |
| 401 | key inválida |
| 404 modelo | lista modelos con el botón de la fase M |
| 429 | «cuota/rate limit, espera o cambia de modelo» |
| timeout | sugiere subir `requestTimeoutMs` |

Con thought ON/OFF según proveedor (OpenRouter free exige reasoning enabled;
Nous lo rechaza).

**Checklist FASE T**
- [x] «Probar» usa la configuración del formulario sin mutar `providers` (`buildTestProviderConfig`, copia detachable).
- [x] Clasificación de errores y hints de la tabla (`classifyConnectionError`: 400 tag / 401-403 / 404 / 429 / timeout).
- [x] Reasoning ON/OFF por proveedor en la prueba (`resolveTestReasoning`: OpenRouter free → medium, Nous → off).
- [x] Tests de clasificación con respuestas HTTP simuladas (`connectionTestHints.test.ts`, 21 tests).
- [x] Commit + push + CI verde con número de run (commits `11ae2c9`/`d6e653d`, push `86f3e42..d6e653d`, CI `45808270226` success attempt 1).

---

## FASE D — Demo runtime (usuario)

Checklist marcada **vacía**: añadir proveedor real, editar sin perder
`extraBody`, probar conexión con error inducido, obtener modelos. Cada ítem se
marca solo con evidencia de ejecución real (no con «debería funcionar»).

**Checklist FASE D**
- [ ] Añadir proveedor real.
- [ ] Editar sin perder `extraBody`.
- [ ] Probar conexión con error inducido.
- [ ] Obtener modelos.
- [ ] Commit + push + CI verde con número de run.

---

## R1 — AUTOAUDITORÍA ADVERSARIAL (BLOQUEO, obligatoria en cada fase)

Antes de cerrar cualquier fase, actuar como auditor hostil cuya meta es hacer
fallar el propio trabajo:

1. **Inventario de afirmaciones vs git diff real:** cada afirmación del reporte
   con `file:line` verificable; una sola sin correspondencia = fase inválida.
2. **Caza de alucinaciones:** releer la spec antes y después de codificar;
   prohibido citar líneas que no existen, describir código no escrito, o commit
   message que promete más que el diff.
3. **`npx tsc --noEmit` + `npx vitest run` leídos como enemigo:** mocks flojos,
   suites sin correr, tests rotos que no tocaste.
4. **«Debería funcionar» no es evidencia:** demo real o checkbox PENDIENTE.
5. **Tabla final por fase:** `| afirmación | evidencia | veredicto 🟢/⚠️/🔴 propio |`,
   con 🔴 siempre que quede algo a medias.
6. **«FASE X TERMINADA» solo con todo 🟢, push verificado y CI verde con número
   de run; si no: «FASE X INCOMPLETA — falta: [lista]».**

### R1 — FASE 0

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| HEAD y divergencia reales | `b0c22a7`, `origin/master=a3230ad`, 9 commits ahead (`git log`, `git status -sb`) | 🟢 |
| CI del tip remoto verde | run `45765573476` (`gh run list --limit 3`) | 🟢 |
| 15 puntos re-verificados, ninguno pre-resuelto | tabla de re-verificación con `file:line` y `graft grep` | 🟢 |
| Baseline verde | typecheck 0, vitest 875/875, lint 0, build 0 | 🟢 |
| Commit + push + CI verde de la FASE 0 | commit `0aebf84`, push confirmado (`a3230ad..0aebf84 master -> master`), run `45785326733` `success` con `headSha=0aebf84` | 🟢 |

**FASE 0 TERMINADA** — commit `0aebf84`, push verificado, CI verde run
`45785326733` (7m8s). El commit de cierre documental que registra este run se
publica a continuación; su propia CI se verifica antes de abrir la FASE U.

---

### R-U — FASE U

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| Formulario real de crear/editar proveedor | commit `86f3e42`, `AiSettingsModal.test.tsx` 3/3 | 🟢 |
| `extraBody` y `requestTimeoutMs` sobreviven editar sin activar | test `edita sin perder extraBody ni timeout...` | 🟢 |
| typecheck / vitest sobre el árbol de FASE U | typecheck 0, vitest 881/881 (111 archivos) | 🟢 |
| Push + CI verde de FASE U | run `45788851335` attempt 2 `success`, head `86f3e420` | 🟢 |

**FASE U TERMINADA** — push `86f3e42` verificado; CI run `45788851335` attempt 2 `success`.

### R-E — FASE E

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| Preset Nous con base/modelo/tag y reasoning OFF | `aiProviderRegistry.ts` `buildNousPreset`, tests de registry | 🟢 |
| Presets Groq/Cloudflare/NVIDIA/Ollama OpenAI-compatible | `PRESET_PROVIDERS`, test de ids/baseURL | 🟢 |
| Persistencia de `extraBody`/`requestTimeoutMs` | round-trip save/load en `aiProviderRegistry.test.ts` | 🟢 |
| Merge en adapter | `aiProviders.test.ts` 38/38 (preexistente, re-verificado) | 🟢 |
| typecheck / lint / build / vitest | 0 / OK / OK / 883/883 (111 archivos) | 🟢 |
| Push + CI verde de FASE E | commit local `fd60cc9`, sin push por diseño del supervisor | ⚠️ |

**FASE E INCOMPLETA** — falta push + CI verde con número de run.

### R-M — FASE M

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| Servicio de discovery con timeout/errores y normalización | `src/services/modelDiscovery.ts:14-103`; `modelDiscovery.test.ts` (6 tests) | 🟢 |
| Botón «Obtener modelos» + datalist cableados | `src/components/AiSettingsModal.tsx:172-203`, `:422-433` | 🟢 |
| Preset Google AI Studio con 3 modelos | `src/services/aiProviderRegistry.ts:85-93` | 🟢 |
| typecheck / lint / build / vitest | 0 / OK / OK / 894/894 (112 archivos) | 🟢 |
| Push + CI verde de FASE M | commit local `4443f88`, sin push por diseño del supervisor | ⚠️ |

**FASE M INCOMPLETA** — falta push + CI verde con número de run.

### R-G — FASE G

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| REST `generateContent` sin `require` | `src/services/aiProviders/geminiAdapter.ts:17-46`, `:83-137` | 🟢 |
| Roles mapeados + `systemInstruction` | `mapGeminiMessages` (`geminiAdapter.ts:34-54`); `aiProviders.test.ts` | 🟢 |
| `extraBody` mergeado en el body, no en `contents` | `geminiAdapter.ts:48` (`{ ...extraBody, contents }`) + test dedicado | 🟢 |
| Tests con `fetch` mockeado adaptados | `aiProviders.test.ts` (6 Gemini) + `aiProviderPhaseC.test.ts` C3 (5) | 🟢 |
| typecheck / lint / build / vitest / huérfanos | 0 / OK / OK / 895/895 (112 archivos) / 13 (baseline) | 🟢 |
| Push + CI verde de FASE G | commit local `7701fc8`, sin push por diseño del supervisor | ⚠️ |

**FASE G INCOMPLETA** — falta push + CI verde con número de run.

### R-T — FASE T

| Afirmación | Evidencia | Veredicto |
|---|---|---|
| «Probar» sobre config del form sin mutar `providers` | `buildTestProviderConfig` (`connectionTestHints.ts:136`), copia de `models`/`extraBody`; `handleTestForm` (`AiSettingsModal.tsx:133`) y botón `:500` | 🟢 |
| Hints de la tabla (400 tag / 401 / 404 / 429 / timeout) | `classifyConnectionError` (`connectionTestHints.ts:62`), `hintFromTestResult` (`:111`); ambos caminos de test (`AiSettingsModal.tsx:108`, `:142`) | 🟢 |
| Reasoning ON/OFF por proveedor en la prueba | `resolveTestReasoning` (`connectionTestHints.ts:121`): OpenRouter `:free` → `medium`, Nous → `off`, detecta también por nombre | 🟢 |
| Tests con respuestas HTTP simuladas | `connectionTestHints.test.ts` (21 tests, 1 archivo) | 🟢 |
| typecheck / lint / build / vitest / huérfanos | 0 / OK / OK / 918/918 (114 archivos) / 13 (baseline) | 🟢 |
| Commit + push + CI verde de FASE T | push `86f3e42..d6e653d`; CI `45808270226` `success` (attempt 1, head `d6e653d`) | 🟢 |

**FASE T TERMINADA** — checklist completa, push y CI `45808270226` verdes. FASE D (demo del usuario) sigue pendiente.

---
## PROTOCOLO DE REPORTE

- Evidencia `file:line`.
- Salidas capadas (`npx vitest run | tail -5`), `--reporter=dot`.
- `/compact` entre fases.
- No leer archivos completos salvo los que se modifiquen.

## HIGIENE DE CONTEXTO

Los modelos free funden cuota con contexto grande: fases cortas, una por turno
si es posible. Usar Graft antes que lecturas en frío.
