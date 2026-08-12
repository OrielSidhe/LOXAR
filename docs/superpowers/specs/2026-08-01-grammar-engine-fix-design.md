# Design: Fix del Motor de Gramática — LOXAR

**Fecha:** 2026-08-01  
**Estado:** Propuesto (pendiente aprobación)  
**Rama:** `feature/sql-migration-clean`  
**Autor:** Victor Sidhe / ZCode  
**Spec base:** Diagnóstico de módulo de gramática (este documento)  
**Plan:** `docs/superpowers/plans/2026-08-01-grammar-engine-fix.md`

---

## 1. Contexto y problema

### 1.1 Problema actual

El módulo de gramática de LOXAR tiene **dos capas claramente separadas**:

1. **Capa de importación (rota):** `parseGrammarAdvanced` en `geminiService.ts` es un prompt LLM de ~150 líneas que pide JSON estructurado a cambio de texto libre. No hay parser textual propio. Si el LLM falla (devuelve basura, JSON con campos distintos, texto narrativo), el usuario ve "Confianza: 0%" y un manifiesto vacío. **No hay respaldo local.**

2. **Capa de realización (funcional pero incompleta):** El motor determinista (`realizeLexeme` + `realizeClause` + AST) está bien implementado (~75% completo), pero:
   - Las estrategias (`MorphosyntacticStrategy`) que el usuario edita en `GrammarManagerModal` **nunca se cablean al motor**. Son metadata descriptiva sin efecto computacional.
   - `normalizeGrammarManifest` usa Zod laxo (`z.array(z.any())` en strategies) → acepta cualquier basura del LLM sin error.
   - El fixture Quavanol tiene datos ricos (30+ casos, 9 géneros, verbos, numerales) pero **no están mapeados a paradigmas del engine**.
   - `evalWhen` en morphology solo soporta condiciones síncronas simples, no compuestas.

### 1.2 Evidencia del problema

- Usuario reporta: "no puede ni siquiera procesar una simple gramática textual que se le dio de ejemplo"
- `parseGrammarAdvanced` retorna `confidence: 0.0` cuando el LLM falla, pero el modal sigue permitiendo guardar el fallback como gramática "válida"
- `GrammarManagerModal` permite editar estrategias pero `realizeLexeme` nunca las consume
- `QUAVANOL_DEFAULT_MANIFEST` tiene `paradigms: []` → el motor no puede flexionar verbos del fixture

### 1.3 No-objetivos

- No reemplazar el motor determinista existente (es funcional)
- No mover la lógica a Rust (ADR-008 ya decidió TS puro)
- No cambiar la arquitectura de persistencia (ADR-005)
- No modificar la taxonomía existente (ADR-007)

---

## 2. Objetivo y no-objetivos

### 2.1 Objetivo principal

Convertir el módulo de gramática de "importador frágil + motor aislado" en un **pipeline completo** donde:

1. Texto libre → parser local → formato declarativo → normalización → manifiesto → motor → formas de superficie
2. El LLM es inductor opcional, no parser obligatorio
3. Lo que el usuario configura (estrategias) tiene efecto computacional real
4. El usuario ve un reporte honesto de lo que se importó

### 2.2 Objetivos específicos

| # | Objetivo | Métrica |
|---|---|---|
| O1 | Importar gramática textual sin depender 100% de LLM | `parseLocal(text)` produce manifiesto con score ≥ 50 para gramáticas simples |
| O2 | Estrategias editables con efecto en el motor | `realizeLexeme` produce formas correctas después de editar estrategia en `GrammarManagerModal` |
| O3 | Validación post-import visible | Usuario ve reporte con score, problemas y sugerencias después de importar |
| O4 | Fixture Quavanol funcional | `realizeLexeme` produce ≥1 forma de superficie por categoría del fixture |
| O5 | Normalización robusta de aliases | LLM puede devolver `"sufijo"` y el motor recibe `"suffix"` |

### 2.3 No-objetivos (explicitados)

