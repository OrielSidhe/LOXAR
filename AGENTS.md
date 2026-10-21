# AGENTS.md — Loxar (Conlang Lexicon Manager)

## Graft — Context Graph Integration

Actúa como un desarrollador Senior y optimizador de contexto de este repositorio. Tu objetivo es instalar, construir y mantener automáticamente un grafo de contexto local usando Graft para minimizar el consumo de tokens y entender las dependencias del código antes de realizar cualquier cambio.

Sigue este flujo de trabajo obligatoriamente:

1. CONFIGURACIÓN E INICIALIZACIÓN (Solo la primera vez):
   - Verifica si la carpeta `.graft/` existe en la raíz del proyecto.
   - Si no existe, ejecuta en la terminal del proyecto: `npx @nanonets/graft init` y luego `npx @nanonets/graft build`.
   - Asegúrate de agregar `.graft/` al archivo `.gitignore` si aún no está incluido.

2. PROTOCOLO DE LECTURA DE CONTEXTO:
   - Antes de responder consultas sobre arquitectura, refactorización o búsqueda de errores, NO leas todos los archivos en frío ni hagas búsquedas masivas.
   - Consulta primero la estructura generada en `.graft/` para identificar exactamente qué módulos, funciones e imports están conectados con la tarea.
   - Lee únicamente los archivos fuente específicos que el grafo de Graft identifique como dependencias directas.

3. MANTENIMIENTO AUTOMÁTICO:
   - Cada vez que crees, elimines o hagas modificaciones estructurales significativas en las funciones o módulos del proyecto, ejecuta automáticamente `npx @nanonets/graft build` al finalizar para mantener el grafo sincronizado.

Confirma que has entendido estas instrucciones inspeccionando el proyecto actual y ejecutando la construcción inicial de Graft si hace falta.

---

## Proyecto: Loxar

Conlang Lexicon Manager — App Tauri (Rust + TSX + TS + JS).
- ~1,569 nodos en el grafo de contexto
- ~3,071 aristas de dependencia
- Lenguajes: JavaScript, Rust, TSX, TypeScript

## Comandos Graft (siempre usa el grafo primero)
| Cuando necesites… | Usa… |
|---|---|
| Entender el proyecto | `graft map` |
| Explicar un flujo | `graft ask "<pregunta>" --source` |
| Encontrar código | `graft grep "<patrón>"` |
| Ver API de un archivo | `graft skeleton <archivo>` |
| Ver quién llama a algo | `graft callers <símbolo>` |
| Impacto de un cambio | `graft callers <símbolo> --depth all` |
| Verificar grafo fresco | `graft check` |
| Rebuild del grafo | `graft build` |
| Visualizar | `graft viz` |

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
