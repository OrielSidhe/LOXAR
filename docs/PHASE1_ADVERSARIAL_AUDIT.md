# Phase 1 Adversarial Audit Report

**Auditor:** Árbitro Adversarial (Senior Code Auditor — Gauntlet Protocol)
**Commit audited:** `05ae6db6`
**Date:** 2026-10-17
**Verification gates:** `tsc --noEmit` (0 errors), `vitest run` (134/134 pass)

## Rondas de revisión

| Ronda | Enfoque | Files examinados | Hallazgos críticos |
|---|---|---|---|
| 1 | Type safety & imports | `grammarDb.ts`, `syntax.ts`, `types.ts`, `types/pragmaticTypes.ts`, `App.tsx` | 2 Medium, 2 Low |
| 2 | Runtime correctness | `syntax.ts` (`walk`/`buildAstCanvas`), `grammarDb.ts` (`getDb`/`initPragmaticDb`), `morphology.ts`, `ast-builder.ts` | 5 Medium, 2 Low |
| 3 | Arquitectura & protocolo | `App.tsx` mount effect, `SyntaxCanvas.tsx`, `SyntaxNodeRenderer.tsx`, `ast-view.ts`, `GrammarTab.tsx`, `vitest.config.ts` | 2 Medium, 5 Low |

**Total: 9 Medium, 11 Low = 20 findings.**

---

## RONDA 1 — Type Safety & Imports

### Finding 1.1 [Medium] — `walk` parameter typed as base `SyntaxNode` but receives `VerbNode`
`buildAstCanvas.walk` recibe `node: SyntaxNode` (de `engineTypes`) pero nunca accede a `VerbNode.conjugateRoot`. Coherente por accidente, no por diseño. El aliasing `SyntaxNode as CanvasNode` vs `SyntaxNode` (engineTypes) es correcto — no hay colisión.

### Finding 1.2 [Low] — `CAT_MAP` / `catMap` duplicado
`linearizeAst` define un `catMap` local idéntico al `CAT_MAP` de módulo nivel. Violación DRY.

### Finding 1.3 [Low] — `createDefaultPragmaticState` es dead code
Re-exportado desde `grammarDb.ts` pero con **cero callers** en `src/`.

### Finding 1.4 [Resolved] — Import cleanup verificado
Cero dangling references para `TypologicalProfileObj`, `PragmaticEngineStateObj`, `LanguageTreeCanvas`, `parseGrammarText`, `AUDIT_REPORT.md`.

### Finding 1.5 [Resolved] — tsc --noEmit = 0 errores
`noUnusedLocals: false` en tsconfig, verificado manualmente.

---

## RONDA 2 — Runtime Correctness

### Finding 2.1 [High] — `walk` sin guards defensivos
`buildAstCanvas.walk` carece de `if (!node) return` y `node.dependents ?? []` que el walker existente en `ast-view.ts` tiene. Asume AST perfectamente formado.

### Finding 2.2 [Medium] — `node.features` undefined → crash en `realizeLexeme`
`node.features` podría ser undefined en ASTs construidos manualmente. `realizeLexeme` crashearía en `features[s.feature]`.

### Finding 2.3 [Medium] — Sin guard de null para `clause.root`
Si `clause.root` es null/undefined, `walk` crashea inmediatamente.

### Finding 2.4 [High] — Cache poisoning en `dbPromise`
Si `getDb()` falla, `dbPromise` se convierte en un promise rechazado permanente. Recovery imposible sin recargar. Afecta a todas las funciones de `grammarDb.ts`.

### Finding 2.5 [Medium] — Divergencia `conjugateRoot` vs heurística de roles
| Scenario | `conjugateRoot` | `role` | `linearizeAst` conjuga? | `buildAstCanvas` conjuga? | Match? |
|---|---|---|---|---|---|
| Root verb | `true` | `'root'` | Sí | Sí | ✓ |
| Aux | `false` | `'auxiliary_verb'` | No | No | ✓ |
| Root `conjugateRoot=false` | `false` | `'root'` | No | **Sí** | ✗ |
| Aux `conjugateRoot=true` | `true` | `'auxiliary_verb'` | Sí | **No** | ✗ |

### Finding 2.6 [Medium] — Sin test coverage para salida de `buildAstCanvas`
Nadie verifica `canvas.nodes.length`, `canvas.connections.length`, roles, colores, coordenadas.