- No implementar sandhi tonal complejo, polisíntesis completa, o morfología no concatenativa (ya documentado en TASKS.md como fases futuras)
- No persistir el AST editable en el manifiesto (decisión P2 del backlog, fuera de alcance)
- No cablear `sessionCache.ts` a `App.tsx` (decisión P1 del backlog, fuera de alcance)

---

## 3. Arquitectura

### 3.1 Diagrama del pipeline objetivo

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PIPELINE DE GRAMÁTICA                         │
│                                                                     │
│  ENTRADA: texto libre (.txt/.md) / asistente / YAML tipológico     │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐     │
│  │ LLM Inducer │    │ Parser Local │    │ Validador Post-   │     │
│  │ (opcional)  │───▶│ (siempre)    │───▶│ Import            │     │
│  └─────────────┘    └──────────────┘    └────────────────────┘     │
│       │                      │                      │               │
│       │                      ▼                      ▼               │
│       │              ┌──────────────┐    ┌────────────────────┐     │
│       │              │ Formato      │    │ Reporte: X         │     │
│       │              │ Declarativo  │    │ paradigmas, Y      │     │
│       │              │ (JSON/YAML)  │    │ excepciones, Z     │     │
│       │              │              │    │ problemas          │     │
│       │              └──────────────┘    └────────────────────┘     │
│       │                      │                                       │
│       │                      ▼                                       │
│       │              ┌──────────────┐                               │
│       │              │ Normalizer  │───▶ alias→canonical, defaults   │
│       │              │ (taxonomy)  │    Zod estricto en estructuras   │
│       │              │              │    internas, laxo en externas │
│       │              └──────────────┘                               │
│       │                      │                                       │
│       └──────────────────────┼───────────────────────────────────┘ │
│                              ▼                                       │
│                    ┌──────────────────┐                              │
│                    │ GrammarManifest  │                              │
│                    │ (fuente de       │                              │
│                    │ verdad única)    │                              │
│                    └──────────────────┘                              │
│                              │                                       │
│              ┌───────────────┼───────────────┐                       │
│              ▼               ▼               ▼                       │
│    ┌─────────────────┐ ┌────────────┐ ┌──────────────┐            │
│    │ realizeLexeme   │ │ realize    │ │ validate     │            │
│    │ (morphology)    │ │ Clause     │ │ Phonology    │            │
│    │                 │ │ (syntax)   │ │              │            │
│    └─────────────────┘ └────────────┘ └────────────┘            │
│                              │                                       │
│                              ▼                                       │
│                    ┌──────────────────┐                              │
│                    │ Surface Forms    │                              │
│                    │ + Syntax Canvas  │                              │
│                    └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes nuevos

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `DeclarativeFormat` | `src/services/grammar/declarativeFormat.ts` | Interfaces del formato intermedio. Todo parser local devuelve esto. |
| `TextParser` | `src/services/grammar/textParser.ts` | Parser determinista: texto libre → `DeclarativeManifest`. SIN LLM. |
| `ImportValidator` | `src/services/grammar/importValidator.ts` | Post-import: produce `ImportValidationReport` con score, problemas, sugerencias. |
| `StrategyExtractor` | `src/services/grammar/strategyExtractor.ts` | Convierte `MorphosyntacticStrategy[]` → `DeclarativeSlot[]` que el motor consume. |
| `ImportReport` | `src/components/ImportReport.tsx` | UI del reporte post-import: score, problemas, sugerencias, badge "incompleta". |

### 3.3 Componentes modificados

