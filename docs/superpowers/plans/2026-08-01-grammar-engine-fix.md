# Plan: Fix del Motor de Gramática LOXAR

**Rama:** `feature/sql-migration-clean`  
**Spec base:** `docs/superpowers/specs/2026-08-01-grammar-engine-fix-design.md`  
**Autor:** Victor Sidhe / ZCode  
**Fecha:** 2026-08-01

---

## Objetivo

Transformar el módulo de gramática de "importador frágil + motor aislado" a pipeline completo:
texto libre → parser local → formato declarativo → normalización → manifiesto → motor → formas de superficie.

**Entregable mínimo viable:** Fase 1 (parser local) + Fase 5 (estrategias→motor) hacen que el módulo sea funcional sin depender de LLM.

---

## Tareas por fase

### Fase 0 — Preparación (sin tocar código de producción)

| # | Tarea | Archivo | Acción | Crit. Aceptación |
|---|---|---|---|---|
| 0.1 | Crear interfaces del formato declarativo | `src/services/grammar/declarativeFormat.ts` (NUEVO) | Escribir interfaces `DeclarativeSlot`, `DeclarativeParadigm`, `DeclarativeManifest`, `ParseReport` | `tsc` compila sin errores |
| 0.2 | Crear stub de test suite | `src/services/grammar/__tests__/textParser.test.ts` (NUEVO) | Suite vacía con imports de `textParser` | Archivo existe, suite vacía, `tsc` OK |

**Verificación:** `npm run typecheck` = 0 errores nuevos.

---

### Fase 1 — Parser Local (TDD estricto)

