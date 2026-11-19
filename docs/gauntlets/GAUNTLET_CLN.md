# GAUNTLET_CLN — Limpieza del repositorio (auditoría externa 2026-11-05)

## Objetivo
Purgar dumps generados para auditoría externa (PROYECTO_COMPLETO.json 11.7MB,
PROYECTO_INDICE.json) y estado de IDEs (.zcode/, .claude/) del repo SIN dejar
el blob de 11.7MB en el historial, endurecer .gitignore, mover documentación
suelta (SQL-MIGRATION-GUIDE.md) a docs/, y limpiar el disco local de
artefactos de agentes.

## Auditoría externa (veredictos)
| # | Hallazgo | Acción |
|---|---|---|
| 1 | PROYECTO_COMPLETO.json (11.7MB) en raíz, trackeado | Purgar del historial |
| 2 | PROYECTO_INDICE.json en raíz, trackeado | Purgar del historial |
| 3 | .zcode/ trackeado | `git rm -r --cached` |
| 4 | .claude/ trackeado | `git rm -r --cached` |
| 5 | SQL-MIGRATION-GUIDE.md en raíz | `git mv` a docs/ |

## Fases
- **FASE 0** — Especificación + verificación de precondiciones
- **FASE P** — Purga de dumps y estado de IDEs (Plan A/B)
- **FASE D** — Documentación en su lugar (SQL-MIGRATION-GUIDE.md → docs/)
- **FASE L** — Limpieza del disco local (artefactos de agentes)

## Precondiciones FASE 0 (verificadas ANTES de tocar nada)
- `git status --porcelain` → NO limpio (untracked: .zcode/skills/, ZCODE_DUMP.json, ZCODE_DUMP.md). No hay commits sucios.
- `git log --oneline -1` → **d4a2abc** ✓
- `git show --stat d4a2abc` → contiene **SOLO** PROYECTO_COMPLETO.json + PROYECTO_INDICE.json ✓
- `git ls-files .zcode .claude` → 7 archivos trackeados (3 planes .zcode, 4 .claude)
- `docs/gauntlets/` existe (GAUNTLET_v3.9.md … v3.12.md)
- `SQL-MIGRATION-GUIDE.md` existe en raíz

**CONCLUSIÓN CRÍTICA:** HEAD == d4a2abc y solo contiene los dumps → aplica **PLAN A** (`git reset --hard HEAD~1`).

## PLAN A (aplicado en Fase P)
1. `git reset --hard HEAD~1` — elimina el commit de los dumps; el blob de 11.7MB sale del historial del branch.
2. `git push --force-with-lease origin master`
3. Verificar: `git ls-files | grep -E "PROYECTO_|ZCODE_DUMP"` → vacío.

## PLAN B (no aplicado; Plan A fue exitoso)
`git rm --cached` como alternativa si Plan A no hubiera aplicado.

## Estado pendiente conocido
- ~~LICENSE MIT~~ → resuelto 2026-11-13: `LICENSE` (MIT) creado en la raíz.
- ~~Contador de tests del README desactualizado~~ → resuelto 2026-11-13: README ahora reporta
  369/369 tests (44 archivos), verificado con `npx vitest run`.
- ~~Schema Zod de `preview` que descarta las entradas fijadas~~ → resuelto 2026-11-19 (`5e38fe6`):
  `GrammarManifestSchema` (`src/services/normalize.ts:92`) declara `subjectEntryId`/`verbEntryId`/
  `objectEntryId` como `z.string().optional()`; `normalizePreview.test.ts` (4) cubre preservación,
  default y round-trip por `normalizeLexiconData`. Validaciones: typecheck 0, lint OK, build OK,
  vitest 449/449 (51 archivos), audit:orphans 20.
- ~~God Component `EntryEditor` sin descomponer~~ → resuelto 2026-11-19: `src/utils/entryEditorModel.ts`
  concentra la lógica pura (duplicados, categorías, mapeo de IA, datos base, estado inicial,
  habilitación de botones) y `EntryEditor.tsx` bajó de 494 a 396 líneas. Tests nuevos:
  `entryEditorModel.test.ts` (25). Validaciones: typecheck 0, lint OK, build OK, vitest 474/474
  (52 archivos), audit:orphans 20.
- ~~Componente de tabla `LexiconTable` sin descomponer~~ → resuelto 2026-11-19: `src/utils/lexiconTableModel.ts`
  concentra la lógica pura (filtrado por categoría/vista/búsqueda con intersección FTS, paginación,
  color por categoría, formato de afijos, cambios del formulario en línea) y `LexiconTable.tsx` bajó
  de 693 a 603 líneas. Tests nuevos: `lexiconTableModel.test.ts` (20). Validaciones: typecheck 0,
  lint OK, build OK, vitest 494/494 (53 archivos), audit:orphans 20. Cierra el P1 de God Components.
- Fase J de v3.12 cerrada y commiteada (`ee2a505` + `ed45653`); pendiente solo `push` + CI.
- ~~Huérfanos triviales sin uso~~ → resuelto 2026-11-19 (`e26145c`): borrados 7 archivos sin
  importador ni uso (`icons/HelpIcon`, `icons/LineIcon`, `icons/Header`, `ProgressModal`,
  `data/commonWords`, `data/swadeshList`, `utils/drawingUtils`). `audit:orphans`: 20 → 13. Restantes:
  10 features/componentes completos nunca montados (decisión de producto), `strategyBridge`/
  `typologyProfile` (con tests propios), `jsonWorker` (CSP de Tauri) y `TabButton` (muerto tras la
  extracción).
- ~~Jingle lanzaba `RangeError` a tiempo negativo con el `AudioContext` suspendido~~ → resuelto
  2026-11-19 (`1f418e3`): `playVocalTone` calculaba el punto de sostenimiento como
  `startTime + duration - 0.55`; con `currentTime === 0` y duraciones cortas daba `-0.1` y Web Audio
  abortaba el motivo. `startTime` se normaliza a `>= 0` y el sostenimiento se acota. Test nuevo
  `audioService.test.ts` (4). Validaciones: typecheck 0, lint OK, build OK, vitest 498/498.
- **FASE L (limpieza del disco local) sigue PENDIENTE**: `.zcode/` y `.claude/` locales y
  `_ARTIFACTS_NO_GIT/` siguen en disco. No es automático: `.zcode/skills/loxar-continuity` es la
  skill de continuidad viva referenciada en `TASKS.md`; borrarla rompe el workflow. Requiere
  decisión explícita del usuario sobre qué conservar.
- Gauntlet v3.13 (providers) sin ejecutar; no existe `GAUNTLET_v3.13.md`, no se inventa spec.