| Componente | Archivo | Cambio |
|---|---|---|
| LLM Inducer | `src/services/geminiService.ts` | Reducir prompt, pedir `DeclarativeManifest`, validar post-LLM con Zod, eliminar `cleanseJson` como fallback |
| Normalizer | `src/services/normalize.ts` | Zod estricto en `DeclarativeManifest`, normalización de aliases con `taxonomy.ts` |
| Motor morphology | `src/services/grammar/morphology.ts` | Agregar `kind:'clitic'`, expandir `evalWhen` para condiciones compuestas |
| GrammarManagerModal | `src/components/GrammarManagerModal.tsx` | Mostrar preview de slots derivados de estrategias |
| GrammarTab | `src/components/GrammarTab.tsx` | Mostrar `ImportReport` después de importar, badge "incompleta" para score < 50 |
| Types | `src/types.ts` | Agregar `kind:'clitic'` a `SlotRealization`, `ImportValidationReport` |
| Fixture Quavanol | `src/services/grammar/__tests__/quavanol.fixture.ts` | Mapear datos a paradigmas del engine |

---

## 4. Cambios en el modelo de datos

### 4.1 Nuevos tipos (declarativeFormat.ts)

```typescript
interface DeclarativeSlot {
  id: string;
  feature: string;
  order: number;
  realization: {
    kind: 'affix' | 'mutation' | 'tone' | 'stem' | 'particle';
    form: string;
    when?: string;
    position?: 'prefix' | 'suffix' | 'infix' | 'circumfix';
  };
}

interface DeclarativeParadigm {
  category: string;
  slots: DeclarativeSlot[];
}

interface DeclarativeManifest {
  name: string;
  typology: { wordOrder; morphology; headDirection; alignment };
  phonology: { consonants: string[]; vowels: string[]; syllableStructures: string[] };
  paradigms: DeclarativeParadigm[];
  strategies: DeclarativeStrategy[];
  mutationRules: DeclarativeMutationRule[];
  exceptions: DeclarativeException[];
  roles: DeclarativeRole[];
}
```

### 4.2 Tipos nuevos (ImportValidationReport)

```typescript
interface ImportValidationReport {
  ok: boolean;
  score: number;
  sections: {
    phonology: SectionStatus;
    typology: SectionStatus;
    paradigms: SectionStatus;
    strategies: SectionStatus;
    exceptions: SectionStatus;
    roles: SectionStatus;
  };
  problems: Problem[];
  suggestions: string[];
}
```

### 4.3 Cambios en tipos existentes

- `SlotRealization.kind`: agregar `'clitic'` (actualmente solo `'affix'|'mutation'|'tone'|'stem'|'particle'`)
- `MorphosyntacticStrategy`: sin cambios estructurales, pero `GrammarManagerModal` muestra preview de conversión a slots

---

## 5. Diseño detallado

### 5.1 Parser Local (textParser.ts)

**Regla #1:** NO usa regexes frágiles sobre texto libre. Usa **extracción estructurada por secciones** detectables por headers conocidos (§ Tipología, § Fonología, § Sustantivos, § Verbos, etc.)

**Regla #2:** Maneja al menos:
1. Paradigmas por categoría con ranuras/rasgos
2. Sufijos/prefijos/infijos con posición y forma
3. Excepciones supletivas
4. Estrategias de marcaje (partículas, clíticos, tono, mutación)
5. Orden de palabras (SVO/SOV/etc.)
6. Fonología mínima (inventario de sonidos)

**Regla #3:** Si no puede parsear una sección, la marca como `unparsed: true` y continúa. No falla toda la importación.

**Regla #4:** Produce `ParseReport` con `sectionsFound`, `sectionsUnparsed`, `paradigmsExtracted`, `warnings`.

**Regla #5:** Determinista: misma entrada → misma salida.

### 5.2 Inductor LLM Mejorado

**Cambios estrictos:**

1. **Prompt reducido:** En vez de pedir `FlexibleGrammar` completo, pedir `DeclarativeManifest` con schema JSON embebido en el prompt.
2. **Validación post-LLM:** `extractJson` → validar contra `DeclarativeManifest` con Zod estricto. Si falla, reparación mínima (merge con defaults).
3. **`cleanseJson` eliminado:** No hay segunda llamada a IA como fallback. Parser local es el fallback.
4. **Flujo:** parser local primero (score ≥ 60 → usar local) → si score < 60, LLM → hybrid → validar → reporte.

