# LOXAR — Observaciones de runtime para SDD
**Formato:** notas vivas mientras se prueba `npm run tauri dev`.  
**Objetivo:** convertir cada observación en requisito concreto para pulir el SDD y las tareas pendientes.

---

## Cómo usar este archivo
- Copiá cada observación como checklist abajo.
- Si algo falla, anotá pasos para reproducir.
- Si falta una función esperada, anotar qué debería hacer.
- Si algo se ve bien pero podría mejorar, anotarlo en `Mejoras UI/UX`.
- Cada ítem debería poder mapearse a una tarea ejecutable en `docs/continuity/TASKS.md`.

---

## Crash / Bugs observados
- [ ] `npm run tauri dev` —describe el error exacto—
- [ ] `npm run tauri build` —describe el error exacto—
- [ ] FTS5 —¿la búsqueda no trae resultados, tarda mucho, o falla con caracteres especiales?—
- [ ] InterlinearGlossViewer —¿no glosa, falla con palabras compuestas, o se cuelga?—
- [ ] SoundChangeWorkbench —¿las reglas no aplican, el historial falla, o hay crash al aplicar al léxico?—
- [ ] Translator offline —¿no traduce offline, mezcla idiomas, o se queda cargando?—
- [ ] sessionCache —¿no persiste el tab, pierde el tour, o se pierde al cerrar la app?—
- [ ] ErrorBoundary —¿se muestra mal, no recupera, o rompe el scroll?—

---

## Funcionalidades faltantes
- [ ] Temas de color —¿faltan colores, contraste, persistencia de tema?—
- [ ] Animaciones —¿faltan transiciones, microinteracciones, feedback visual?—
- [ ] Audio —¿falta jingle memorable, click satisfactorio, feedback sonoro?—
- [ ] Icono —¿el icono no se ve bien en taskbar, installer, o favicon?—
- [ ] UI general —¿botones planos, falta jerarquía visual, texto poco legible?—

---

## Mejoras UI/UX
- [ ] Botones más “clickeables” con relieve/sombra y estados hover/active más marcados
- [ ] Click sonoro satisfactorio en botones principales
- [ ] Transiciones suaves entre tabs y modales
- [ ] Microinteracciones en tabla: hover en filas, selección, foco
- [ ] Splash screen más memorable con logo LOX + jingle
- [ ] Tema oscuro/base agradable, con acentos vibrantes pero no agresivos
- [ ] Tipografía más cómoda para lectura larga
- [ ] Feedback visual de carga más claro

---

## Rendimiento / Optimización
- [ ] Bundle principal aún muy pesado: ¿afecta al arranque?
- [ ] ¿Las animaciones consumen CPU/iGPU en máquinas sin GPU?
- [ ] ¿Hay cuelgues al abrir el TranslationPlayground o SoundChangeWorkbench?

---

## Próximo paso
Una vez completado el testing runtime, este archivo se convierte en backlog priorizado para el SDD.
