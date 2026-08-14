# LOXAR — Protocolo de Operación del Agente (SOP)
**Versión:** 1.0 — 2026-08-14
**Alcance:** toda sesión o automatización (cron) en el repo LOXAR (Conlang Lexicon Manager).
**Lectura obligatoria** antes de cualquier cambio. Reemplaza instrucciones vagas previas que dejaban al
agente como "lector/validador" en vez de "implementador".

---

## 0. Memoria de proyecto (dónde vive el estado)
El agente y la automatización SIEMPRE consultan y actualizan estos archivos (la "memoria" del proyecto):

- `docs/LOXAR_AUTO_PILOT.md` — **memoria viva**: Objetivo, Estado actual, Próxima tarea activa. Se actualiza en CADA sesión.
- `docs/LOXAR_OPERATING_PROTOCOL.md` — este SOP (cómo trabajar).
- `docs/continuity/TASKS.md` — tablero de tareas con checkpoints (puntos de recuperación).
- `docs/continuity/SESSION_CACHE.json` — estado de UI / contexto de IA.

**Regla de oro:** todo cambio de código o decisión se refleja en la memoria ANTES de cerrar. No dejar la
memoria desactualizada (eso rompió el ciclo antes: el auto-pilot decía "todo `[x]`" mientras el trabajo
real seguía pendiente). La memoria es la fuente de verdad que el cron lee al arrancar.

## 1. Al iniciar (startup)
1. Cargar el skill `loxar-continuity`.
2. Leer los 4 archivos de memoria arriba.
3. Resumir en 3-5 líneas: qué se está trabajando, último checkpoint, próxima acción marcada `[ ]`.
4. Verificar que la memoria no esté obsoleta (fechas, tareas cerradas vs. abiertas, contradicciones).

## 2. Resolución de requerimientos (protocolo tipo ITIL / SDD)
Para cada instrucción del usuario o tarea pendiente:
- **a) Comprender (active listening):** parafrasear el problema en mis palabras. Si hay ambigüedad → paso **b**.
- **b) Proving questions:** si no queda claro el objetivo, alcance, restricciones o criterio de aceptación,
  hacer preguntas concretas (máx. 3-5) y confirmar comprensión ANTES de actuar. No asumir.
- **c) Plan:** definir cómo lograr el objetivo; estructurar plan con pasos, riesgos y **criterio de "done"**.
  El plan se vuelca a la memoria (`TASKS.md` / `AUTO_PILOT`) y, si es grande, a un doc SDD bajo
  `docs/superpowers/specs|plans`. Proceder tras aprobación/implementación.
- **d) Contexto conciso:** el contexto que se envía al modelo debe ser mínimo y actualizado. Leer SOLO la
  memoria + los archivos de código estrictamente necesarios para la tarea. No volcar todo el repo. Mantener
  `TASKS.md` con checkpoints cortos; mover detalles largos a docs y referenciarlos.
- **e) Ejecutar:** implementar siguiendo el plan; validar con `npm run typecheck`, `npm run lint`,
  `npm run build` (y `npm run tauri:build` si se toca Rust). Evaluar seguridad/riesgo de cada cambio.
- **f) Seguridad:** TODA acción que comprometa la seguridad del sistema (borrar/sobrescribir datos,
  cambiar permisos fs, mover archivos del usuario, cambiar deps/credenciales, ejecutar comandos con efectos
  externos) REQUIERE notificación previa con: nombre de acción, riesgo, porqué es riesgo, alternativas,
  pros/contras, % de viabilidad. Esperar autorización.

## 3. Loop de validación
Tras implementar, evaluar contra el criterio de aceptación. Si no cumple → volver a 2e/2f hasta cumplir.
No declarar "hecho" si falla el build o el criterio.

## 4. Captura de conocimiento
Al solventar un requerimiento, registrar el procedimiento exitoso. Si es reutilizable, guardarlo como skill;
**evitar skills redundantes**: unificar o eliminar skills obsoletos que ya no se requieran.

## 5. Mejora de la comunicación (feedback al usuario)
Evaluar cada solicitud: si la imprecisión de la petición fue la causa de retrabajo o ambigüedad, decírtelo
explícitamente para que mejores tus prompts. Ciclo de aprendizaje mutuo.

## 6. Detección temprana de riesgo
Si detecto algo que pueda derivar en ciclos negativos, estancamiento, degradación o troubleshooting
costoso, avisar de inmediato y dar alternativas.

## 7. Reglas de no-corrupción (vigentes, de PROTOCOL.md)
- Nunca dejar código con sintaxis rota.
- Commitear solo con validaciones en verde.
- Actualizar memoria + checkpoint antes de cerrar.

## 8. Limitación conocida (runtime)
El agente headless no puede observar la GUI de `npm run tauri:dev`. Por eso: la validación del agente es
estática (typecheck/lint/build/tauri:build); la validación visual la hace el usuario. Si se quiere cubrir
el runtime, se debe crear un smoke test automatizado (fuera de alcance salvo que se pida).
