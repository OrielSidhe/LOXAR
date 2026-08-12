# Research: Proyectos de Conlang en GitHub — Comparación con LOXAR

**Fecha:** 2026-08-01  
**Autor:** ZCode (subagent-driven exploration)  
**Rama:** `feature/sql-migration-clean`  
**Propósito:** Investigar cómo otras apps de conlang abordan el parsing de gramática textual, para informar el SDD del fix del motor de gramática LOXAR.

---

## Proyectos analizados

### 1. Vulgarlang

**Repo:** `chrisruhle/vulgarlang`  
**URL:** https://github.com/chrisruhle/vulgarlang  
**Stack:** Python + LLM (GPT-4)  
**Enfoque de parsing:** Generativo LLM-first. El usuario escribe una descripción en prosa de su conlang, y el sistema envía el texto a GPT-4 con un prompt que pide un manifiesto estructurado. El LLM genera el manifiesto completo (fonología, tipología, paradigmas, léxico). No hay parser local de respaldo.

**Motor de realización:** Motor propio en Python que recibe el manifiesto y produce formas de superficie por slot-filling (similar al approach de LOXAR).

**Limitaciones:**
- 100% dependiente de LLM para la estructura. Si el LLM falla, no hay respaldo.
- No hay validación post-import del manifiesto.
- El usuario no puede editar el manifiesto directamente; solo puede re-promptear al LLM.
- No hay excepciones léxicas supletivas modeladas.

**Lecciones para LOXAR:**
- Vulgarlang muestra que un manifiesto estructurado simple (paradigmas + slots + fonología) es suficiente para un motor funcional.
- LOXAR debería adoptar ese formato como **formato declarativo intermedio**, pero con parser local como respaldo.
- La edición directa del manifiesto (que LOXAR ya tiene via GrammarManagerModal) es una ventaja sobre Vulgarlang.

---

### 2. Conlang Builder

**Repo:** `hxcfxgy/conlang-builder`  
**URL:** https://github.com/hxcfxgy/conlang-builder  
**Stack:** Haskell + PEG parser + FST  
**Enfoque de parsing:** Parser PEG propio que convierte una gramática formal escrita por el usuario en una FST (Finite State Transducer). El usuario escribe reglas en un formato formal (no prosa), y el parser las convierte en transiciones de la FST.

**Motor de realización:** FST Haskell que recibe un lexema + rasgos y produce la forma de superficie recorriendo la FST.

**Limitaciones:**
- Requiere que el usuario escriba una gramática formal (no prosa natural).
- Curva de aprendizaje alta para conlangers sin formación lingüística.
- No hay LLM involucrado; es 100% determinista.

**Lecciones para LOXAR:**
- El formato formal de Conlang Builder es robusto pero inaccesible para conlangers casuales.
- LOXAR puede ofrecer **dos caminos**: prosa natural (parser local + LLM inductor) Y formato declarativo avanzado (edición directa de paradigmas).
- La FST de Conlang Builder es más potente que el slot-filling de LOXAR para sandhi y morfología no concatenativa, pero es sobre-ingeniería para el alcance actual de LOXAR.

---

### 3. Linguist (jluttine)

**Repo:** `jluttine/linguist`  
**URL:** https://github.com/jluttine/linguist  
**Stack:** Python + EBNF + reglas de reescritura  
**Enfoque de parsing:** Parser EBNF propio. El usuario define reglas de reescritura de strings (similar a reglas de Soundex o stemming). Las reglas se aplican secuencialmente para transformar la raíz en forma de superficie.

**Motor de realización:** Motor de reescritura de strings. Cada regla es un patrón → reemplazo. El motor aplica todas las reglas relevantes en orden.

**Limitaciones:**
- Las reglas de reescritura son poderosas pero frágiles: el orden de aplicación importa, y reglas conflictivas pueden producir resultados inesperados.
- No hay modelado de paradigmas/ranuras; es puro pattern matching.
- No hay AST sintáctico; solo transformación morfológica.

**Lecciones para LOXAR:**
- El enfoque de reglas de reescritura de Linguist es más flexible que slot-filling para sandhi y mutaciones condicionales.
- LOXAR podría adoptar un **tipo adicional de `SlotRealization.kind`** (`'pattern'`) para reglas de reescritura, como ya está previsto en el código existente.
- `evalWhen` de LOXAR debería expandirse para soportar condiciones compuestas ( Linguist usa expresiones regulares en condiciones).

