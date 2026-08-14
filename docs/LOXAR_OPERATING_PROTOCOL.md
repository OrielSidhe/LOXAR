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

## 9. Validación GUI automatizada (recurso-intensiva — SIEMPRE notificada y opt-in)
Existe `npm run test:gui` (Playwright, modo web headless) que conduce la app y detecta crashes silenciosos
/ regresiones visuales sin que el usuario pegue screenshots. Reglas:
- **NUNCA se corre en silencio ni como parte del ciclo horario.** Es acción que consume CPU/disco y puede
  ralentizar otras actividades del usuario en la PC.
- **Siempre avisar antes:** el agente debe notificar (nombre de acción, impacto estimado de recursos, ETA)
  y esperar autorización del usuario antes de instalar navegadores (one-time ~Chromium) o de ejecutar el test.
- En la primera corrida hay que instalar dependencias (`npm i` ya incluye `@playwright/test`; luego
  `npx playwright install chromium` descarga el navegador una vez).
- Los diálogos nativos de Tauri (Guardar/Abrir `.loxar`) NO se automatizan acá; ese flujo se cubre con
  tests de lógica (`projectFile`/`projectDiscovery`) y validación manual del usuario.
- Reportar resultado de forma concisa (pass/fail + errores) en la memoria y al usuario.

## 10. Buenas prácticas de coding
Todo código nuevo o modificado debe cumplir estándares altos (el repo se sube a GitHub; solo va lo necesario):
- **Limpio y breve:** funciones pequeñas con una sola responsabilidad; archivos cohesionados; sin código muerto ni ramas comentadas.
- **Comentarios solo donde sea necesario:** NO documentar el "qué" (eso lo dice el código), sino el "por qué" cuando no es obvio (constraints del dominio, compatibilidad Tauri, decisiones de arquitectura). Prohibido el comentario que solo repite el código.
- **Nombres claros y consistentes** con el resto del proyecto; sin abreviaturas crípticas.
- **Sin notas que ensucien el repo:** no dejar `TODO` vagos, comentarios tipo "fixme" ni documentación de trabajo dentro de `src/`. El progreso vive en la memoria (`docs/`), no en el código.
- **Separación de responsabilidades:** UI en `src/components`, lógica en `src/services`, estado en `src/hooks`, datos estáticos en `src/data`, tipos en `src/types.ts`. No acoplar lógica de dominio a componentes.

## 11. Awareness del proyecto (visión holística / análisis de impacto)
Antes de tocar nada, el agente debe tener **conciencia del proyecto en su conjunto**, no solo resolver lo pequeño:
- **Mapear el alcance del cambio:** identificar qué otros módulos llaman/son llamados por el código a modificar (callers/dependents). Un "arreglo local" (p. ej. una variable o identidad nueva solo válida para ese botón) puede romper partes conectadas.
- **No introducir identidades locales que orfanden otras features:** si se renombra/agrega un campo, tipo, prop o evento, verificar que todos los consumidores lo respetan (búsqueda global, no asumir).
- **Pensar en el sistema, no en el síntoma:** el objetivo es que el cambio mejore el proyecto sin regresiones silenciosas en lo conectado.
- **Al dudar del impacto, preguntar** (ver §2b) o dejar un checkpoint en la memoria antes de editar.
