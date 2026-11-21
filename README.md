# LOXAR — IDE de escritorio para lenguas construidas

[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Ollama](https://img.shields.io/badge/Ollama-local_inference-000000?logo=ollama)](https://ollama.ai)
[![Gemini](https://img.shields.io/badge/Gemini-2.5-4285F4?logo=google)](https://ai.google.dev)

LOXAR es una aplicación de escritorio para crear, modelar y expandir **lenguas construidas (conlangs)**. Combina gestión de léxico, gramática visual, neografía y generación de vocabulario asistida por IA en un solo entorno con una interfaz tipo canvas navegable.

## Por qué existe

Las herramientas existentes para conlangs son fragmentarias: un diccionario, un generador aleatorio, un graficador de glifos. LOXAR une todo bajo un **modelo lingüístico formal**: la gramática definida por el usuario es código ejecutable, no solo notas. Eso significa que el sistema puede generar formas de superficie reales a partir de reglas, validar fonología y mantener coherencia entre léxico y gramática.

## Arquitectura

```
Lexicón ←→ Gramática ←→ Motor de realización ←→ Superficie (forma escrita/fonética)
    ↑           ↑                 ↑
  SQLite     Typological      Árbol AST
  (persist.)  Profile        (sintaxis + orden)
```

- **Frontend:** React 18 + Vite 5 + Tailwind CSS
- **Backend:** Tauri 2 (Rust)
- **Persistencia:** SQLite (`tauri-plugin-sql`)
- **IA:** Google Gemini (cloud) + Ollama (local)
- **Motor de gramática:** TypeScript puro, determinista — ejecuta `realizeLexeme` / `realizeClause` sobre un `GrammarManifest`

## Características

### Lexicón
- Raíces, lexemas, significados múltiples por entrada.
- Autocompletado y generación de palabras por IA consistente con la tipología del idioma.
- Taxonomía interna de 10 dominios (categorías léxicas, roles gramaticales, tipos de morfema, etc.).

### Gramática visual
- **Tipología:** orden de palabras, alineamiento, morfología, dirección del núcleo.
- **Fonología:** inventario de sonidos, estructuras silábicas, validación fonotáctica en tiempo real.
- **Estrategias morfosintácticas:** afijos, partículas, clíticos, auxiliares, mutación, tono.
- **Paradigmas de inflexión:** tablas de declinación/conjugación con ranuras y alomorfia condicionada.
- **Árbol AST:** editor visual de sintaxis con nodos arrastrables y conectores de dependencia.
- **Excepciones:** manejo de supletiva e irregularidades (ej. verbos "ser/estar").
- **Preview:** oración de ejemplo calculada en vivo desde las reglas, sin IA.

### Neografía
- Editor de glifos con sistema de escritura configurable.
- Generación de fuentes y trazado de imágenes.

### IA dual-backend
- **Gemini** para generación en la nube.
- **Ollama** para inferencia local sin depender de APIs externas.
- Degradación offline: el motor de gramática funciona sin conexión; la IA solo se usa para bootstrap e inducción de reglas desde corpus.

### UI lista para revisión
- Pantalla inicial tipo **canvas Stitch** (`LanguageHomeCanvas`) con nodo central de lengua y módulos satélite navegables.
- Métricas vivas por módulo: reglas, categorías, entradas, pendientes, etc.
- Logo LOXAR con marca **X** sobre la O, usable en README y assets del repo.

## Continuity protocol

LOXAR incluye un framework de continuidad para desarrollo asistido por IA:

- `docs/continuity/PROTOCOL.md` — reglas de oro y checklist de validación.
- `docs/continuity/TASKS.md` — backlog de tareas priorizadas.
- `docs/continuity/SESSION_CACHE.json` — checkpoint de sesión para retomar trabajo sin perder contexto.

Esto permite que un agente de coding IA retome el proyecto desde cualquier punto manteniendo coherencia con las decisiones de diseño previas.

## Estado actual

- **Frontend modularizado:** `App.tsx` reducido mediante extracciones controladas (`AppWelcomeSection`, `AppToastLayer`, `AppOfflineBannerLayer`, `AppSettingsModalLayer`, etc.).
- **Suite de tests:** 658/658 tests unitarios/integración en Vitest (76 archivos).
- **E2E web:** `npm run test:gui` 8 specs en Playwright (arranque, flujo completo de léxico, importador
  de gramática, sound change, salto Workbench ↔ Léxico y canvas); 7/8 en suite completa — el fallo de
  `grammar-import` es contención de 8 workers sobre el chunk lazy del importador y se reproduce en el
  árbol limpio (en aislamiento pasan 2/2).
- **Build estable:** `npm run typecheck`, `npm run lint` y `npm run build` en verde.
- **Licencia:** MIT (`LICENSE`).
- **Continuidad:** Fase J del Gauntlet v3.12 cerrada (commit `ee2a505`) y limpieza CLN aplicada
  (componentes muertos sin uso eliminados, commit `9bc5f70`).
- **Pendiente:** `git push` + CI verde con número de run, y validación runtime de usuario
  (`npm run tauri dev`).

## Puesta en marcha

```bash
npm install
npm run tauri:dev    # modo escritorio
# o solo frontend web:
npm run dev
```

Build de producción:

```bash
npm run tauri:build
```

## Licencia

MIT