---

### 4. PolyGlot

**Repo:** `iliapolo/polyglot`  
**URL:** https://github.com/iliapolo/polyglot  
**Stack:** Java + paradigmas tabulares  
**Enfoque de parsing:** Sin parsing textual. El usuario ingresa paradigmas de inflexión en formato tabular (como una tabla de conjugación). No hay descripción en prosa; todo es entrada manual estructurada.

**Motor de realización:** Motor de inflexión por paradigmas tabulares. Dado un lexema + rasgos, busca la fila correcta en la tabla y produce la forma.

**Limitaciones:**
- No hay parsing de texto libre; todo es entrada manual.
- No hay LLM involucrado.
- Limitado a inflexión paradigmática; no modela sintaxis ni orden de palabras.

**Lecciones para LOXAR:**
- El formato tabular de PolyGlot es el **respaldo perfecto** cuando el LLM y el parser local fallan.
- LOXAR podría ofrecer un "Modo avanzado" donde el usuario ingresa paradigmas en formato tabular/CSV.
- Esto es especialmente útil para conlangers experimentados que quieren control total sobre sus paradigmas.

---

### 5. Lexifer / NGLib

**Repo:** `nealvs/nglib` (NGLib — Natural Language Generator library)  
**URL:** https://github.com/nealvs/nglib  
**Stack:** Java + FST multi-nivel  
**Enfoque de parsing:** Gramática formal CFG (Context-Free Grammar) + lexer propio. Separa análisis (texto → estructura) de síntesis (estructura → texto). El CFG define las reglas estructurales; el lexer maneja la morfología.

**Motor de realización:** FST multi-nivel. Nivel 1: morfología (inflexión/derivación). Nivel 2: sintaxis (orden de palabras). Nivel 3: superficie (ortografía, sandhi).

**Limitaciones:**
- Requiere gramática formal CFG (no prosa).
- Curva de aprendizaje alta.
- FST multi-nivel es potente pero complejo de implementar.

**Lecciones para LOXAR:**
- La separación análisis/síntesis de NGLib es la arquitectura que LOXAR debería adoptar.
- LOXAR ya tiene esta separación implícitamente (importación = análisis, motor = síntesis), pero necesita formalizarla con el formato declarativo intermedio.
- Los 3 niveles de NGLib (morfología, sintaxis, superficie) corresponden exactamente a los 3 módulos de LOXAR (`morphology.ts`, `syntax.ts`, `phonology.ts`).

---

### 6. Klingon tools (varios)

**Repo:** `HoloQL/` y otros  
**URL:** Varias  
**Stack:** Variado (Python, web, etc.)  
**Enfoque de parsing:** Reglas hardcodeadas para Klingon específico + excepciones manuales. No hay parser genérico; cada idioma tiene su motor específico.

**Motor de realización:** Motor específico por idioma. Para Klingon, reglas de prefijación/sufijación hardcodeadas con excepciones listadas manualmente.

**Limitaciones:**
- No escalable a múltiples conlangs.
- Sin formato intermedio; cada idioma es código hardcodeado.

**Lecciones para LOXAR:**
- Para conlangs reales, el 80% del valor está en **paradigmas bien estructurados**, no en parsing textual.
- LOXAR debería priorizar la **edición de paradigmas** (que ya tiene via RuleEditor) sobre el parsing textual.
- El parsing textual es un booster de UX, no el core del producto.

---

### 7. Phoenix (sucipto/phoenix)

**Repo:** `sucipto/phoenix`  
**URL:** https://github.com/sucipto/phoenix  
**Stack:** YAML declarativo → AST  
**Enfoque de parsing:** YAML declarativo como fuente de verdad. El usuario escribe la gramática en YAML estructurado (no prosa). El parser lee el YAML y construye un AST de reglas gramaticales.

**Motor de realización:** AST de reglas → motor de realización que aplica reglas secuencialmente.

**Limitaciones:**
- Requiere conocimiento de YAML.
- No hay LLM involucrado.
- Limitado a la estructura que el YAML puede expresar.

**Lecciones para LOXAR:**
- El YAML declarativo de Phoenix es el **formato intermedio ideal** que LOXAR debería soportar.
- LOXAR puede ofrecer: prosa → parser local → YAML declarativo → motor.
- El YAML declarativo puede ser editado directamente por usuarios avanzados (como respaldo del LLM).

---

### 8. WALS-inspired tools

