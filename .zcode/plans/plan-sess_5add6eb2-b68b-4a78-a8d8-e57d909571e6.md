DIAGNÓSTICO (qué pasó)

1) Navegación "Completar" rota: App.tsx:67 declara entryToComplete como null y nunca se le asigna valor (solo se lee en App.tsx:517 como entryBeingEdited). En modo completar el editor siempre recibe null, así que las flechas (onNavigateIncomplete) solo mueven el contador incompleteIndex pero no cargan ninguna entrada → "nada pasa".

2) Error del AI Grammar Mapper: el mensaje "No se pudo parsear el JSON. Error en la llamada a la IA" es engañoso. El texto "Error en la llamada a la IA" viene del catch de callAi (geminiService.ts:104), o sea la LLAMADA falló (API/red/modelo), no el parseo. Además handleGenerateGraph (SyntaxCanvas.tsx:297) hace JSON.parse frágil.

3) Resultados de IA no visibles en workbench: handleAiComplete/handleAiGenerate (EntryEditor.tsx:279-349) SÍ llenan los campos cuando la IA responde. Si "nunca se ven" es porque la llamada a la IA falla (mismo root cause #2). El modelo por defecto gemini-1.5-flash está siendo descontinuado por Google en 2025 → todas las llamadas fallan.

4) Estrategias morfosintácticas poco intuitivas: en GrammarTab.renderStrategies (GrammarTab.tsx:545) "Aplica a Roles" es un multi-select de roles internos técnicos. El usuario quiere dropdown con categorías reales del léxico.

5) Palabra no aparece / Guardar no se ilumina: por el código, addWord (useLexicon.ts:333) debería actualizar estado e isDirty en vivo; no hay bug de estado obvio en el source. Sospecha: el build dist/ que corre Tauri está desactualizado tras la restauración, o handleSubmit hace una llamada AI (onCorrectSignificado) en cada guardado que puede colgar. Se verificará en runtime.

PLAN

A) Conectividad y robustez de IA (geminiService.ts, AiSettingsModal.tsx): añadir geminiModel (default gemini-2.5-flash) y ollamaModel a AiSettings + selector en Ajustes; usar settings.geminiModel en callAi y testAiConnection; parseJsonSafely robusto (extraer substring JSON real + cleanseJson como respaldo).

B) AI Grammar Mapper (SyntaxCanvas.tsx): separar try/catch de la llamada del del parseo para mensaje preciso; tras generar mostrar vista previa ("N nodos generados") con botón Aplicar explícito.

C) Banner "Resultado IA" en workbench (EntryEditor.tsx): cuando isAiPopulated, mostrar banner visible con Regenerar (re-ejecuta última acción) y Quitar resaltado (mantiene campos); error de IA mostrado claramente.

D) Estrategias roles + categorías del léxico (types.ts, nuevo MultiSelectDropdown.tsx, GrammarTab.tsx, GrammarManagerModal.tsx): nuevo campo appliesToCategories?: string[]; nuevo componente MultiSelectDropdown reutilizable (popover con checkboxes); en Estrategias mantener multi-select de Roles y añadir "Categorías del léxico" alimentado por Categoría únicas del léxico; espejo en GrammarManagerModal.

E) Navegación "Completar" (App.tsx): efecto que sincroniza entryToComplete = incompleteEntries[incompleteIndex] cuando editorMode==='complete'; efecto que acota incompleteIndex cuando cambia la lista; handleLookupForCompletion ("IR") carga la entrada encontrada en modo completar dentro del workbench.

F) Verificación: npm run build + tsc; correr dev server y reproducir: añadir palabra (aparece en vivo + ilumina Guardar*), modo completar (flechas navegan), Generar/Completar IA (banner + campos llenos), AI Grammar Mapper (sin error, vista previa). Si el bug #5 persiste tras rebuild, instrumentar y arreglar causa real.