**Archivos nuevos:** `src/services/grammar/textParser.ts`  
**Archivos modificados:** ninguno  
**Tests:** `textParser.test.ts` (10 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 1.1 | `parseLocal` extrae tipología de prosa | Detectar secciones por headers (§ Tipología, § Word Order) | `"§ Tipología: SOV, agglutinative"` → `{wordOrder:'SOV', morphology:'agglutinative'}` |
| 1.2 | `parseLocal` extrae fonología | Detectar fonemas en formato IPA entre barras | `"§ Fonología: /p t k/, /a e i/"` → `{consonants:['p','t','k'], vowels:['a','e','i']}` |
| 1.3 | `parseLocal` extrae sustantivo con sufijo | Detectar "X por -Y sufijo" | `"§ Sustantivos: plural por -k sufijo"` → paradigma con slot `{feature:'plural', realization:{kind:'affix', form:'-k', position:'suffix'}}` |
| 1.4 | `parseLocal` extrae verbo con múltiples tiempos | Detectar lista de tiempos con formas | `"§ Verbos: pasado -ed, presente -s, futuro -will"` → 3 slots |
| 1.5 | `parseLocal` extrae excepción supletiva | Detectar "X → Y (supletiva)" | `"ir → fue (supletiva)"` → `{base:'ir', replacement:'fue', type:'suppletion'}` |
| 1.6 | `parseLocal` extrae estrategia de partícula | Detectar "partícula X para Y" | `"partícula 'ka' para acusativo"` → `{kind:'particle', form:'ka', role:'accusative'}` |
| 1.7 | `parseLocal` genera ParseReport correcto | El parser produce reporte con `sectionsFound`, `warnings` | Parsear texto mínimo → `{sectionsFound:['typology'], sectionsUnparsed:[], warnings:[]}` |
| 1.8 | `parseLocal` es determinista | Misma entrada → misma salida | Ejecutar 10 veces → output idéntico |
| 1.9 | `parseLocal` no falla con texto basura | Texto sin formato reconocible → manifiesto vacío + reporte | `"asdf qwerty"` → `{paradigms:[]}` + `warnings:['No se detectaron secciones']` |
| 1.10 | `parseLocal` maneja texto parcialmente parseable | Algunas secciones parsean, otras no | Texto con tipología+fonología pero sin verbos → `paradigms:[]` + `sectionsUnparsed:['verbs']` |

**Verificación Fase 1:** `npx tsx textParser.test.ts` = 10/10 PASS + `npm run typecheck` = 0 errores nuevos.

---

### Fase 2 — Inductor LLM Mejorado (TDD)

**Archivos modificados:** `src/services/geminiService.ts`  
**Archivos nuevos:** ninguno  
**Tests:** `inductFromText.test.ts` (7 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 2.1 | `inductFromText` usa parser local primero | Mock de parser local que devuelve score 80 | `inductFromText` devuelve `{method:'local', confidence:80}` |
| 2.2 | `inductFromText` usa LLM cuando parser score < 60 | Mock de LLM que devuelve manifiesto parcial | Con parser score 40 + LLM → `{method:'hybrid', confidence:55}` |
| 2.3 | `inductFromText` valida output del LLM contra DeclarativeManifest | LLM devuelve JSON con campos extra → Zod rechaza, se repara | JSON con `extraField` → se elimina, se valida estructura canónica |
| 2.4 | `inductFromText` produce ValidationReport | LLM devuelve manifiesto con paradigmas vacíos → reporte marca `paradigmGap` | `paradigms:[]` → `report.sections.paradigms.status = 'empty'` |
| 2.5 | `inductFromText` fallback sin LLM | `isAiAvailable() = false` → solo parser local | Resultado `{method:'local', confidence: score_del_parser}` |
| 2.6 | `inductFromText` prompt pide DeclarativeManifest | Verificar que el prompt pide `DeclarativeManifest` no `FlexibleGrammar` | Prompt contiene schema JSON de `DeclarativeManifest` |
| 2.7 | `cleanseJson` eliminado como fallback | No debe haber segunda llamada a IA como fallback | `extractJson` falla → se usa parser local, no `cleanseJson` |

**Verificación Fase 2:** `npx tsx inductFromText.test.ts` = 7/7 PASS + `npm run typecheck` = 0 errores nuevos.

---

### Fase 3 — Normalizer + Taxonomy Wiring (TDD)

**Archivos modificados:** `src/services/normalize.ts`  
**Tests:** `normalize.test.ts` (grammar section, 7 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 3.1 | `normalizeGrammarManifest` resuelve aliases de categoría | Input: `{paradigms:[{category:'sustantivo', ...}]}` → Output: `category:'noun'` | `'sustantivo' → 'noun'`, `'sn' → 'noun'`, `'verbo' → 'verb'` |
| 3.2 | `normalizeGrammarManifest` resuelve aliases de posición de afijo | Input: `realization.position:'sufijo'` → Output: `'suffix'` | `'sufijo' → 'suffix'`, `'prefijo' → 'prefix'` |
| 3.3 | `normalizeGrammarManifest` resuelve aliases de estrategia | Input: `strategies:[{type:'sufijación'}]` → Output: `type:'affix'` | Mapeo desde `MARKING_STRATEGY_LEGEND` |
| 3.4 | `normalizeGrammarManifest` maneja `kind:'clitic'` | Input: `{kind:'clitic'}` → Warning + fallback a `'affix'` | Warning registrado + `kind` corregido a `'affix'` |
| 3.5 | `normalizeGrammarManifest` inyecta defaults para campos vacíos | Input: `{phonology:{}}` → Output: phonology con defaults | `consonants:[]` + `vowels:[]` + `syllableStructures:['CV']` |
| 3.6 | `normalizeGrammarManifest` produce ValidationReport | Input: manifiesto con `paradigms:[]` → `paradigmGap:true` | Reporte con `severity:'error'` en paradigms |
| 3.7 | Zod estricto en DeclarativeManifest rechaza campos inválidos | Input con `paradigms:"not-an-array"` → Zod error | `safeParse` devuelve `success:false` |

**Verificación Fase 3:** `npx tsx normalize.test.ts` (grammar section) = 7/7 PASS + `npm run typecheck` = 0 errores nuevos.

---

### Fase 4 — Validador Post-Import + Reporte (TDD)

**Archivos nuevos:** `src/services/grammar/importValidator.ts`, `src/components/ImportReport.tsx`  
**Archivos modificados:** `src/components/GrammarTab.tsx`  
**Tests:** `importValidator.test.ts` (7 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 4.1 | `validateImport` detecta sin paradigmas | `{paradigms:[]}` → error | `report.problems[0].message = 'Sin paradigmas definidos'` |
| 4.2 | `validateImport` detecta slots vacíos | Paradigma con slot sin `realization.form` → warning | `severity:'warning'`, `message:'Slot X tiene realization vacía'` |
| 4.3 | `validateImport` calcula score | Manifiesto completo → score ≥ 80 | Score numérico coherente |
| 4.4 | `validateImport` detecta estrategias no usadas | Strategy `affix` sin slot correspondiente → warning | `message:'Estrategia X no está mapeada a ningún paradigma'` |
| 4.5 | `validateImport` produce sugerencias | Problema: sin excepciones → sugerencia de añadir supletivas | `suggestions` no vacío cuando hay problemas |
| 4.6 | UI muestra reporte después de import | `GrammarTab` monta `<ImportReport>` después de `handleImport` | Reporte visible con score, problemas, sugerencias |
| 4.7 | Gramática con score < 50 se marca como incompleta | Import con `paradigms:[]` → badge "Incompleta" en header | Badge amarillo + tooltip explicativo |

**Verificación Fase 4:** `npx tsx importValidator.test.ts` = 7/7 PASS + `npm run build` = OK.

---

### Fase 5 — Cableado Estrategias → Motor (TDD)

**Archivos nuevos:** `src/services/grammar/strategyExtractor.ts`  
**Archivos modificados:** `src/services/grammar/morphology.ts`, `src/components/GrammarManagerModal.tsx`  
**Tests:** `strategyExtractor.test.ts` (9 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 5.1 | `strategyToSlotExtractor` convierte affix → SlotRealization | `{type:'affix', affixRule:{position:'suffix', form:'-s'}}` → `{kind:'affix', form:'-s', position:'suffix'}` | Slot idéntico al esperado |
| 5.2 | `strategyToSlotExtractor` convierte particle → SlotRealization | `{type:'particle', particleRule:{form:'ka'}}` → `{kind:'particle', form:'ka'}` | Slot correcto |
| 5.3 | `strategyToSlotExtractor` convierte alomorfos → múltiples slots | `{type:'affix', affixRule:{allomorphs:[{form:'-s', when:'afterConsonant'}, {form:'-es', when:'afterVowel'}]}}` → 2 slots | 2 slots con `when` correcto |
| 5.4 | `strategyToSlotExtractor` convierte mutation → SlotRealization | `{type:'mutation', transformationRule:{form:'p→f'}}` → `{kind:'mutation', form:'p→f'}` | Slot correcto |
| 5.5 | `strategyToSlotExtractor` convierte tone → SlotRealization | `{type:'tone', toneRule:{form:'rising'}}` → `{kind:'tone', form:'rising'}` | Slot correcto |
| 5.6 | `strategyToSlotExtractor` convierte suppletion → excepción | `{type:'suppletion'}` → no genera slot, se registra en exceptions | No aparece en `paradigms`, aparece en `exceptions` |
| 5.7 | `realizeLexeme` consume slots derivados de estrategias | Estrategia `affix` → slot → `realizeLexeme` produce forma con sufijo | `lexeme:'casa', category:'noun', slot:{kind:'affix', form:'-k'}` → `'casak'` |
| 5.8 | `GrammarManagerModal` muestra preview de slots derivados | Editar estrategia `sufijo -s` → panel muestra "Generará slot: suffix -s" | Preview actualizado en vivo |
| 5.9 | `GrammarTab` sincroniza estrategias → paradigmas al guardar | Guardar estrategia → paradigmas se actualizan | `realizeLexeme` refleja la nueva estrategia |

**Verificación Fase 5:** `npx tsx strategyExtractor.test.ts` = 9/9 PASS + motor produce formas correctas.

---

### Fase 6 — Fixture Quavanol Funcional (TDD)

**Archivos modificados:** `src/services/grammar/__tests__/quavanol.fixture.ts`  
**Tests:** actualizar `quavanol.fixture.test.ts` (8 tests)

| Orden | Test (falla primero) | Implementación | Crit. Aceptación |
|---|---|---|---|
| 6.1 | Fixture tiene paradigmas mapeados | `QUAVANOL_DEFAULT_MANIFEST` tiene `paradigms` con slots para cada categoría | ≥5 paradigmas (sustantivo, verbo, adjetivo, pronombre, numeral) |
| 6.2 | `realizeLexeme` produce forma de sustantivo Quavanol | `{root:'ael', category:'noun', number:'plural'}` → forma con sufijo plural | Forma de superficie no vacía, contiene raíz + sufijo |
| 6.3 | `realizeLexeme` produce forma de verbo Quavanol | `{root:'vilya', category:'verb', tense:'past'}` → forma con sufijo pasado | Forma contiene raíz + sufijo |
| 6.4 | `realizeLexeme` maneja excepción supletiva Quavanol | `{root:'eo', category:'verb', person:'1sg'}` → forma supletiva | No usa sufijo, usa forma raíz alternativa |
| 6.5 | `realizeClause` produce oración Quavanol | `{wordOrder:'SOV', participants:[{role:'subject', lexeme:'ael'}, ...]}` → oración SOV | Orden correcto: ael vilya pistache |
| 6.6 | `realizeClause` con AST produce árbol correcto | `buildClauseAST` → `linearizeAst` → oración | AST dibujable + oración linearizada correcta |
| 6.7 | `validatePhonology` valida formas Quavanol | Forma producida por motor → validación fonotáctica | No hay violaciones de estructura silábica |
| 6.8 | Fixture completo: 30+ casos | Test que itera sobre todos los casos del fixture | Cada caso produce una forma de superficie válida |

**Verificación Fase 6:** `npx tsx quavanol.fixture.test.ts` = 8/8 PASS.

---

### Fase 7 — Integración UI + End-to-End (TDD)

**Archivos modificados:** `src/components/GrammarTab.tsx`, `src/components/GrammarManagerModal.tsx`, `src/components/TranslationPlayground.tsx`  
**Tests:** 6 tests de integración (ver spec)

| Orden | Test | Crit. Aceptación |
|---|---|---|
| 7.1 | Import de gramática simple produce manifiesto funcional | Texto simple → reporte score ≥ 50 |
| 7.2 | Import de gramática Quavanol produce manifiesto completo | Fixture → reporte score ≥ 80 |
| 7.3 | Editar estrategia en GrammarManagerModal afecta motor | Editar `sufijo -k` → `realizeLexeme` produce forma con `-k` |
| 7.4 | Guardar gramática importada persiste correctamente | Import → guardar → recargar → manifiesto intacto |
| 7.5 | Asistente de gramática genera manifiesto funcional | Wizard con perfil "latín" → manifiesto con paradigmas |
| 7.6 | SyntaxCanvas muestra árbol con formas reales | Editar AST → oración se actualiza en vivo |

**Verificación Fase 7:** Tests de integración = 6/6 PASS + runtime validation exitosa.

---

### Fase 8 — Limpieza + Optimización

| # | Tarea | Archivo | Crit. Aceptación |
|---|---|---|---|
| 8.1 | Eliminar `cleanseJson` como fallback de parsing | `src/services/geminiService.ts` | No hay llamada a IA como fallback de parsing estructural |
| 8.2 | Reemplazar `z.array(z.any())` por schema estricto en strategies | `src/services/normalize.ts` | Zod rechaza `{type:'inventado'}` |
| 8.3 | Agregar detección de ciclos en AST | `src/services/grammar/syntax.ts` | `linearizeAst` detecta cycle → error |
| 8.4 | Expandir `evalWhen` para condiciones compuestas | `src/services/grammar/morphology.ts` | Soporta `number=sg&case=dat` |
| 8.5 | Agregar `kind:'clitic'` a `SlotRealization` | `src/types.ts` | Tipo soportado por motor |
| 8.6 | Cablear taxonomy en `useLexicon.ts`, `EntryEditor.tsx`, `LexiconTable.tsx` | Varios | Dropdowns usan `displayOf` |
| 8.7 | Cablear `sessionCache.ts` a `App.tsx` | `src/App.tsx`, `src/services/sessionCache.ts` | Sesión persiste correctamente |

**Verificación Fase 8:** `npm run typecheck` = 0 errores + `npm run lint` = OK + `npm run build` = OK.

---

## Handoff / próximos pasos

Después de completar Fase 8:

1. Validar en runtime (`npm run tauri dev`) que el flujo completo funciona: importar gramática → ver reporte → editar estrategias → ver formas de superficie.
2. Proceder a merge de `feature/sql-migration-clean` a `main`.
3. Backlog pendiente (fuera de este plan):
   - P1: `sessionCache.ts` → `App.tsx` (ya estaba en backlog)
   - P2: Persistir AST editable en manifiesto
   - P3: Limpiar errores tsc Neography*
   - P4: Exponer `typologicalProfile` en UI

---

## Criterios de aceptación finales

| Criterio | Métrica | Estado |
|---|---|---|
| Tests del módulo | Todos PASS | |
| `tsc --noEmit` | 0 errores en `src/services/grammar/**/*.ts` | |
| `npm run lint` | OK | |
| `npm run build` | OK | |
| Import de gramática simple | Score ≥ 50 | |
| Estrategias → motor | Formas de superficie correctas | |
| Fixture Quavanol | 8/8 tests PASS | |
| Reporte post-import | Visible, con score + problemas + sugerencias | |
| Performance | `realizeLexeme < 5ms`, `realizeClause < 10ms`, parser < 100ms | |

---

## Archivos a crear

| Archivo | Fase | Descripción |
|---|---|---|
| `src/services/grammar/declarativeFormat.ts` | 0 | Interfaces del formato intermedio |
| `src/services/grammar/textParser.ts` | 1 | Parser local de texto → declarative format |
| `src/services/grammar/importValidator.ts` | 4 | Validador post-import + reporte |
| `src/services/grammar/strategyExtractor.ts` | 5 | Estrategias → slots del motor |
| `src/components/ImportReport.tsx` | 4 | UI del reporte post-import |
| `src/services/grammar/__tests__/textParser.test.ts` | 1 | 10 tests del parser local |
| `src/services/grammar/__tests__/inductFromText.test.ts` | 2 | 7 tests del inductor LLM |
| `src/services/grammar/__tests__/importValidator.test.ts` | 4 | 7 tests del validador |
| `src/services/grammar/__tests__/strategyExtractor.test.ts` | 5 | 9 tests del extractor |

## Archivos a modificar

| Archivo | Fase | Cambio |
|---|---|---|
| `src/services/geminiService.ts` | 2 | Reducir prompt, validar DeclarativeManifest, eliminar cleanseJson como fallback |
| `src/services/normalize.ts` | 3 | Zod estricto en DeclarativeManifest, normalización de aliases con taxonomy |
| `src/services/grammar/morphology.ts` | 5 | Agregar `kind:'clitic'`, expandir `evalWhen` |
| `src/components/GrammarManagerModal.tsx` | 5 | Preview de slots derivados de estrategias |
| `src/components/GrammarTab.tsx` | 4, 7 | ImportReport + badge "incompleta" |
| `src/types.ts` | 3, 5 | `kind:'clitic'` en SlotRealization, ImportValidationReport |
| `src/services/grammar/__tests__/quavanol.fixture.ts` | 6 | Mapear datos a paradigmas del engine |
| `src/components/TranslationPlayground.tsx` | 7 | Integración E2E |
| `src/services/grammar/syntax.ts` | 8 | Detección de ciclos en AST |

## Archivos a NO tocar (fuera de alcance)

- `src/components/neography/*` (8 errores tsc preexistentes, no bloquean)
- `src/components/NeographyModal.tsx` (7 errores preexistentes)
- `src/components/NeographyImageTracer.tsx` (1 error preexistente)
- `src/components/EntryEditor.tsx` (a menos que sea necesario para Fase 7)
- `src/hooks/useLexicon.ts` (a menos que sea necesario para Fase 8)
- Cualquier archivo de `docs/` fuera de `docs/superpowers/specs/` y `docs/superpowers/plans/`

---

**Fin del plan de ejecución**

---

## Estado de implementación (2026-08-01)

| Fase | Estado | Tests | Notas |
|------|--------|-------|-------|
| Fase 0: Preparación | ✅ Completada | — | declarativeFormat.ts + tipos base |
| Fase 1: Parser local TDD | ✅ Completada | 11/11 PASS | textParser.ts |
| Fase 2: Inductor LLM TDD | ✅ Completada | 7/7 PASS | inductFromText.ts |
| Fase 3: Normalizer + Taxonomy TDD | ✅ Completada | 7/7 PASS | normalizer.ts + taxonomy resolver |
| Fase 4: Validador post-import TDD | ✅ Completada | 7/7 PASS | postImportValidator.ts |
| Fase 5: Estrategias→Motor TDD | ✅ Completada | 9/9 PASS | strategyBridge.ts |
| Fase 6: Fixture Quavanol | ✅ Completada | 8/8 PASS | 9 géneros, 30+ casos |
| Fase 7: Integración UI + E2E | ✅ Completada | 6/6 PASS | GrammarImporterModal + SyntaxCanvas |
| Fase 8: Limpieza + Optimización | ✅ Completada | — | phonology fix, type consolidation, vitest migration |

**Cambios de alcance durante implementación:**
- `importValidator.ts` → renombrado a `postImportValidator.ts` (naming más preciso)
- `strategyExtractor.ts` → renombrado a `strategyBridge.ts` (no es extractor, es bridge)
- `cleanseJson` eliminado como fallback (no segunda llamada a IA)
- `convertToLegacy` bridge agregado para backward compatibility con UI legacy
- 22 test files convertidos de `node:test` a `vitest`
- Tipos consolidados: `ImportValidationReport` y `SectionStatus` unificados en `declarativeFormat.ts`

**Verificación final:**
- `npm run build` = ✓ (334 módulos, 0 errores)
- `npm run typecheck` = ✓ (0 errores)
- Grammar tests = ✓ 83/83 PASS