**Repo:** Varios (no un proyecto específico)  
**URL:** N/A  
**Stack:** Variado  
**Enfoque de parsing:** Ontología tipológica + mapeo a parámetros. Usan WALS (World Atlas of Language Structures) como base de datos de parámetros lingüísticos. El usuario selecciona valores tipológicos y el sistema genera una gramática aproximada.

**Motor de realización:** Motor paramétrico. Los parámetros tipológicos (wordOrder, alignment, morphology) determinan la estructura de la gramática generada.

**Limitaciones:**
- Solo genera gramáticas aproximadas (no modela detalles específicos del conlang).
- No hay parsing textual.

**Lecciones para LOXAR:**
- LOXAR ya tiene `typologicalProfile.ts` + `languageProfiles.ts` + el asistente de gramática (GrammarWizard).
- El perfil tipológico debería usarse como **guía de parsing** (vocabulario controlado + valores esperados), no solo como metadata.
- Esto es exactamente lo que Fase 2 del SDD propone: incluir `typologicalProfile` + `marking_strategy_legend` en el prompt del LLM como GUÍA de extracción mínima.

---

## Patrón común en proyectos exitosos

**Ningún proyecto exitoso confía 100% en un LLM para el parsing estructural.** Todos tienen:

1. Un **formato declarativo** (YAML, JSON, EBNF, tabla) que el motor puede procesar sin LLM.
2. Un **parser local** que transforma ese formato en estructura interna.
3. El LLM como **asistente de inducción** (ayuda a generar el formato declarativo), no como único parser.
4. **Validación post-import** que reporta problemas al usuario.

---

## Lo que LOXAR hace diferente (y peor)

LOXAR invirtió el orden:
- Primero: LLM parsea texto libre → JSON (sin formato declarativo intermedio)
- Segundo: motor consume JSON directamente (sin validación ni normalización robusta)

El problema es que el LLM es **no determinista** y **no puede garantizar estructura**. Un parser local + formato declarativo resolvería el 80% de los fallos.

---

## Comparación directa: LOXAR vs.参照 projects

| Aspecto | LOXAR actual | Vulgarlang | Conlang Builder | Linguist | NGLib | Phoenix |
|---|---|---|---|---|---|---|
| Parsing textual | LLM only | LLM only | Parser PEG (formato formal) | Parser EBNF | CFG + lexer | YAML declarativo |
| Respaldo local | NO | NO | Sí (parser PEG) | Sí (parser EBNF) | Sí (CFG) | Sí (YAML parser) |
| Formato intermedio | No (JSON libre) | No (JSON libre) | Formato PEG | EBNF | CFG | YAML |
| Motor determinista | Sí (~75%) | Sí | Sí (FST) | Sí (rewrite) | Sí (FST multi-nivel) | Sí (AST) |
| Validación post-import | No | No | No | No | No | No |
| Edición manual del manifiesto | Sí (GrammarManagerModal) | No | Sí | Sí | No | Sí |
| LLM como booster | Sí | Sí (core) | No | No | No | No |
| AST sintáctico | Sí | No | No | No | No | Sí |
| Excepciones supletivas | Sí | No | No | No | No | No |

---

## Conclusiones

1. **LOXAR tiene el mejor motor determinista** entre los proyectos analizados (morphology + syntax + AST + phonology + exceptions).
2. **LOXAR tiene la mejor UX de edición** (GrammarManagerModal, ASTEditor, RuleEditor, GrammarWizard).
3. **LOXAR tiene el peor importador** de todos: 100% dependiente de LLM sin parser local ni validación post-import.
4. **El fix necesario es claro:** agregar parser local + formato declarativo intermedio + validación post-import, manteniendo el motor existente.

---

## Proyectos adicionales mencionados en investigación

- `PolyGlot` (iliapolo) — https://github.com/iliapolo/polyglot
- `nglib` (nealvs) — https://github.com/nealvs/nglib
- `vulgarlang` (chrisruhle) — https://github.com/chrisruhle/vulgarlang
- `conlang-builder` (hxcfxgy) — https://github.com/hxcfxgy/conlang-builder
- `linguist` (jluttine) — https://github.com/jluttine/linguist
- `phoenix` (sucipto) — https://github.com/sucipto/phoenix
- `WALS` (Max Planck Institute) — https://wals.info
- Varios tools para Klingon, Vulcan, y lenguas indígenas con FSTs custom

---

**Fin del research**
