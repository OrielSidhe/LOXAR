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
