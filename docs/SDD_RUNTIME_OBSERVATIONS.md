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

## Objetivo de diseño: interfaz Harness / Canvas con árbol del lenguaje
**Visión deseada:** rediseñar la navegación para que LOXAR se sienta como un entorno vivo y creativo.
- Reemplazar la tira horizontal de tabs por una **barra lateral vertical de iconos**.
- El área principal pasa a ser un **canvas limpio** donde se visualiza el lenguaje en sí.
- Mostrar siempre un ** árbol navegable del lenguaje**: módulos, gramática, léxico, fonología, escritura, etc., como nodos expandibles.
- Al hacer hover en iconos de la barra lateral, mostrar el nombre del módulo.
- Cada módulo se abre como **ventana flotante modal** sobre el canvas, no como pantalla completa.
- El Dashboard debe ser la primera vista flotante: métricas, acciones rápidas, exportar todo, metadata del conlang, estadísticas.
- Arbol vivo: desde nodo raíz hasta hojas; al hacer click se hace zoom y se muestra el detalle en otro árbol/ventana.
- Objetivo UX: que el usuario sienta que está **construyendo** el lenguaje, no solo editando entradas.
- Restricción: toda la funcionalidad actual debe mantenerse; solo cambia la presentación y el flujo de navegación.

## Unificación del canvas de gramática + árbol del lenguaje
**Cambio estructural:** el antiguo canvas/grafo de gramática y el árbol del lenguaje ahora son una sola capa: `LanguageTreeCanvas`.
- `LanguageTreeCanvas` renderiza el **árbol base** (fonología, morfología, sintaxis, léxico, semántica, neografía) como fondo permanente.
- Sobre ese árbol, inyecta un **grafo vivo** derivado del `grammar` activo y el `lexicon` cargado:
  - Categorías gramaticales.
  - Reglas de morphology/syntax/phonology.
  - Excepciones.
  - Conteo de entradas por categoría desde el léxico.
- Esto reemplaza el diagrama/flujo separado anterior: ya no hay dos visiones distintas, hay una sola **vista de lenguaje**.
- Los paneles flotantes (`ModulePanel`) se abren sobre este canvas sin taparlo completamente, conservando la sensación de profundidad.

## Próximo paso
Una vez completado el testing runtime, este archivo se convierte en backlog priorizado para el SDD.