### 5.3 Normalizer Mejorado

1. **Zod estricto en `DeclarativeManifest`:** campos tipados, no `z.any()`.
2. **Zod laxo en `GrammarManifest` externo:** `.passthrough().default(...)` para tolerar legacy.
3. **Normalización de aliases:** usar `taxonomy.ts` para resolver categorías, roles, posiciones de afijo, tipos de estrategia.
4. **Validación de slots:** `kind` válido, `form` no vacío. Si `kind:'clitic'` → warning + fallback a `'affix'`.
5. **Default injection:** `paradigms:[]` NO se rellena con defaults vacíos. Devuelve `ValidationReport` con `paradigmGap:true`.

### 5.4 Cableado Estrategias → Motor

**Mecanismo:**
```
manifest.strategies[] → [strategyToSlotExtractor] → manifest.paradigms[].slots[] (enriquecidos)
```

**Reglas de conversión:**

| StrategyType | kind en SlotRealization | position | Ejemplo |
|---|---|---|---|
| `affix` | `'affix'` | desde `affixRule.position` | `{kind:'affix', form:'-s', position:'suffix'}` |
| `particle` | `'particle'` | N/A | `{kind:'particle', form:'ka'}` |
| `clitic` | `'affix'` | `'suffix'` (default) | `{kind:'affix', form:"'"}` |
| `auxiliary` | NO genera slot (AST) | N/A | Se registra en `syntaxRules` |
| `tone` | `'tone'` | N/A | `{kind:'tone', form:'rising'}` |
| `mutation` | `'mutation'` | N/A | `{kind:'mutation', form:'p→f'}` |
| `suppletion` | NO genera slot | N/A | Se registra en `exceptions[]` |

### 5.5 Validador Post-Import

**Regla:** Siempre se muestra después de importar.

**Criterio mínimo para "gramática funcional":**
- ≥1 paradigma con ≥1 slot con `realization.form` no vacío
- Tipología completa (wordOrder + morphology + headDirection)
- Fonología con inventario no vacío
- Score ≥ 50

Si score < 50 → badge "Incompleta" + tooltip explicativo.

---

## 6. Estrategia de pruebas

### 6.1 Framework

- **Runner:** `npx tsx` (sin Jest/Vitest — mantener ligereza)
- **Ubicación:** `__tests__/` junto al módulo correspondiente
- **Patrón:** AAA (Arrange, Act, Assert)

### 6.2 Cobertura objetivo

| Componente | Tests actuales | Tests objetivo | Cobertura |
|---|---|---|---|
| morphology | 4 | 8 | 95% |
| syntax | 4 | 6 | 90% |
| phonology | 4 | 6 | 90% |
| exceptions | 4 | 4 | 95% |
| ast | 4 | 6 | 90% |
| ast-editor | 6 | 6 | 85% |
| textParser | 0 | 10 | 90% |
| inductFromText | 0 | 7 | 85% |
| importValidator | 0 | 7 | 90% |
| strategyExtractor | 0 | 9 | 95% |
| normalize (grammar) | 0 | 7 | 90% |
| **TOTAL** | **26** | **70** | **~90%** |

### 6.3 Criterio mínimo para merge

- Todos los tests de la fase actual pasan
- `tsc --noEmit = 0 errores` en archivos del módulo
- `npm run lint = OK`
- `npm run build = OK`
- Al menos 1 test de integración E2E pasa (import → motor → forma de superficie)

---

## 7. Fases de implementación

Ver plan detallado en `docs/superpowers/plans/2026-08-01-grammar-engine-fix.md`.

| Fase | Nombre | Tests | Archivos nuevos | Archivos modificados |
|---|---|---|---|---|
| 0 | Preparación | 0 | 2 | 0 |
| 1 | Parser Local | 10 | 1 | 0 |
| 2 | Inductor LLM Mejorado | 7 | 0 | 1 |
| 3 | Normalizer + Taxonomy | 7 | 0 | 2 |
| 4 | Validador Post-Import | 7 | 1 | 2 |
| 5 | Cableado Estrategias→Motor | 9 | 1 | 3 |
| 6 | Fixture Quavanol Funcional | 8 | 0 | 1 |
| 7 | Integración UI + E2E | 6 | 0 | 3 |
| 8 | Limpieza + Optimización | 0 | 0 | 7 |

