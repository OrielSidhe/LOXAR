# Loxar Continuity Protocol
**Versión:** 1.0  
**Última actualización:** 2026-07-13  
**Inspirado en:** `SQL-MIGRATION-GUIDE.md`

## ⚠️ ALERTA PARA EL AGENTE IA
Antes de tocar **cualquier** archivo en este repositorio, es **OBLIGATORIO** leer este documento y `docs/continuity/TASKS.md`.  
Si no lo haces, romperás la continuidad del proyecto.

---

## 🔍 Análisis de Root Cause (Lecciones aprendidas)
1. **Corrupción silenciosa:** Los cortes de cuota de IA dejan archivos con sintaxis rota (llaves faltantes, imports rotos).  
2. **Pérdida de contexto:** No queda rastro de qué se estaba editando ni qué prompts se usaron.  
3. **Estado UI perdido:** Al reiniciar, la aplicación no recuerda qué tab estaba abierta ni qué entrada estaba en edición.

## ✅ Principios Guía (Reglas de Oro)

| # | Regla | Justificación |
|---|-------|---------------|
| 1 | **Nunca dejar código con sintaxis rota.** Si sabes que se va a cortar la cuota, haz un rollback al último estado estable o deja el bloque comentado. | Evita que el servidor de dev falle y obliga a rehacer trabajo. |
| 2 | **Validar antes de considerar una tarea terminada.** Cada cambio debe pasar `npm run lint` y `npm run typecheck`. | Captura errores de escaping y tipado temprano. |
| 3 | **Trazabilidad total.** Cada cambio debe estar vinculado a una tarea en `TASKS.md` con un checkpoint descriptivo. | Permite retomar exactamente donde se quedó. |
| 4 | **Estado UI persistente.** Guarda el estado de la vista (tab activa, entrada en edición) en `SESSION_CACHE.json`. | Reduce la fricción al retomar una sesión. |
| 5 | **Checkpoint obligatorio antes de cortes largos.** Antes de una operación de IA que pueda tardar, escribe un bloque de comentario `// TODO: [CONTINUE HERE] - <descripción>` y actualiza `TASKS.md`. | Crea un punto de recuperación legible por humanos e IA. |

## 🛠️ Checklist de Validación (Ejecutar antes de cada commit)

- [ ] `npm run lint` pasa sin warnings de escapes ilegales.
- [ ] `npm run typecheck` pasa sin errores de TypeScript.
- [ ] El último checkpoint en `TASKS.md` describe el trabajo realizado.
- [ ] `SESSION_CACHE.json` refleja el estado actual de la UI (si aplica).
- [ ] Ningún archivo editado tiene llaves `{}`, paréntesis `()` o corchetes `[]` desbalanceados (verificar manualmente si es necesario).

---

## 🔄 Flujo de Trabajo Obligatorio (The AI Loop)

1. **Sincronización**  
   - Leer `PROTOCOL.md` → Leer `TASKS.md` → Leer `SESSION_CACHE.json`.  
   - Resultado: Conoces el punto de partida exacto y las reglas de seguridad.

2. **Ejecución con Heartbeats**  
   - Antes de cada cambio complejo, escribe en `TASKS.md`:  
     `- [ ] Iniciando cambio en <Archivo> (Línea X) - Objetivo: Y`  
   - Si la operación es larga, inserta un comentario temporal en el código:  
     `// TODO: [CONTINUE HERE] - Logic for Z`

3. **Validación y Cierre**  
   - Al terminar (o antes de que se acabe la cuota):  
     a. Corre `npm run lint` y `npm run typecheck`.  
     b. Actualiza `TASKS.md` marcando lo completado y agregando un nuevo checkpoint si queda trabajo pendiente.  
     c. Actualiza `SESSION_CACHE.json` con el estado final de la UI.  
     d. Escribe un resumen de cierre en `TASKS.md`:  
        `"Cierre de sesión: Tarea X completada al 80%. Falta Y. Archivos tocados: A, B"`.

---

## 📓 Ejemplo de Checkpoint en `TASKS.md`

```markdown
## [2026-07-13 10:30] Checkpoint: Generando léxico para "agua"
- Archivos tocados: `src/services/geminiService.ts` (líneas 180-190), `src/components/EntryEditor.tsx` (línea 50)
- Acción: Llamada a `generateRootAndLexeme` con perfil generativo activo.
- Estado UI: Tab `workbench` activa, modo `add`, datos preliminares cargados.
- Próximo paso: Esperar respuesta de IA y llenar campos de entrada.
```

---

### 📝 Referencias
- [`SQL-MIGRATION-GUIDE.md`](../SQL-MIGRATION-GUIDE.md) – Fuente de principios de prevención de corrupción.