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

## Estado pendiente conocido (NO se ejecuta aquí, solo se enumera)
- LICENSE MIT
- Contador de tests del README desactualizado
- Fase J de v3.12 sin commit
- Gauntlet v3.13 (providers) sin ejecutar