---

## 8. Alcance y limitaciones

### 8.1 Dentro de alcance

- Parser local de gramática textual (prosa → manifiesto estructurado)
- Mejora del inductor LLM (prompt dirigido + validación)
- Normalización robusta de aliases
- Cableado estrategias → motor
- Reporte post-import visible
- Fixture Quavanol mapeado a paradigmas del engine
- Validación post-import obligatoria

### 8.2 Fuera de alcance (fases futuras)

- Sandhi tonal complejo
- Polisíntesis completa
- Morfología no concatenativa
- Persistencia del AST editable en manifiesto (P2 backlog)
- Cablear `sessionCache.ts` a `App.tsx` (P1 backlog)
- Limpiar errores tsc Neography* (P3 backlog)

---

## 9. Criterios de aceptación

### 9.1 Criterio por fase

Cada fase tiene sus criterios en el plan de ejecución.

### 9.2 Criterio global: "Módulo funcional"

El módulo de gramática se considera **funcional** cuando:

1. Un usuario puede pegar una descripción textual de gramática (≥100 palabras) y obtener un manifiesto con score ≥ 50.
2. El usuario puede editar estrategias en `GrammarManagerModal` y ver el efecto en `realizeLexeme`.
3. El usuario puede construir un AST en `ASTEditor` y ver la oración realizada.
4. El usuario puede guardar la gramática y recargarla sin pérdida de datos.
5. Todos los tests del módulo pasan = PASS.
6. `tsc --noEmit = 0 errores` en archivos del módulo.

### 9.3 Criterio global: "Listo para ops"

El módulo está **listo para producción** cuando cumple "funcional" +:

1. No hay errores TypeScript en `src/services/grammar/**/*.ts`.
2. No hay warnings de lint en archivos del módulo.
3. El reporte post-import se muestra en <200ms.
4. `realizeLexeme` produce forma en <5ms para lexemas típicos.
5. `realizeClause` produce oración en <10ms para cláusulas de ≤5 participantes.
6. El parser local procesa textos de ≤5K chars en <100ms.

---

## 10. Riesgos y preguntas abiertas

| # | Riesgo/Pregunta | Impacto | Mitigación |
|---|---|---|---|
| R1 | LLM sigue siendo necesario para gramáticas complejas | Medio | Parser local como base + LLM como booster. Si LLM falla, parser local produce al menos estructura mínima. |
| R2 | `evalWhen` expandido puede introducir bugs en morphology existente | Bajo | Tests existentes + nuevos tests para condiciones compuestas. |
| R3 | StrategyExtractor puede perder detalles de estrategias complejas | Medio | Tests exhaustivos (9 tests) + preview en UI para que usuario vea la conversión. |
| R4 | Fixture Quavanol puede requerir datos adicionales para mapear a paradigmas | Bajo | El fixture ya tiene 30+ casos; solo falta estructurarlos como `DeclarativeParadigm[]`. |
| R5 | Zod estricto en DeclarativeManifest puede rechazar output del LLM | Bajo | Fallback a parser local + merge con defaults. Zod laxo en GrammarManifest externo. |

---

## 11. Referencias

- Diagnóstico completo: `docs/superpowers/research/2026-08-01-conlang-github-research.md`
- Plan de ejecución: `docs/superpowers/plans/2026-08-01-grammar-engine-fix.md`
- Motor de gramática existente: `docs/superpowers/specs/2026-07-14-grammar-engine-design.md`
- Taxonomía: `src/data/taxonomy.ts` (ADR-007)
- Normalización: `src/services/normalize.ts` (ADR-002)

---

**Fin del SDD — Fix del Motor de Gramática v1.0**
