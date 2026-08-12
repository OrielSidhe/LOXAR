# Grammar UX — Fase 5: amigable para conlangers

**Meta:** la gramática debe ser usable sin "capacitación previa". Tres piezas:
1. **Grammar Wizard** — el usuario elige un "perfil de lenguaje" (Turco/Latín/Chino/Mandarín/Inuit…) y la app pre-rellena tipología + fonología + esqueletos de paradigma, y **oculta secciones irrelevantes** (p.ej. tono solo para perfiles tonales). Sustituye al "guided tour" como onboarding.
2. **Pistas "i" por sección** — tooltip corto en Resumen, Tipología, Fonología, Morfología/Paradigmas, Sintaxis, Excepciones que explica el concepto en lenguaje de conlanger (ej. "Un paradigma de inflexión es la tabla de todas las formas de una palabra según tiempo/número/persona…").
3. **Morfología visible en el canvas (desglose por palabra)** — al seleccionar un nodo de palabra en `SyntaxCanvas`, se despliega su estructura morfológica (raíz + afijos) como sub-nodos conectados, derivados del motor (`realizeLexeme`).
4. **Sincronía gramática→canvas** — cambiar paradigma/tipología reordena y actualiza los nodos/morfemas en el lienzo, no solo el live preview.

Walkthrough de ejemplo documentado: "crea una lengua flexiva tipo latín" paso a paso, para que la prueba sea concreta.

---

## Workstream 1 — Grammar Wizard (primero)

**Nuevo:** `src/data/languageProfiles.ts` con `LanguageProfile[]`:
```ts
export interface LanguageProfile {
  id: string;
  label: string;            // "Flexivo (tipo Latín/Español)"
  description: string;      // una línea amable
  typology: { wordOrder: string; alignment: string; morphology: string; headDirection: string };
  phonology?: { consonants: string[]; vowels: string[]; syllableStructures: string[] };
  paradigms: CategoryParadigm[];   // esqueletos de partida
  mutationRules: MutationRule[];
  showTone: boolean;        // superficie de tono/mutación solo si aplica
  sample?: { spanish: string; conlang: string };
}
```

Perfiles iniciales (simplificados pero razonables):
- **aglutinante-turco**: SOV, aglutinante, Head-Final; paradigma `verbo` con ranuras `tense`(1)/`person`(2)/`number`(3); inventario tipo turco; `showTone:false`.
- **flexivo-latin**: SVO, fusional, Head-Initial; `verbo` ranuras `tense`/`person`/`number` (fusionadas) + `sustantivo` ranuras `case`/`number`/`gender`; inventario tipo latín; `showTone:false`.
- **aislante-chino**: SVO, aislante, Head-Initial; `paradigms:[]` (casi nulo); `showTone:true`.
- **tonal-thai**: SVO, tonal, `showTone:true`; `mutationRules` con ejemplo de tono.
- **polisintetico-inuit**: SOV, polisintético; `verbo` con muchas ranuras (tense/person/number/possessor…).

**Nuevo:** `src/components/GrammarWizard.tsx` (modal multi-paso):
- Paso 1: tarjetas de perfil (botón "Usar este perfil").
- Paso 2: nombre de la lengua + rasgos básicos editables (wordOrder, alineamiento) con ayuda.
- Paso 3: revisión → `onApply(profile)` que construye un `GrammarManifest` (mantiene `meta`/`notes`/`syntaxCanvas` existentes, sustituye `typology`/`phonology`/`paradigms`/`mutationRules`) y lo guarda.
- Respeta `showTone` para mostrar/ocultar el área de tono en la UI de morfología.

**Wire:** botón "Asistente de gramática" en `GrammarTab` (cabecera de la pestaña Gramática) que abre `GrammarWizard`. También auto-abrir si `manifest` está vacío (sin paradigmas ni tipología definida) la primera vez.

**Verificación:** `npm run typecheck` (0 errores nuevos), `npm run build`, `npm run lint`.

---

## Workstream 2 — Pistas "i" por sección (ligero, junto a W1)

En `GrammarTab`, añadir un componente `InfoHint` (tooltip) junto al título de cada sub-módulo con texto plano:
- Resumen: "Progreso general de tu gramática."
- Tipología: "Cómo se ordenan las palabras y cómo se marca quién hace qué (sujeto/objeto)."
- Fonología: "Los sonidos permitidos y cómo se combinan en sílabas."
- Morfología/Paradigmas: "Un paradigma de inflexión es la tabla de formas de una palabra según tiempo, número, persona… Aquí defines las ranuras."
- Sintaxis: "El lienzo donde ves la oración como cajas conectadas."
- Excepciones: "Palabras irregulares (como ser/estar) que no siguen las reglas."

**Verificación:** typecheck/build/lint.

---

## Workstream 3 — Desglose por palabra en el canvas

`SyntaxCanvas` ya recibe `lexicon`. Añadir prop opcional `grammar?: GrammarManifest`. Al seleccionar un nodo de tipo `word`, computar `realizeLexeme(node.lexeme, features, grammar)` (import del motor) y renderizar sub-nodos conectados: `raíz` + cada afijo (`suf:-t`, etc.) + partículas libres. No modificar la lógica de edición existente; es una vista adicional al seleccionar.

**Verificación:** typecheck/build/lint; el sub-agente debe confirmar que seleccionar un nodo de palabra con paradigma muestra los morfemas.

---

## Workstream 4 — Sincronía gramática→canvas

En `GrammarTab`, al entrar al sub-tab "canvas" (o cuando cambia `effectiveManifest`), sembrar/actualizar el `SyntaxCanvas` desde `realizeClause` (que ya emite nodos ordenados por tipología + morfemas). Los cambios de paradigma/tipología se reflejan gráficamente (reorden de nodos, morfemas actualizados), no solo en el live preview. Mantener la edición manual del usuario cuando no haya cambiosestructurales.

**Verificación:** typecheck/build/lint.

---

## Documentación de ejemplo (walkthrough concreto)
Añadir al final de `docs/superpowers/specs/2026-07-14-grammar-engine-design.md` (o nuevo doc) un paso a paso: "Crea una lengua flexiva tipo latín": abre Gramática → Asistente → elige Flexivo (Latín) → revisa → guarda → ve al Preview → elige un verbo → observa `verbo-t-p3` (o similar) → añade excepción ser/estar. Esto da pasos específicos de prueba.

---

## Riesgos / notas
- El motor no modela armonía vocálica ni tono real; los perfiles aglutinante/tonal llevan `mutationRules` de muestra pero la realización es aproximada (limitación honesta ya documentada).
- W3/W4 no deben romper la edición manual del canvas (el AI Mapper sigue funcionando).
- No tocar `NeographyModal`/`NeographyImageTracer` (errores preexistentes fuera de alcance).