### Finding 2.7 [Medium] — Sin detección de ciclos en `walk`
AST con ciclo → stack overflow. `ast-view.ts` expone `addDependent` que permite crear ciclos.

### Finding 2.8 [Low] — Recursión profunda: stack overflow teórico
Límite típico ~10k-15k frames.

### Finding 2.9 [Low] — `linearizeAst.linearOf` también carece de guards (pre-existing)
`node.dependents.map(linearOf)` crashea si `dependents` es undefined.

---

## RONDA 3 — Arquitectura & Protocolo

### Finding 3.1 [Medium] — `children: []` siempre vacío
Incordencia con `SyntaxNodeRenderer` que espera `node.children` para renderizado recursivo.

### Finding 3.2 [Medium] — `initPragmaticDb` mount effect: no retry, no UX feedback
Fire-and-forget correcto pero sin retry ni feedback visual al usuario.

### Finding 3.3 [Low] — Profundidad reconstruida de `y` (fragilidad)
Layout recomputa depth desde coordenada y en vez de pasarla durante el walk.

### Finding 3.4 [Low] — `canvasWidth = 760` hardcodeado
No responsive.

### Finding 3.5 [Low] — `node_modules/**/*` exclude redundante en vitest
Vitest ya lo excluye por defecto.

### Finding 3.6 [Low] — Counter compartido entre IDs de nodo y conexión
`ast_${counter++}` y `conn_${counter++}` usan el mismo counter. Funciona por casualidad.

### Finding 3.7 [Low] — Comentario obsoleto en `grammarParser.ts:8`
Menciona `parseGrammarText` que fue eliminado en Phase 1.

### Finding 3.8 [Resolved] — `useEffect` deps `[]` correcto para mount-once

### Finding 3.9 [Resolved] — Commits coherentes, dead code removal clean

### Finding 3.10 [Resolved] — `buildAstCanvas` no exportado (API privada)

---

## Estado de Resolución

| ID | Severidad | Finding | Estado |
|----|-----------|---------|--------|
| 2.1 | **High** | `walk` sin guards defensivos | Not Resolved |
| 2.4 | **High** | Cache poisoning en `dbPromise` | Not Resolved |
| 2.5 | Medium | Divergencia `conjugateRoot` vs heurística | Not Resolved |
| 2.2 | Medium | `node.features` undefined → crash | Not Resolved |
| 2.6 | Medium | Sin test coverage para `buildAstCanvas` | Not Resolved |
| 2.3 | Medium | Sin guard de null para `clause.root` | Not Resolved |
| 2.7 | Medium | Sin detección de ciclos en `walk` | Not Resolved |
| 3.1 | Medium | `children: []` siempre vacío | Not Resolved |
| 3.2 | Medium | `initPragmaticDb`: no retry, no UX feedback | Not Resolved |
| 1.1 | Low | Walker parameter type no usa VerbNode específicamente | Not Resolved |
| 1.2 | Low | `catMap` duplicado | Not Resolved |
| 1.3 | Low | `createDefaultPragmaticState` es dead code | Not Resolved |
| 2.8 | Low | Recursión profunda teórica | Not Resolved |
| 2.9 | Low | `linearizeAst.linearOf` sin guards (pre-existing) | Not Resolved |
| 3.3 | Low | Depth reconstruido de `y` | Not Resolved |
| 3.4 | Low | `canvasWidth` hardcodeado | Not Resolved |
| 3.5 | Low | `node_modules` exclude redundante | Not Resolved |
| 3.6 | Low | Counter compartido | Not Resolved |
| 3.7 | Low | Comentario obsoleto en `grammarParser.ts` | Not Resolved |
| 1.4/1.5/3.8/3.9/3.10 | — | Verificado / Resolved | Resolved |

---

## Recomendaciones para Phase 2

**High priority:**
1. Unificar el walker — añadir guards + cycle detection (mirror `ast-view.ts`)
2. Fix `dbPromise` cache poisoning — reset a `null` en rechazo (aplicar también a `sqlStorage.ts`)
3. Unificar lógica de conjugación — usar `VerbNode.conjugateRoot` en `buildAstCanvas`
4. Añadir tests para output estructural de `buildAstCanvas`

**Medium priority:**
5. Eliminar `catMap` local — reusar `CAT_MAP`
6. Poblar `children` o hacerlo opcional en el tipo
7. Parametrizar `canvasWidth`
8. Eliminar o documentar `createDefaultPragmaticState`
9. Limpiar comentario obsoleto en `grammarParser.ts`
